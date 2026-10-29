import 'dotenv/config';
import jwt from 'jsonwebtoken';

// Set JWT_SECRET in your environment for every deployment. The fallback is for local coursework only.
export const JWT_SECRET = process.env.JWT_SECRET || 'local-coursework-only-change-before-deployment';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null)
    || req.query?.token;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token.' });
    }
    req.user = user;
    return next();
  });
}
