import { COMMISSION } from '../config/constants.js';

export function splitCommission(amount) {
  const vendor = Math.round(amount * COMMISSION.vendor * 100) / 100;
  const user = Math.round(amount * COMMISSION.user * 100) / 100;
  const admin = Math.round((amount - vendor - user) * 100) / 100;
  return { vendor, user, admin, total: amount };
}
