const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class UserService {
  async createUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        role: userData.role || 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        name: true,
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
            { name: { contains: search, mode: 'insensitive' } },
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
          name: true,
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
        name: true,
        role: true,
        account_number: true,
      },
    });
  }
}

module.exports = UserService;