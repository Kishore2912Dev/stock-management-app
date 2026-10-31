const StockTransaction = require('../models/StockTransaction');
const Item = require('../models/Item');

/**
 * Helper: Calculate stock levels for a given item
 * Source of truth: StockTransactions only
 */
const calculateItemStock = async (itemId) => {
  const transactions = await StockTransaction.find({
    itemId,
    isReversed: false,
  });

  let godown = 0;
  let home = 0;
  let sold = 0;

  transactions.forEach((tx) => {
    switch (tx.transactionType) {
      case 'opening_stock':
        godown += tx.quantity;
        break;
      case 'purchase':
        godown += tx.quantity;
        break;
      case 'dispatch':
        godown -= tx.quantity;
        home += tx.quantity;
        break;
      case 'sale':
        home -= tx.quantity;
        sold += tx.quantity;
        break;
      case 'correction':
        // Correction is linked to original tx — handled by reversal flag
        break;
      default:
        break;
    }
  });

  return {
    godown: Math.max(0, godown),
    home: Math.max(0, home),
    sold,
    total: Math.max(0, godown) + Math.max(0, home),
  };
};

// @desc    Get all transactions (with filters)
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const { itemId, transactionType, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = { isReversed: false };

    if (itemId) query.itemId = itemId;
    if (transactionType) query.transactionType = transactionType;
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.transactionDate.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await StockTransaction.countDocuments(query);
    const transactions = await StockTransaction.find(query)
      .populate('itemId', 'itemName itemCode')
      .populate('createdBy', 'name username')
      .populate('reversedTransactionId')
      .sort({ transactionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: transactions,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Add purchase (stock into godown)
// @route   POST /api/transactions/purchase
// @access  Private
const addPurchase = async (req, res) => {
  try {
    const { itemId, quantity, transactionDate, remarks } = req.body;

    if (!itemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Item and quantity are required.',
      });
    }
    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than zero.',
      });
    }

    const item = await Item.findById(itemId);
    if (!item || item.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Item not found or inactive.' });
    }

    const transaction = await StockTransaction.create({
      itemId,
      transactionType: 'purchase',
      quantity,
      transactionDate: transactionDate || new Date(),
      remarks,
      createdBy: req.user._id,
    });

    const stock = await calculateItemStock(itemId);

    res.status(201).json({
      success: true,
      message: `Purchase of ${quantity} bales recorded.`,
      data: transaction,
      updatedStock: stock,
    });
  } catch (error) {
    console.error('Add purchase error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Add dispatch (godown -> home)
// @route   POST /api/transactions/dispatch
// @access  Private
const addDispatch = async (req, res) => {
  try {
    const { itemId, quantity, transactionDate, remarks } = req.body;

    if (!itemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Item and quantity are required.',
      });
    }
    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than zero.',
      });
    }

    const item = await Item.findById(itemId);
    if (!item || item.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Item not found or inactive.' });
    }

    // Validate godown stock is sufficient
    const stock = await calculateItemStock(itemId);
    if (quantity > stock.godown) {
      return res.status(400).json({
        success: false,
        message: `Insufficient godown stock. Available: ${stock.godown} bales, Requested: ${quantity} bales.`,
      });
    }

    const transaction = await StockTransaction.create({
      itemId,
      transactionType: 'dispatch',
      quantity,
      transactionDate: transactionDate || new Date(),
      remarks,
      createdBy: req.user._id,
    });

    const updatedStock = await calculateItemStock(itemId);

    res.status(201).json({
      success: true,
      message: `Dispatch of ${quantity} bales recorded.`,
      data: transaction,
      updatedStock,
    });
  } catch (error) {
    console.error('Add dispatch error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Add sale (home -> sold)
// @route   POST /api/transactions/sale
// @access  Private
const addSale = async (req, res) => {
  try {
    const { itemId, quantity, transactionDate, customerName, remarks } = req.body;

    if (!itemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Item and quantity are required.',
      });
    }
    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than zero.',
      });
    }

    const item = await Item.findById(itemId);
    if (!item || item.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Item not found or inactive.' });
    }

    // Validate home stock is sufficient
    const stock = await calculateItemStock(itemId);
    if (quantity > stock.home) {
      return res.status(400).json({
        success: false,
        message: `Insufficient home stock. Available: ${stock.home} bales, Requested: ${quantity} bales.`,
      });
    }

    const transaction = await StockTransaction.create({
      itemId,
      transactionType: 'sale',
      quantity,
      transactionDate: transactionDate || new Date(),
      customerName,
      remarks,
      createdBy: req.user._id,
    });

    const updatedStock = await calculateItemStock(itemId);

    res.status(201).json({
      success: true,
      message: `Sale of ${quantity} bales recorded.`,
      data: transaction,
      updatedStock,
    });
  } catch (error) {
    console.error('Add sale error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Add opening stock
// @route   POST /api/transactions/opening-stock
// @access  Private/Admin
const addOpeningStock = async (req, res) => {
  try {
    const { itemId, quantity, transactionDate, remarks } = req.body;

    if (!itemId || !quantity) {
      return res.status(400).json({ success: false, message: 'Item and quantity are required.' });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const transaction = await StockTransaction.create({
      itemId,
      transactionType: 'opening_stock',
      quantity,
      transactionDate: transactionDate || new Date(),
      remarks: remarks || 'Opening stock entry',
      createdBy: req.user._id,
    });

    const stock = await calculateItemStock(itemId);
    res.status(201).json({
      success: true,
      message: 'Opening stock recorded.',
      data: transaction,
      updatedStock: stock,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Reverse/correct a transaction
// @route   POST /api/transactions/:id/reverse
// @access  Private/Admin
const reverseTransaction = async (req, res) => {
  try {
    const { correctionReason } = req.body;
    const original = await StockTransaction.findById(req.params.id);

    if (!original) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }
    if (original.isReversed) {
      return res.status(400).json({ success: false, message: 'Transaction is already reversed.' });
    }
    if (!correctionReason || !correctionReason.trim()) {
      return res.status(400).json({ success: false, message: 'Correction reason is required.' });
    }

    // Mark original as reversed
    original.isReversed = true;
    await original.save();

    // Create correction entry
    const correction = await StockTransaction.create({
      itemId: original.itemId,
      transactionType: 'correction',
      quantity: original.quantity,
      transactionDate: new Date(),
      remarks: correctionReason.trim(),
      correctionReason: correctionReason.trim(),
      reversedTransactionId: original._id,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Transaction reversed and correction recorded.',
      data: correction,
    });
  } catch (error) {
    console.error('Reverse error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Get stock report (all items summary)
// @route   GET /api/transactions/stock-report
// @access  Private
const getStockReport = async (req, res) => {
  try {
    const { itemId } = req.query;

    const itemQuery = { status: 'active' };
    if (itemId) itemQuery._id = itemId;

    const items = await Item.find(itemQuery).sort({ itemName: 1 });
    const report = [];

    for (const item of items) {
      const stock = await calculateItemStock(item._id);
      report.push({
        _id: item._id,
        itemName: item.itemName,
        itemCode: item.itemCode,
        godown: stock.godown,
        home: stock.home,
        sold: stock.sold,
        total: stock.total,
      });
    }

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    console.error('Stock report error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Get dashboard summary
// @route   GET /api/transactions/dashboard
// @access  Private
const getDashboard = async (req, res) => {
  try {
    const items = await Item.find({ status: 'active' });

    let totalGodown = 0;
    let totalHome = 0;
    let totalSold = 0;

    for (const item of items) {
      const stock = await calculateItemStock(item._id);
      totalGodown += stock.godown;
      totalHome += stock.home;
      totalSold += stock.sold;
    }

    // Recent transactions (last 10)
    const recentTransactions = await StockTransaction.find({ isReversed: false })
      .populate('itemId', 'itemName')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          godownStock: totalGodown,
          homeStock: totalHome,
          totalSold: totalSold,
          remainingStock: totalGodown + totalHome,
        },
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getTransactions,
  addPurchase,
  addDispatch,
  addSale,
  addOpeningStock,
  reverseTransaction,
  getStockReport,
  getDashboard,
  calculateItemStock,
};
