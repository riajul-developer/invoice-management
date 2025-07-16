const AuthService = require('../services/auth.service');

const authService = new AuthService();

class AuthController {
  async register(req, res, next) {
    try {
      const user = await authService.register(req.body); 
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            account_number: user.account_number,
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      res.json({
        success: true,
        message: 'Login successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      
      const { refresh_token } = req.body;
      const result = await authService.refreshToken(refresh_token);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      
      const { refresh_token } = req.body;
      await authService.logout(refresh_token);
      
      res.json({
        success: true,
        message: 'Logout successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await authService.getUserById(userId);
      
      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            account_number: user.account_number,
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;