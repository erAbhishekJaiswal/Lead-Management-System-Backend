const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

exports.logActivity = async (req, res, next) => {
  const oldSend = res.send;
  res.send = async function(data) {
    if (req.user && res.statusCode < 400) {
      try {
        await ActivityLog.create({
          user: req.user._id,
          action: req.method,
          entity: req.baseUrl.split('/').pop(),
          entityId: req.params.id,
          details: req.body,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (error) {
        console.error('Activity log error:', error);
      }
    }
    oldSend.call(this, data);
  };
  next();
};