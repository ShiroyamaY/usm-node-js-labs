import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import db from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';

const { User } = db;

export const register = asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;

  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ username }, { email }]
    }
  });

  if (existingUser) {
    throw new ConflictError('User with the same email or username already exists');
  }

  const user = await User.create({
    username,
    email,
    password,
    role: role || 'user'
  });

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] }
  });

  res.json({ user });
});
