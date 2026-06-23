import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = process.env.API_BEARER_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'Server misconfiguration: API_BEARER_TOKEN not set' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const provided = Buffer.from(authHeader.slice('Bearer '.length));
  const tokenBuf = Buffer.from(token);
  if (provided.length !== tokenBuf.length || !timingSafeEqual(provided, tokenBuf)) {
    res.status(401).json({ error: 'Invalid bearer token' });
    return;
  }

  next();
}
