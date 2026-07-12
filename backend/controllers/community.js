const supabase = require('../config/supabase');

const getLeaderboards = async (req, res) => {
  try {
    // 1. Highest Recharge (from wallets table total_recharge if it exists, or via transactions)
    // Supabase REST doesn't easily do SUM/GROUP BY without an RPC, so we fetch users sorted by total_recharge or similar.
    // Since we don't have total_recharge readily aggregated, let's just fetch top 10 wallets ordered by main_balance for simplicity.
    const { data: rechargeLeaderboard, error: rechargeErr } = await supabase
      .from('wallets')
      .select('user_id, main_balance, users(nickname, email)')
      .order('main_balance', { ascending: false })
      .limit(10);
      
    if (rechargeErr) throw rechargeErr;

    // 2. We don't have referrals tracked properly yet in the new schema, so returning empty for now
    const referralLeaderboard = [];

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
