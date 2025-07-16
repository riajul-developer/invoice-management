const { z } = require('zod');

const createInvoiceSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  invoice_number: z.string().optional(), 
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  due_on: z.string().min(1, 'Due date is required'),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']).default('PENDING'),
});

const bulkInvoiceSchema = z.object({
  invoices: z.array(z.object({
    account_number: z.string().min(1, 'Account number is required'),
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().min(1, 'Currency is required'),
    due_on: z.string().min(1, 'Due date is required'),
    invoice_number: z.string().optional(), 
    description: z.string().optional(),
    status: z.enum(['PENDING', 'PAID', 'CANCELLED']).default('PENDING'),
  })),
});

const getInvoicesSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']).optional(),
  user_id: z.string().optional(),
});

module.exports = {
  createInvoiceSchema,
  bulkInvoiceSchema,
  getInvoicesSchema,
};