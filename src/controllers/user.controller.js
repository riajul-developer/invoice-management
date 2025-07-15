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
      const result = await userService.getAllUsers(page, limit, search);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;