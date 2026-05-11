declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      email: string;
      role: 'user' | 'partner' | 'admin';
    };
  }
}
