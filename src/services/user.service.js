const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class UserService {
  async createUser(userData) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { account_number: userData.account_number }
        ]
      }
    });

    if (existingUser) {
      throw new Error('User with this email or account number already exists');
    }

    let hashedPassword = null;
    if (userData.password) {
      hashedPassword = await bcrypt.hash(userData.password, 12);
    }

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role || 'CUSTOMER',
        account_number: userData.account_number,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        account_number: true,
        created_at: true,
      },
    });

    return user;
  }

  async getAllUsers(page = 1, limit = 10, search) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { account_number: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          account_number: true,
          created_at: true,
          _count: {
            select: { invoices: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findUserByAccountNumber(account_number) {
    return await prisma.user.findUnique({
      where: { account_number },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        account_number: true,
        created_at: true,
      },
    });
  }

  async findUserByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        account_number: true,
        created_at: true,
      },
    });
  }

  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        account_number: true,
        created_at: true,
        _count: {
          select: { invoices: true },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateUser(id, userData) {
    await this.getUserById(id);
    if (userData.email || userData.account_number) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                userData.email ? { email: userData.email } : {},
                userData.account_number ? { account_number: userData.account_number } : {},
              ].filter(obj => Object.keys(obj).length > 0)
            }
          ]
        }
      });

      if (duplicateUser) {
        throw new Error('User with this email or account number already exists');
      }
    }

    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: userData,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        account_number: true,
        created_at: true,
      },
    });

    return user;
  }

  async deleteUser(id) {
    await this.getUserById(id);

    const invoiceCount = await prisma.invoice.count({
      where: { user_id: id }
    });

    if (invoiceCount > 0) {
      throw new Error('Cannot delete user with existing invoices');
    }

    await prisma.refreshToken.deleteMany({
      where: { user_id: id }
    });

    await prisma.user.delete({
      where: { id }
    });
  }

  async getUsersStats() {
    const [
      totalUsers,
      adminUsers,
      customerUsers,
      usersWithInvoices,
      usersWithoutPassword
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({
        where: {
          invoices: {
            some: {}
          }
        }
      }),
      prisma.user.count({ where: { password: null } })
    ]);

    return {
      total_users: totalUsers,
      admin_users: adminUsers,
      customer_users: customerUsers,
      users_with_invoices: usersWithInvoices,
      users_without_password: usersWithoutPassword,
    };
  }

  async getUserWithInvoices(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        account_number: true,
        created_at: true,
        invoices: {
          select: {
            id: true,
            invoice_number: true,
            amount: true,
            currency: true,
            due_on: true,
            status: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async getUsersByRole(role) {
    const users = await prisma.user.findMany({
      where: { role },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        account_number: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return users;
  }

  async setUserPassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async getUsersWithoutPassword() {
    const users = await prisma.user.findMany({
      where: { password: null },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        account_number: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return users;
  }

  async bulkUpdateUsers(updates) {
    const results = {
      updated: 0,
      errors: [],
    };

    for (const update of updates) {
      try {
        await this.updateUser(update.id, update.data);
        results.updated++;
      } catch (error) {
        results.errors.push(
          `Failed to update user ${update.id}: ${error.message}`
        );
      }
    }

    return results;
  }

  async searchUsers(searchTerm) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { first_name: { contains: searchTerm, mode: 'insensitive' } },
          { last_name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { account_number: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        account_number: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return users;
  }
}

module.exports = UserService;