const supabase = require('../config/supabase');

// ─── Helper: derive VIP level from total_recharge ─────────────────────────────
function getVipLevel(totalRecharge = 0) {
  if (totalRecharge >= 100000) return 'Master';
  if (totalRecharge >= 50000)  return 'Diamond';
  if (totalRecharge >= 25000)  return 'Gold';
  if (totalRecharge >= 10000)  return 'Silver';
  return 'Bronze';
}

// ─── POST /api/auth/upsert-profile ───────────────────────────────────────────
// Called by the frontend immediately after a successful Google OAuth login.
// Creates the user profile + wallet in the `users` / `wallets` tables if
// they don't exist yet, then returns the full profile.
exports.upsertProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the Supabase OAuth JWT
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const email = authUser.email;
    const googleId = authUser.id;
    const nickname = authUser.user_metadata?.full_name ||
                     authUser.user_metadata?.name ||
                     email?.split('@')[0] ||
                     'Player';

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    let profile = existing;

    if (!profile) {
      // Create new profile
      const { data: newUser, error: insertErr } = await supabase
        .from('users')
        .insert({
          email,
          google_id: googleId,
          nickname,
          vip_level: 'Bronze',
          status: 'Active',
          role: 'user',
          total_recharge: 0,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      profile = newUser;

      // Create wallet for the new user
      await supabase.from('wallets').insert({
        user_id: profile.id,
        main_balance: 0,
        bonus_balance: 0,
      });
    }

    // Fetch wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    return res.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        nickname: profile.nickname,
        vip_level: profile.vip_level,
        status: profile.status,
        role: profile.role,
        total_recharge: profile.total_recharge,
        main_balance: wallet?.main_balance || 0,
        bonus_balance: wallet?.bonus_balance || 0,
      },
    });
  } catch (err) {
    console.error('[upsertProfile Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/auth/me — get current user from Supabase JWT ───────────────────
exports.me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);

    if (error || !authUser) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .maybeSingle();

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        vip_level: user.vip_level,
        status: user.status,
        role: user.role,
        total_recharge: user.total_recharge,
        main_balance: wallet?.main_balance || 0,
        bonus_balance: wallet?.bonus_balance || 0,
      },
    });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};
