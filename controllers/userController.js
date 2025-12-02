const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { validationResult } = require('express-validator');

exports.createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Role validation
    const validRoles = ['sub_admin', 'support_agent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter, '-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields
    delete updates.password;
    delete updates.email;

    const user = await User.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const activities = await ActivityLog.find({ user: userId })
      .populate('user', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ActivityLog.countDocuments({ user: userId });

    res.json({
      activities,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};