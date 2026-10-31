const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes — require valid JWT
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: 'Not authorised. Please login.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user || req.user.status !== 'active') {
      return res
        .status(401)
        .json({ success: false, message: 'User account is inactive or does not exist.' });
    }

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: 'Invalid or expired token. Please login again.' });
  }
};

// Admin-only routes
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res
      .status(403)
      .json({ success: false, message: 'Access denied. Admin only.' });
  }
};

module.exports = { protect, adminOnly };
