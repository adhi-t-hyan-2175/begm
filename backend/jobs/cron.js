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
          await supabase.rpc('increment_wallet_balance', { p_user_id: req.user_id, p_amount: req.amount });
          
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

  console.log('✅ Cron jobs scheduled.');
};

module.exports = startCronJobs;
