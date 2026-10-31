const Item = require('../models/Item');

// @desc    Get all items
// @route   GET /api/items
// @access  Private
const getItems = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
      ];
    }

    const items = await Item.find(query)
      .populate('createdBy', 'name username')
      .sort({ itemName: 1 });

    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Private
const getItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('createdBy', 'name username');
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Create a new item
// @route   POST /api/items
// @access  Private/Admin
const createItem = async (req, res) => {
  try {
    const { itemName, description } = req.body;

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Item name is required.',
      });
    }

    // Check for duplicate item name (case-insensitive)
    const existing = await Item.findOne({
      itemName: { $regex: `^${itemName.trim()}$`, $options: 'i' },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An item with this name already exists.',
      });
    }

    const item = await Item.create({
      itemName: itemName.trim(),
      description: description ? description.trim() : '',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private/Admin
const updateItem = async (req, res) => {
  try {
    const { itemName, description, status } = req.body;

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    // Check for duplicate name (excluding current item)
    if (itemName && itemName.trim() !== item.itemName) {
      const existing = await Item.findOne({
        itemName: { $regex: `^${itemName.trim()}$`, $options: 'i' },
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'An item with this name already exists.',
        });
      }
    }

    if (itemName) item.itemName = itemName.trim();
    if (description !== undefined) item.description = description.trim();
    if (status) item.status = status;

    await item.save();

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getItems, getItem, createItem, updateItem };
