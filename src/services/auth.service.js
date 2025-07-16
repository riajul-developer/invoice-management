const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AuthService {
  async register(userData) {
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

  async login(email, password) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.password) {
      throw new Error('Please contact administrator to set up your password');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      account_number: user.account_number,
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        account_number: user.account_number,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.expires_at < new Date()) {
        throw new Error('Invalid refresh token');
      }

      const tokenPayload = {
        id: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
        account_number: storedToken.user.account_number,
      };

      const newAccessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      });

      return { access_token: newAccessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async findUserByAccountNumber(accountNumber) {
    const user = await prisma.user.findUnique({
      where: { account_number: accountNumber },
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

  async findUserByEmail(email) {
    const user = await prisma.user.findUnique({
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

    return user;
  }

  async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async createUserForBulkInvoice(userData) {
    const existingUser = await this.findUserByAccountNumber(userData.account_number);
    
    if (existingUser) {
      return existingUser;
    }

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: 'CUSTOMER',
        account_number: userData.account_number,
        password: null, 
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

  async cleanupExpiredTokens() {
    await prisma.refreshToken.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });
  }
}

module.exports = AuthService;