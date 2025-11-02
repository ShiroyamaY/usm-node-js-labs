import jwt from 'jsonwebtoken';
import db from '../models/index.js';

const { User } = db;

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only' });
  }
  next();
};

export const isOwnerOrAdmin = (resource) => {
  return (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }

    if (resource.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};