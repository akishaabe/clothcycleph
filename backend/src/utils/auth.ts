import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config, getConfig, type AppConfig, type EnvRecord } from '../config/env.js';

type ConfigSource = AppConfig | EnvRecord;

const resolveConfig = (source?: ConfigSource): AppConfig => {
  if (!source) {
    return config;
  }

  return 'jwt' in source ? source as AppConfig : getConfig(source as EnvRecord);
};

export const generateToken = (payload: any, source?: ConfigSource): string => {
  const resolvedConfig = resolveConfig(source);

  if (!resolvedConfig.jwt.secret) {
    throw new Error('JWT_SECRET is required');
  }

  const options: jwt.SignOptions = {
    expiresIn: resolvedConfig.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  };

  return jwt.sign(payload, resolvedConfig.jwt.secret as jwt.Secret, options);
};

export const verifyToken = (token: string, source?: ConfigSource): any => {
  try {
    const resolvedConfig = resolveConfig(source);
    if (!resolvedConfig.jwt.secret) {
      throw new Error('JWT_SECRET is required');
    }
    return jwt.verify(token, resolvedConfig.jwt.secret!);
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

export const generateNumericCode = (length = 6): string => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return crypto.randomInt(min, max + 1).toString();
};

export const generateSecureToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export {
  buildOtpAuthUrl,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  verifyTotpCode,
} from './totp.js';
