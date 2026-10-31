const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, resetUserPassword } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect); // All user routes require auth

router.get('/', adminOnly, getUsers);
router.post('/', adminOnly, createUser);
router.put('/:id', adminOnly, updateUser);
router.put('/:id/reset-password', adminOnly, resetUserPassword);

module.exports = router;
