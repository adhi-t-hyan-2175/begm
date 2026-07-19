const cron = require('node-cron');
const supabase = require('../config/supabase');

const startCronJobs = () => {
  console.log('⏳ Initializing background cron jobs...');

  // 1. Clean old notifications (Every day at 2:00 AM)
  cron.schedule('0 2 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;
      console.log('🧹 [Cron] Cleaned up notifications older than 30 days.');
    } catch (err) {
      console.error('[Cron Error] Failed to clean notifications:', err.message);
    }
  });

  // 2. Reject pending withdrawals older than 7 days (Every day at 3:00 AM)
  cron.schedule('0 3 * * *', async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: expiredWithdrawals, error: fetchErr } = await supabase
        .from('withdrawal_requests')
        .select('id, user_id, amount')
        .eq('status', 'pending')
        .lt('created_at', sevenDaysAgo.toISOString());

      if (fetchErr) throw fetchErr;

      if (expiredWithdrawals && expiredWithdrawals.length > 0) {
        for (const req of expiredWithdrawals) {
          // Refund wallet
          const { data: w } = await supabase.from('wallets').select('main_balance').eq('user_id', req.user_id).single();
          if (w) {
            const prevBal = parseFloat(w.main_balance || 0);
            const newBal = prevBal + req.amount;
            await supabase.from('wallets').update({ main_balance: newBal, updated_at: new Date().toISOString() }).eq('user_id', req.user_id);
            await supabase.from('transactions').insert({
              user_id: req.user_id,
              amount: req.amount,
              type: 'Withdrawal Refund',
              status: 'Success',
              notes: 'System auto-rejected expired withdrawal',
              created_at: new Date().toISOString()
            });
          }
          // Mark as rejected
          await supabase
            .from('withdrawal_requests')
            .update({ status: 'rejected' })
            .eq('id', req.id);
        }
        console.log(`🧹 [Cron] Auto-rejected and refunded ${expiredWithdrawals.length} expired withdrawal requests.`);
      }
    } catch (err) {
      console.error('[Cron Error] Failed to process expired withdrawals:', err.message);
    }
  });

  // 3. Daily Database Backup (Every day at 4:00 AM)
  cron.schedule('0 4 * * *', async () => {
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) return console.warn('⚠️ [Cron] DATABASE_URL not set, skipping backup.');

      const { exec } = require('child_process');
      const fs = require('fs');
      const path = require('path');
      
      const BACKUP_DIR = path.join(__dirname, '../../backups');
      if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

      const filename = `backup-${Date.now()}.sql`;
      const filepath = path.join(BACKUP_DIR, filename);

      exec(`pg_dump "${dbUrl}" -F c -f "${filepath}"`, (error) => {
        if (error) return console.error('[Cron Backup Error]', error);
        console.log(`✅ [Cron] Database backup created: ${filename}`);

        // Keep only last 30 backups
        const files = fs.readdirSync(BACKUP_DIR)
          .filter(f => f.endsWith('.sql'))
          .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
          .sort((a, b) => b.time - a.time);

        if (files.length > 30) {
          files.slice(30).forEach(file => fs.unlinkSync(path.join(BACKUP_DIR, file.name)));
          console.log(`🧹 [Cron] Deleted ${files.length - 30} old backups.`);
        }
      });
    } catch (err) {
      console.error('[Cron Error] Backup failed:', err.message);
    }
  });

  // 4. Daily Rank Aggregation (Every day at 9:00 PM IST = 15:30 UTC)
  cron.schedule('30 15 * * *', async () => {
    try {
      console.log('🏆 [Cron] Starting daily rank aggregation...');
      
      const today = new Date();
      today.setUTCHours(0,0,0,0); // start of UTC day, close enough for rank queries

      // 1. Top Winner
      const { data: topWinners } = await supabase
        .from('bets')
        .select('user_id, payout')
        .gte('created_at', today.toISOString())
        .order('payout', { ascending: false })
        .limit(1);

      // 2. Top Bettor
      const { data: topBettors } = await supabase
        .from('bets')
        .select('user_id, amount')
        .gte('created_at', today.toISOString())
        .order('amount', { ascending: false })
        .limit(1);

      // 3. Top Recharge
      const { data: topRechargers } = await supabase
        .from('recharge_requests')
        .select('user_id, amount')
        .eq('status', 'approved')
        .gte('created_at', today.toISOString())
        .order('amount', { ascending: false })
        .limit(1);

      // 4. Top Profit (payout - amount)
      // Since we don't have a direct top profit endpoint easily in postgrest without RPC,
      // we'll approximate or use highest payout as a proxy, or calculate if we have profit column.
      // We added `profit` column in our migration.
      const { data: topProfit } = await supabase
        .from('bets')
        .select('user_id, profit')
        .gte('created_at', today.toISOString())
        .order('profit', { ascending: false })
        .limit(1);

      // 5. Top 20 Players (by profit today)
      const { data: top20 } = await supabase
        .from('bets')
        .select('user_id, profit')
        .gte('created_at', today.toISOString())
        .order('profit', { ascending: false })
        .limit(20);

      // Fetch user details for Top 20 to store neatly
      let top20WithNames = [];
      if (top20 && top20.length > 0) {
        const userIds = top20.map(t => t.user_id);
        const { data: usersInfo } = await supabase
          .from('users')
          .select('id, player_id, nickname')
          .in('id', userIds);
        
        top20WithNames = top20.map(t => {
          const u = usersInfo?.find(x => x.id === t.user_id);
          return {
            player_id: u?.player_id || 'Unknown',
            nickname: u?.nickname || 'Player',
            profit: t.profit || 0
          };
        });
      }

      await supabase.from('daily_rankings').upsert({
        rank_date: today.toISOString().split('T')[0],
        highest_winner_id: topWinners?.[0]?.user_id || null,
        highest_winner_amount: topWinners?.[0]?.payout || 0,
        highest_bettor_id: topBettors?.[0]?.user_id || null,
        highest_bettor_amount: topBettors?.[0]?.amount || 0,
        highest_recharge_id: topRechargers?.[0]?.user_id || null,
        highest_recharge_amount: topRechargers?.[0]?.amount || 0,
        top_profit_id: topProfit?.[0]?.user_id || null,
        top_profit_amount: topProfit?.[0]?.profit || 0,
        top_20_players: top20WithNames
      }, { onConflict: 'rank_date' });

      console.log('✅ [Cron] Daily rank aggregation completed.');
    } catch (err) {
      console.error('[Cron Error] Rank aggregation failed:', err.message);
    }
  });

  console.log('✅ Cron jobs scheduled.');
};

module.exports = startCronJobs;
