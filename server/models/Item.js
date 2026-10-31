const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [100, 'Item name cannot be more than 100 characters'],
    },
    itemCode: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot be more than 300 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate itemCode from itemName if not provided
ItemSchema.pre('save', function (next) {
  if (!this.itemCode) {
    this.itemCode = this.itemName
      .toUpperCase()
      .replace(/\s+/g, '_')
      .substring(0, 10);
  }
  next();
});

module.exports = mongoose.model('Item', ItemSchema);
