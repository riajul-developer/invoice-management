const express = require('express');
const UserController = require('../controllers/user.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { validateBody, validateQuery } = require('../middleware/validation.middleware');
const { createUserSchema, getUsersSchema } = require('../schemas/user.schemas');

const router = express.Router();
const userController = new UserController();

router.use(authenticateToken);

router.post('/', requireAdmin, validateBody(createUserSchema), userController.createUser.bind(userController));
router.get('/', requireAdmin, validateQuery(getUsersSchema), userController.getAllUsers.bind(userController));

module.exports = router;