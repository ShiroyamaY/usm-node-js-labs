import jwt from 'jsonwebtoken';
import db from '../models/index.js';

const { User } = db;

export const buildContext = async (req) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return { user: null };
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    return { user: user || null };
  } catch {
    return { user: null };
  }
};

