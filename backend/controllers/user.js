const supabase = require('../config/supabase');

// ─── GET /api/user/:id ────────────────────────────────────────────────────────
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, nickname, vip_level, status, role, total_recharge, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    console.error('[getUser]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── PUT /api/user/:id ─ update nickname ─────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nickname } = req.body;

    // Users can only update their own profile
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const updates = {};
    if (nickname) updates.nickname = nickname;

    const { data: updated, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, email, nickname, vip_level, status')
      .single();

    if (error) throw error;
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('[updateUser]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getUser, updateUser };
