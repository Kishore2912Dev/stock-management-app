const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Create a new user
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, username and password are required.',
      });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists.',
      });
    }

    const user = await User.create({
      name,
      username: username.toLowerCase(),
      password,
      role: role || 'user',
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Update user (name, role, status)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const { name, role, status } = req.body;

    // Prevent admin from deactivating themselves
    if (req.params.id === req.user._id.toString() && status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, role, status },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Reset user password (admin only)
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getUsers, createUser, updateUser, resetUserPassword };
