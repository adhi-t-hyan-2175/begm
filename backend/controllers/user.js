const User = require('../models/User');

const createUser = async (req, res) => {
  const { username, phone } = req.body;
  const user = await User.create({ username, phone });
  res.json({ message: 'User created', user });
};

const getUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findByPk(id);
  res.json(user);
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, phone } = req.body;
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.username = username;
  user.phone = phone;
  await user.save();
  res.json({ message: 'User updated', user });
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await user.destroy();
  res.json({ message: 'User deleted' });
};

module.exports = { createUser, getUser, updateUser, deleteUser };
