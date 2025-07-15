const AuthService = require('../services/auth.service');

const authService = new AuthService();

class AuthController {
  async register(req, res, next) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({
        message: 'User registered successfully',
        user,
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
        message: 'Login successful',
        ...result,
      });
    } catch (error) {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refresh_token } = req.body;
      const result = await authService.refreshToken(refresh_token);
      
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  async logout(req, res, next) {
    try {
      const { refresh_token } = req.body;
      await authService.logout(refresh_token);
      
      res.json({ message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;