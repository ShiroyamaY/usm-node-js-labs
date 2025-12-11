import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

const { User } = db;

export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authorization token is required');
  }

  const token = authHeader.substring(7);
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new UnauthorizedError('Invalid token');
  }

  const user = await User.findByPk(decoded.id);

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  req.user = user;
  next();
});

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new ForbiddenError('Only administrators can perform this action'));
  }
  return next();
};
