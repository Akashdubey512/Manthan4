const express = require('express');
const authController = require('../controllers/auth.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/change-password', requireAuth, authController.changePassword);

router.get('/me', requireAuth, authController.getMe);
router.get('/users', requireAuth, requireRole('admin'), authController.listUsers);
router.post('/logout', requireAuth, authController.logout);
router.patch('/users/:id/role', requireAuth, requireRole('admin'), authController.updateUserRole);

module.exports = router;