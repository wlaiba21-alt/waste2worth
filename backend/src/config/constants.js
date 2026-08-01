export const COMMISSION = {
  vendor: parseFloat(process.env.COMMISSION_VENDOR) || 0.6,
  user: parseFloat(process.env.COMMISSION_USER) || 0.25,
  admin: parseFloat(process.env.COMMISSION_ADMIN) || 0.15,
};
