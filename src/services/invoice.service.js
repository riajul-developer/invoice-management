const { PrismaClient } = require('@prisma/client');
const UserService = require('./user.service');

const prisma = new PrismaClient();
const userService = new UserService();

class InvoiceService {
  async createInvoice(invoiceData) {
    const invoice = await prisma.invoice.create({
      data: {
        ...invoiceData,
        status: invoiceData.status || 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            account_number: true,
          },
        },
      },
    });

    return invoice;
  }

  async bulkCreateInvoices(invoices) {
    const results = {
      created: 0,
      errors: [],
      users_created: 0,
    };

    for (const invoiceData of invoices) {
      try {
        // Check if user exists
        let user = await userService.findUserByAccountNumber(invoiceData.account_number);
        
        // Create user if doesn't exist
        if (!user) {
          if (!invoiceData.user_name || !invoiceData.user_email) {
            results.errors.push(
              `User with account number ${invoiceData.account_number} not found and insufficient data to create user`
            );
            continue;
          }

          user = await userService.createUser({
            email: invoiceData.user_email,
            password: 'temp123456', // Temporary password
            name: invoiceData.user_name,
            account_number: invoiceData.account_number,
            role: 'CUSTOMER',
          });
          results.users_created++;
        }

        // Create invoice
        await this.createInvoice({
          user_id: user.id,
          invoice_number: invoiceData.invoice_number,
          amount: invoiceData.amount,
          description: invoiceData.description,
          status: invoiceData.status,
        });

        results.created++;
      } catch (error) {
        results.errors.push(
          `Failed to create invoice ${invoiceData.invoice_number}: ${error.message}`
        );
      }
    }

    return results;
  }

  async getAllInvoices(page = 1, limit = 10, status, user_id) {
    const skip = (page - 1) * limit;
    
    const where = {};
    if (status) where.status = status;
    if (user_id) where.user_id = user_id;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              account_number: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserInvoices(user_id, page = 1, limit = 10) {
    return this.getAllInvoices(page, limit, undefined, user_id);
  }
}

module.exports = InvoiceService;