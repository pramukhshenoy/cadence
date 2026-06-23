import { Request, Response, NextFunction } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    timezone: string;
  }
}

const FALLBACK_TIMEZONE = 'UTC';

function isValidIANATimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function timezoneMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const tz = req.headers['x-timezone'];
  if (typeof tz === 'string' && tz.length > 0 && isValidIANATimezone(tz)) {
    req.timezone = tz;
  } else {
    req.timezone = FALLBACK_TIMEZONE;
  }
  next();
}
