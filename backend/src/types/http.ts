import type { AppConfig } from '../config/env.js';

export type UserRole = 'user' | 'partner' | 'admin';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type UploadedFile = {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type HttpRequest = {
  body: any;
  params: Record<string, any>;
  query: Record<string, any>;
  headers: Record<string, any>;
  ip?: string;
  method?: string;
  protocol?: string;
  user?: AuthUser;
  file?: UploadedFile;
  config?: AppConfig;
  get?: (name: string) => string | undefined;
};

export type HttpResponse = {
  status: (code: number) => HttpResponse;
  setHeader: (name: string, value: string) => HttpResponse;
  json: (body: unknown) => unknown;
  send: (body: string | Buffer | Uint8Array | object) => unknown;
};
