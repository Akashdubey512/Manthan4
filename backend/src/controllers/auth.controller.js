const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabaseClient');

function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

// POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const allowedRoles = ['field_staff', 'reviewer', 'admin'];
  const assignedRole = allowedRoles.includes(role) ? role : 'field_staff';
  const passwordHash = await bcrypt.hash(password, 10);

  const { data: user, error } = await supabase
    .from('users')
    .insert({ name, email, password_hash: passwordHash, role: assignedRole })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const token = signToken(user);
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
};

// POST /api/auth/change-password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.userId)
    .maybeSingle();

  if (!user || !user.password_hash) {
    return res.status(400).json({ error: 'This account has no password set' });
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase
    .from('users')
    .update({ password_hash: newHash })
    .eq('id', user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Password updated' });
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('id', req.user.userId)
    .maybeSingle();

  if (error || !user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  res.json({ message: 'Logged out' });
};

// PATCH /api/auth/users/:id/role  (admin only)
exports.updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['field_staff', 'reviewer', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const { data: before } = await supabase
    .from('users')
    .select('role')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!before) return res.status(404).json({ error: 'User not found' });

  const { data: updated, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('audit_log').insert({
    entity_type: 'users',
    entity_id: req.params.id,
    action: 'update_role',
    user_id: req.user.userId,
    before_state: { role: before.role },
    after_state: { role: updated.role },
  });

  res.json(updated);
};

// GET /api/auth/users  (admin only)
exports.listUsers = async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, created_at');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};