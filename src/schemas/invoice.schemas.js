const { z } = require('zod');

const createInvoiceSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  invoice_number: z.string().min(1, 'Invoice number is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']).optional(),
});

const bulkInvoiceSchema = z.object({
  invoices: z.array(z.object({
    account_number: z.string().min(1, 'Account number is required'),
    invoice_number: z.string().min(1, 'Invoice number is required'),
    amount: z.number().positive('Amount must be positive'),
    description: z.string().optional(),
    status: z.enum(['PENDING', 'PAID', 'CANCELLED']).optional(),
    user_name: z.string().optional(),
    user_email: z.string().email().optional(),
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