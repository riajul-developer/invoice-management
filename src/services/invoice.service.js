const { PrismaClient } = require('@prisma/client');
const AuthService = require('./auth.service');

const prisma = new PrismaClient();
const authService = new AuthService();

class InvoiceService {
  generateInvoiceNumber() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `INV-${timestamp}-${random}`.toUpperCase();
  }

  async createInvoice(invoiceData) {
    if (!invoiceData.invoice_number) {
      invoiceData.invoice_number = this.generateInvoiceNumber();
    }

    const user = await prisma.user.findUnique({
      where: { id: invoiceData.user_id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: { invoice_number: invoiceData.invoice_number },
    });

    if (existingInvoice) {
      throw new Error('Invoice number already exists');
    }

    const invoice = await prisma.invoice.create({
      data: {
        user_id: invoiceData.user_id,
        invoice_number: invoiceData.invoice_number,
        amount: invoiceData.amount,
        currency: invoiceData.currency,
        due_on: new Date(invoiceData.due_on),
        description: invoiceData.description || '',
        status: invoiceData.status || 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
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
      users_created: 0,
      skipped: 0,
      new_users: [],
      errors: [],
    };

    for (const invoiceData of invoices) {
      try {
        let user = await authService.findUserByAccountNumber(invoiceData.account_number);

        if (!user) {
          if (!invoiceData.first_name || !invoiceData.last_name || !invoiceData.email) {
            results.errors.push(
              `User with account number ${invoiceData.account_number} not found and insufficient data to create user`
            );
            results.skipped++;
            continue;
          }

          user = await authService.createUserForBulkInvoice({
            email: invoiceData.email,
            first_name: invoiceData.first_name,
            last_name: invoiceData.last_name,
            account_number: invoiceData.account_number,
          });

          results.users_created++;
          
          results.new_users.push({
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            account_number: user.account_number,
          });

        }

        const invoiceNumber = invoiceData.invoice_number || this.generateInvoiceNumber();
        const existingInvoice = await prisma.invoice.findUnique({
          where: { invoice_number: invoiceNumber },
        });

        if (existingInvoice) {
          results.errors.push(
            `Invoice number ${invoiceNumber} already exists`
          );
          results.skipped++;
          continue;
        }

        await this.createInvoice({
          user_id: user.id,
          invoice_number: invoiceNumber,
          amount: invoiceData.amount,
          currency: invoiceData.currency,
          due_on: invoiceData.due_on,
          description: invoiceData.description || '',
          status: invoiceData.status || 'PENDING',
        });

        results.created++;
      } catch (error) {
        results.errors.push(
          `Failed to create invoice for account ${invoiceData.account_number}: ${error.message}`
        );
        results.skipped++;
      }
    }

    return results;
  }

  static ALLOWED_STATUSES = ['PENDING', 'PAID', 'CANCELLED'];

  async getAllInvoices(page = 1, limit = 10, search = '', status, user_id) {
    const baseUrl = process.env.BASE_URL;
    
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;
    
    const where = {};
    
    if (user_id) {
      where.user_id = user_id;
    }
    
    if (status && InvoiceService.ALLOWED_STATUSES.includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }
    
    if (search) {
      const searchTerms = search.trim().split(/\s+/);
      
      const searchConditions = [
        {
          invoice_number: {
            contains: search
          }
        },
        {
          description: {
            contains: search
          }
        },
        ...(isNaN(search) ? [] : [{
          amount: {
            equals: parseFloat(search)
          }
        }]),
        {
          user: {
            first_name: {
              contains: search
            }
          }
        },
        {
          user: {
            last_name: {
              contains: search
            }
          }
        },
        {
          user: {
            email: {
              contains: search
            }
          }
        },
        {
          user: {
            account_number: {
              contains: search
            }
          }
        }
      ];

      if (searchTerms.length === 2) {
        searchConditions.push(
          {
            user: {
              AND: [
                {
                  first_name: {
                    contains: searchTerms[0]
                  }
                },
                {
                  last_name: {
                    contains: searchTerms[1]
                  }
                }
              ]
            }
          },
          {
            user: {
              AND: [
                {
                  first_name: {
                    contains: searchTerms[1]
                  }
                },
                {
                  last_name: {
                    contains: searchTerms[0]
                  }
                }
              ]
            }
          }
        );
      }

      where.OR = searchConditions;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              account_number: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    const params = {
      page: String(pageNum),
      limit: String(limitNum),
      ...(search ? { search } : {}),
      ...(status && InvoiceService.ALLOWED_STATUSES.includes(status.toUpperCase()) ? { status: status.toUpperCase() } : {}),
      ...(user_id ? { user_id } : {})
    };

    const queryParams = new URLSearchParams(params);

    const links = {
      self: `${baseUrl}/api/invoices?${queryParams.toString()}`,
      next: hasNextPage 
        ? `${baseUrl}/api/invoices?${new URLSearchParams({ ...params, page: String(pageNum + 1) }).toString()}` 
        : null,
      prev: hasPrevPage 
        ? `${baseUrl}/api/invoices?${new URLSearchParams({ ...params, page: String(pageNum - 1) }).toString()}` 
        : null
    };

    return {
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage,
        hasPrevPage,
        links
      },
      invoices
    };
  }

  async getUserInvoices(user_id, page = 1, limit = 10, search = '', status) {
    return this.getAllInvoices(page, limit, search, status, user_id);
  }

  async getInvoiceById(id, user = null) {
    const where = { id };
    
    if (user && user.role !== 'ADMIN') {
      where.user_id = user.id;
    }

    const invoice = await prisma.invoice.findUnique({
      where,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            account_number: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return invoice;
  }

  async updateInvoice(id, updates, user = null) {
    const existingInvoice = await this.getInvoiceById(id, user);

    if (user && user.role !== 'ADMIN') {
      throw new Error('Only admin can update invoices');
    }

    if (updates.status && !['PENDING', 'PAID', 'CANCELLED'].includes(updates.status)) {
      throw new Error('Invalid invoice status');
    }

    if (updates.invoice_number && updates.invoice_number !== existingInvoice.invoice_number) {
      const duplicateInvoice = await prisma.invoice.findUnique({
        where: { invoice_number: updates.invoice_number },
      });

      if (duplicateInvoice) {
        throw new Error('Invoice number already exists');
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...updates,
        due_on: updates.due_on ? new Date(updates.due_on) : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            account_number: true,
          },
        },
      },
    });

    return invoice;
  }

  async deleteInvoice(id, user = null) {
    await this.getInvoiceById(id, user);

    if (user && user.role !== 'ADMIN') {
      throw new Error('Only admin can delete invoices');
    }

    await prisma.invoice.delete({
      where: { id },
    });
  }

  async getInvoiceStats(user = null) {
    const where = {};
  
    if (user && user.role !== 'ADMIN') {
      where.user_id = user.id;
    }

    const [
      totalInvoices,
      pendingInvoices,
      paidInvoices,
      cancelledInvoices,
      totalAmount,
      recentInvoices
    ] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.count({ where: { ...where, status: 'PENDING' } }),
      prisma.invoice.count({ where: { ...where, status: 'PAID' } }),
      prisma.invoice.count({ where: { ...where, status: 'CANCELLED' } }),
      prisma.invoice.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.invoice.findMany({
        where,
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              account_number: true,
            },
          },
        },
      }),
    ]);

    return {
      total_invoices: totalInvoices,
      pending_invoices: pendingInvoices,
      paid_invoices: paidInvoices,
      cancelled_invoices: cancelledInvoices,
      total_amount: totalAmount._sum.amount || 0,
      recent_invoices: recentInvoices,
    };
  }

  async getInvoicesByStatus(status, user = null) {
    const where = { status };
    
    if (user && user.role !== 'ADMIN') {
      where.user_id = user.id;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            account_number: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return invoices;
  }

  async getOverdueInvoices(user = null) {
    const where = {
      status: 'PENDING',
      due_on: {
        lt: new Date(),
      },
    };
    
    if (user && user.role !== 'ADMIN') {
      where.user_id = user.id;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            account_number: true,
          },
        },
      },
      orderBy: { due_on: 'asc' },
    });

    return invoices;
  }
}

module.exports = InvoiceService;