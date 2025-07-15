const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { validateBody } = require('../middleware/validation.middleware');
const { registerSchema, loginSchema, refreshTokenSchema } = require('../schemas/auth.schemas');

const router = express.Router();
const authController = new AuthController();

router.post('/register', validateBody(registerSchema), authController.register.bind(authController));
router.post('/login', validateBody(loginSchema), authController.login.bind(authController));
router.post('/refresh', validateBody(refreshTokenSchema), authController.refreshToken.bind(authController));
router.post('/logout', validateBody(refreshTokenSchema), authController.logout.bind(authController));

module.exports = router;