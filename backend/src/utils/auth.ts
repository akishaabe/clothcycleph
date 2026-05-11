import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

export const generateToken = (payload: any): string => {
  return jwt.sign(payload, config.jwt.secret!, {
    expiresIn: config.jwt.expiresIn,
  });
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, config.jwt.secret!);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};
