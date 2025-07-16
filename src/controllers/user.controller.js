const UserService = require('../services/user.service');

const userService = new UserService();

class UserController {
  async createUser(req, res, next) {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json({
        message: 'User created successfully',
        user,
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
        message: 'Users retrieved successfully',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;