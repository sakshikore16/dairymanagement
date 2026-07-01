import mongoose from 'mongoose';

// Business Settings Schema
const businessSettingsSchema = new mongoose.Schema({
  businessName: { type: String, default: "My Dairy Distribution" },
  ownerName: { type: String, default: "" },
  phoneNumber: { type: String, default: "" },
  businessAddress: { type: String, default: "" },
  logo: { type: String, default: "" }, // Base64 or path
  gstNumber: { type: String, default: "" },
  theme: { type: String, default: "light" } // light / dark
}, { timestamps: true });

// Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

// Brand Schema
const brandSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }
}, { timestamps: true });

// Ensure unique brand per category
brandSchema.index({ name: 1, category: 1 }, { unique: true });

// Product Schema
const productSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  name: { type: String, required: true }, // e.g., "Gold 500 ml"
  quantity: { type: Number, required: true }, // e.g., 500, 1, 200
  unit: { type: String, required: true }, // e.g., "ml", "L", "g", "kg"
  sellingPrice: { type: Number, required: true, min: 0 },
  currentStock: { type: Number, required: true, default: 0 },
  minimumStockAlert: { type: Number, required: true, default: 10 },
  status: { type: String, enum: ['Available', 'Unavailable'], default: 'Available' }
}, { timestamps: true });

productSchema.index({ name: 1, brand: 1, category: 1 });

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobileNumber: { type: String, default: "" },
  address: { type: String, default: "" },
  area: { type: String, default: "" },
  customerType: { type: String, enum: ['Home', 'Shop'], default: 'Home' },
  notes: { type: String, default: "" },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  balance: { type: Number, default: 0 } // Outstanding balance (+ is customer owes money)
}, { timestamps: true });

customerSchema.index({ name: 1 });
customerSchema.index({ mobileNumber: 1 });
customerSchema.index({ area: 1 });

// Transaction Schema (Daily Supply)
const transactionSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  time: { type: String, required: true }, // e.g., "07:30 AM"
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    categoryName: { type: String, required: true },
    brandName: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true },
    unitPrice: { type: Number, required: true }, // Historically locked price
    total: { type: Number, required: true }
  }],
  grandTotal: { type: Number, required: true },
  invoiceNumber: { type: String, unique: true }
}, { timestamps: true });

transactionSchema.index({ date: -1 });
transactionSchema.index({ customer: 1 });
transactionSchema.index({ invoiceNumber: 1 });

// Collection Schema (Daily Money Collection)
const collectionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  date: { type: Date, required: true, default: Date.now },
  amountCollected: { type: Number, required: true, min: 0 },
  collectionStatus: { type: String, enum: ['Collected', 'Not Collected'], default: 'Collected' },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Other'], default: 'Cash' },
  notes: { type: String, default: "" }
}, { timestamps: true });

collectionSchema.index({ date: -1 });
collectionSchema.index({ customer: 1 });

// Expense Category Schema
const expenseCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

// Expense Schema
const expenseSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true, default: Date.now },
  notes: { type: String, default: "" },
  attachment: { type: String, default: "" } // Base64 or path
}, { timestamps: true });

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });

// Stock History Schema
const stockHistorySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantityAdded: { type: Number, required: true }, // Positive for additions, negative for reductions
  date: { type: Date, required: true, default: Date.now },
  supplier: { type: String, default: "" },
  notes: { type: String, default: "" }
}, { timestamps: true });

stockHistorySchema.index({ product: 1, date: -1 });

// Export Models
export const BusinessSettings = mongoose.model('BusinessSettings', businessSettingsSchema);
export const Category = mongoose.model('Category', categorySchema);
export const Brand = mongoose.model('Brand', brandSchema);
export const Product = mongoose.model('Product', productSchema);
export const Customer = mongoose.model('Customer', customerSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);
export const Collection = mongoose.model('Collection', collectionSchema);
export const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);
export const Expense = mongoose.model('Expense', expenseSchema);
export const StockHistory = mongoose.model('StockHistory', stockHistorySchema);
