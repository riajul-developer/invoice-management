const { z } = require('zod');

const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'CUSTOMER']).optional(),
  account_number: z.string().min(1, 'Account number is required'),
});

const getUsersSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
});

module.exports = {
  createUserSchema,
  getUsersSchema,
};