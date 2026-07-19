const supabase = require('../config/supabase');

const getLeaderboards = async (req, res) => {
  try {
    // 1. Highest Recharge
    const { data: rechargeLeaderboard, error: rechargeErr } = await supabase
      .from('wallets')
      .select('user_id, main_balance, users(nickname, email)')
      .order('main_balance', { ascending: false })
      .limit(10);
      
    if (rechargeErr) throw rechargeErr;

    // 2. Top Referrers
    const { data: usersData, error: usersErr } = await supabase
      .from('users')
      .select('referred_by');

    if (usersErr) throw usersErr;

    // Count referrals
    const referralCounts = {};
    if (usersData) {
      for (const u of usersData) {
        if (u.referred_by) {
          referralCounts[u.referred_by] = (referralCounts[u.referred_by] || 0) + 1;
        }
      }
    }

    // Convert to array and get top 10
    const topReferrerIds = Object.entries(referralCounts)
      .map(([playerId, count]) => ({ playerId: parseInt(playerId, 10), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const referralLeaderboard = [];
    for (const ref of topReferrerIds) {
      const { data: user } = await supabase
        .from('users')
        .select('nickname, email')
        .eq('player_id', ref.playerId)
        .maybeSingle();
      if (user) {
        referralLeaderboard.push({ ...user, total_referrals: ref.count });
      }
    }

    res.json({
      recharge: rechargeLeaderboard || [],
      referral: referralLeaderboard
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getTasks = async (req, res) => {
  res.json([]); // Tasks not migrated to Supabase yet
};

const claimTask = async (req, res) => {
  res.status(400).json({ error: 'Tasks not migrated yet' });
};

module.exports = {
  getLeaderboards,
  getTasks,
  claimTask
};
