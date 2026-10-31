const mongoose = require('mongoose');

const StockTransactionSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'Item is required'],
    },
    transactionType: {
      type: String,
      enum: ['purchase', 'dispatch', 'sale', 'opening_stock', 'correction'],
      required: [true, 'Transaction type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be greater than zero'],
    },
    transactionDate: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
    customerName: {
      type: String,
      trim: true,
      maxlength: [100, 'Customer name cannot exceed 100 characters'],
    },
    // For corrections/reversals — links to the original transaction
    reversedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StockTransaction',
      default: null,
    },
    correctionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Correction reason cannot exceed 500 characters'],
    },
    isReversed: {
      type: Boolean,
      default: false,
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

// Index for fast queries
StockTransactionSchema.index({ itemId: 1, transactionType: 1 });
StockTransactionSchema.index({ transactionDate: -1 });
StockTransactionSchema.index({ createdBy: 1 });

module.exports = mongoose.model('StockTransaction', StockTransactionSchema);
