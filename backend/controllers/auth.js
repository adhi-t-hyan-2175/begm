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

    // Auto-assign admin role if email matches ADMIN_EMAIL env var
    const adminEmail = process.env.ADMIN_EMAIL;
    const computedRole = (adminEmail && email === adminEmail) ? 'admin' : 'user';

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    let profile;

    if (!existing) {
      // Create new profile
      const { data: newUser, error: insertErr } = await supabase
        .from('users')
        .insert({
          email,
          google_id: googleId,
          nickname,
          vip_level: 'Bronze',
          status: 'Active',
          role: computedRole,
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
    } else {
      // Update existing profile (sync nickname, email, google_id, and check role)
      const updates = {
        nickname,
        google_id: googleId,
        email,
      };
      
      // Upgrade to admin if necessary, but don't demote existing admins
      if (computedRole === 'admin' && existing.role !== 'admin') {
        updates.role = 'admin';
      }

      const { data: updatedUser, error: updateErr } = await supabase
        .from('users')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      profile = updatedUser;

      // Ensure wallet exists just in case
      const { data: walletExists } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();
        
      if (!walletExists) {
        await supabase.from('wallets').insert({
          user_id: profile.id,
          main_balance: 0,
          bonus_balance: 0,
        });
      }
    }

    // Fetch final wallet state
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    return res.json({
      success: true,
      user: {
        id: profile.id,
        player_id: profile.player_id,
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
        player_id: user.player_id,
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
