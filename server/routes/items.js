const express = require('express');
const router = express.Router();
const { getItems, getItem, createItem, updateItem } = require('../controllers/itemController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect); // All item routes require auth

router.get('/', getItems);
router.get('/:id', getItem);
router.post('/', adminOnly, createItem);
router.put('/:id', adminOnly, updateItem);

module.exports = router;
