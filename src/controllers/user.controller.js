const { success } = require('zod/v4');
const UserService = require('../services/user.service');

const userService = new UserService();

class UserController {
  async createUser(req, res, next) {
    try {
      const data = await userService.createUser(req.body);
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      const { page, limit, search } = req.query;
      const data = await userService.getAllUsers(page, limit, search);
      
      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;