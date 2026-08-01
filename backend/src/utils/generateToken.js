import jwt from 'jsonwebtoken';

export function generateToken(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
}
