const express = require('express');
const router = express.Router();
const {
  getTransactions,
  addPurchase,
  addDispatch,
  addSale,
  addOpeningStock,
  reverseTransaction,
  getStockReport,
  getDashboard,
} = require('../controllers/transactionController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect); // All transaction routes require auth

// Dashboard summary
router.get('/dashboard', getDashboard);

// Stock report
router.get('/stock-report', getStockReport);

// Transaction list
router.get('/', getTransactions);

// Stock entry routes
router.post('/purchase', addPurchase);
router.post('/dispatch', addDispatch);
router.post('/sale', addSale);
router.post('/opening-stock', adminOnly, addOpeningStock);

// Correction/reversal (admin only)
router.post('/:id/reverse', adminOnly, reverseTransaction);

module.exports = router;
