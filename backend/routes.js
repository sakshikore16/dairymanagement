import express from 'express';
import mongoose from 'mongoose';
import {
  BusinessSettings,
  Category,
  Brand,
  Product,
  Customer,
  Transaction,
  Collection,
  ExpenseCategory,
  Expense,
  StockHistory
} from './models.js';
import { generateInvoicePDF, generateLedgerPDF, generateExpensesPDF } from './pdfGenerator.js';
import xlsx from 'xlsx';

const router = express.Router();

// Helper to generate Invoice Number (e.g. INV-YYYYMMDD-XXXX)
async function generateInvoiceNo() {
  const today = new Date();
  const dateStr = today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, '0') +
    today.getDate().toString().padStart(2, '0');
  
  const count = await Transaction.countDocuments({
    invoiceNumber: new RegExp(`^INV-${dateStr}-`)
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `INV-${dateStr}-${sequence}`;
}

/* ==========================================================================
   AUTHENTICATION & SETTINGS
   ========================================================================== */

// Simple Auth Login - One time mock login
router.post('/auth/login', (req, res) => {
  const { pin } = req.body;
  // Let's accept any login or a default pin like "1234" to keep it simple.
  if (pin === "1234" || !pin) {
    return res.json({ success: true, token: "milk-admin-token-12345" });
  }
  return res.status(400).json({ error: "Invalid PIN" });
});

// GET Business Settings
router.get('/settings', async (req, res) => {
  try {
    let settings = await BusinessSettings.findOne();
    if (!settings) {
      settings = await BusinessSettings.create({
        businessName: "Yash General Store",
        ownerName: "Dairy Owner",
        phoneNumber: "9876543210",
        businessAddress: "Shop No. 12, Main Market, Anand",
        gstNumber: "",
        theme: "light"
      });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE Business Settings
router.post('/settings', async (req, res) => {
  try {
    let settings = await BusinessSettings.findOne();
    if (!settings) {
      settings = new BusinessSettings();
    }
    Object.assign(settings, req.body);
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ==========================================================================
   MASTER DATA - CATEGORIES & BRANDS
   ========================================================================== */

// Categories CRUD
router.get('/categories', async (req, res) => {
  try {
    const list = await Category.find().sort({ name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const cat = await Category.create(req.body);
    res.status(201).json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Brands CRUD
router.get('/brands', async (req, res) => {
  try {
    const list = await Brand.find().populate('category').sort({ name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/brands/category/:catId', async (req, res) => {
  try {
    const list = await Brand.find({ category: req.params.catId }).sort({ name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/brands', async (req, res) => {
  try {
    const brand = await Brand.create(req.body);
    const populated = await Brand.findById(brand._id).populate('category');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/brands/:id', async (req, res) => {
  try {
    await Brand.findByIdAndDelete(req.params.id);
    res.json({ message: "Brand deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ==========================================================================
   PRODUCT MANAGEMENT
   ========================================================================== */

router.get('/products', async (req, res) => {
  try {
    const list = await Product.find()
      .populate('category')
      .populate('brand')
      .sort({ name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    const populated = await Product.findById(product._id).populate('category').populate('brand');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('category')
      .populate('brand');
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual Stock Adjustment
router.put('/products/:id/stock', async (req, res) => {
  try {
    const { quantityAdded, notes, supplier } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.currentStock += Number(quantityAdded);
    await product.save();

    // Log in StockHistory
    await StockHistory.create({
      product: product._id,
      quantityAdded,
      supplier: supplier || "",
      notes: notes || "Manual Adjustment"
    });

    const populated = await Product.findById(product._id).populate('category').populate('brand');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Stock History Logs
router.get('/stock/history', async (req, res) => {
  try {
    const logs = await StockHistory.find()
      .populate({
        path: 'product',
        populate: [{ path: 'category' }, { path: 'brand' }]
      })
      .sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ==========================================================================
   CUSTOMER MANAGEMENT
   ========================================================================== */

router.get('/customers', async (req, res) => {
  try {
    const list = await Customer.find().sort({ name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: "Customer deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Ledger Details
router.get('/customers/:id/ledger', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const transactions = await Transaction.find({ customer: customer._id }).sort({ date: -1 });
    const collections = await Collection.find({ customer: customer._id }).sort({ date: -1 });

    res.json({
      customer,
      transactions,
      collections
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ==========================================================================
   DAILY SUPPLY TRANSACTIONS
   ========================================================================== */

router.get('/transactions', async (req, res) => {
  try {
    const list = await Transaction.find()
      .populate('customer')
      .sort({ date: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create supply transaction (updates stock & customer balance)
router.post('/transactions', async (req, res) => {
  try {
    const { customerId, products, date, time } = req.body;
    
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const invoiceNumber = await generateInvoiceNo();
    const parsedProducts = [];
    let grandTotal = 0;

    // Process each product in the supply
    for (const p of products) {
      const dbProduct = await Product.findById(p.productId).populate('category').populate('brand');
      if (!dbProduct) return res.status(404).json({ error: `Product ${p.productId} not found` });

      const itemTotal = dbProduct.sellingPrice * p.quantity;
      grandTotal += itemTotal;

      parsedProducts.push({
        product: dbProduct._id,
        categoryName: dbProduct.category.name,
        brandName: dbProduct.brand.name,
        name: dbProduct.name,
        quantity: p.quantity,
        unit: dbProduct.unit,
        unitPrice: dbProduct.sellingPrice, // locked historical price
        total: itemTotal
      });

      // Deduct stock
      dbProduct.currentStock -= p.quantity;
      await dbProduct.save();

      // Log Stock History
      await StockHistory.create({
        product: dbProduct._id,
        quantityAdded: -p.quantity,
        notes: `Supply to ${customer.name} (Invoice: ${invoiceNumber})`
      });
    }

    // Save transaction
    const transaction = await Transaction.create({
      date: date ? new Date(date) : new Date(),
      time: time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      customer: customer._id,
      products: parsedProducts,
      grandTotal,
      invoiceNumber
    });

    // Update customer outstanding balance
    customer.balance += grandTotal;
    await customer.save();

    const populated = await Transaction.findById(transaction._id).populate('customer');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Duplicate Transaction
router.post('/transactions/:id/duplicate', async (req, res) => {
  try {
    const sourceTx = await Transaction.findById(req.params.id);
    if (!sourceTx) return res.status(404).json({ error: "Source transaction not found" });

    const customer = await Customer.findById(sourceTx.customer);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const invoiceNumber = await generateInvoiceNo();
    let grandTotal = 0;
    const duplicatedProducts = [];

    for (const p of sourceTx.products) {
      const dbProduct = await Product.findById(p.product).populate('category').populate('brand');
      if (!dbProduct) continue; // Skip if product deleted

      // Lock current price of product
      const itemTotal = dbProduct.sellingPrice * p.quantity;
      grandTotal += itemTotal;

      duplicatedProducts.push({
        product: dbProduct._id,
        categoryName: dbProduct.category.name,
        brandName: dbProduct.brand.name,
        name: dbProduct.name,
        quantity: p.quantity,
        unit: dbProduct.unit,
        unitPrice: dbProduct.sellingPrice,
        total: itemTotal
      });

      // Deduct stock
      dbProduct.currentStock -= p.quantity;
      await dbProduct.save();

      // Log Stock History
      await StockHistory.create({
        product: dbProduct._id,
        quantityAdded: -p.quantity,
        notes: `Supply duplicated from invoice: ${sourceTx.invoiceNumber} to ${customer.name}`
      });
    }

    const newTx = await Transaction.create({
      date: new Date(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      customer: customer._id,
      products: duplicatedProducts,
      grandTotal,
      invoiceNumber
    });

    customer.balance += grandTotal;
    await customer.save();

    const populated = await Transaction.findById(newTx._id).populate('customer');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


/* ==========================================================================
   DAILY COLLECTIONS (MONEY COLLECTION)
   ========================================================================= */

router.get('/collections', async (req, res) => {
  try {
    const list = await Collection.find().populate('customer').sort({ date: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record Collection (reduces customer balance)
router.post('/collections', async (req, res) => {
  try {
    const { customerId, amountCollected, paymentMethod, notes, date } = req.body;
    
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const collection = await Collection.create({
      customer: customer._id,
      date: date ? new Date(date) : new Date(),
      amountCollected: Number(amountCollected),
      collectionStatus: 'Collected',
      paymentMethod: paymentMethod || 'Cash',
      notes: notes || ""
    });

    // Update customer balance
    customer.balance -= Number(amountCollected);
    await customer.save();

    const populated = await Collection.findById(collection._id).populate('customer');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


/* ==========================================================================
   EXPENSE MANAGEMENT
   ========================================================================== */

// Expense Categories
router.get('/expenses/categories', async (req, res) => {
  try {
    const list = await ExpenseCategory.find().sort({ name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/expenses/categories', async (req, res) => {
  try {
    const cat = await ExpenseCategory.create(req.body);
    res.status(201).json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Expenses CRUD
router.get('/expenses', async (req, res) => {
  try {
    const list = await Expense.find().populate('category').sort({ date: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const exp = await Expense.create(req.body);
    const populated = await Expense.findById(exp._id).populate('category');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/expenses/:id', async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ==========================================================================
   DASHBOARD AND REPORT SUMMARIES
   ========================================================================== */

router.get('/dashboard/summary', async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    // Queries
    const todayTransactions = await Transaction.find({ date: { $gte: startOfToday, $lte: endOfToday } });
    const todayCollections = await Collection.find({ date: { $gte: startOfToday, $lte: endOfToday } });
    const todayExpenses = await Expense.find({ date: { $gte: startOfToday, $lte: endOfToday } });

    const monthTransactions = await Transaction.find({ date: { $gte: startOfMonth } });
    const monthExpenses = await Expense.find({ date: { $gte: startOfMonth } });

    const totalCustomersCount = await Customer.countDocuments();
    const activeCustomersCount = await Customer.countDocuments({ status: 'Active' });
    const inactiveCustomersCount = await Customer.countDocuments({ status: 'Inactive' });

    const totalProductsCount = await Product.countDocuments();
    
    // Low Stock products
    const products = await Product.find();
    const lowStockProductsCount = products.filter(p => p.currentStock <= p.minimumStockAlert).length;
    const lowStockAlerts = products.filter(p => p.currentStock <= p.minimumStockAlert).map(p => ({
      name: p.name,
      currentStock: p.currentStock,
      minimumStockAlert: p.minimumStockAlert
    }));

    // Pending collections
    const customersWithBalance = await Customer.find({ balance: { $gt: 0 } });
    const pendingCollections = customersWithBalance.reduce((sum, c) => sum + c.balance, 0);

    // Mathematical reductions
    const todayDeliveries = todayTransactions.length;
    const todaySales = todayTransactions.reduce((sum, t) => sum + t.grandTotal, 0);
    const todayMoneyCollected = todayCollections.reduce((sum, c) => sum + c.amountCollected, 0);
    const todayExpenseAmount = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    const monthlyRevenue = monthTransactions.reduce((sum, t) => sum + t.grandTotal, 0);
    const monthlyExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = monthlyRevenue - monthlyExpenses;

    res.json({
      todayDeliveries,
      todaySales,
      todayMoneyCollected,
      pendingCollections,
      monthlyRevenue,
      monthlyExpenses,
      netProfit,
      totalCustomers: totalCustomersCount,
      activeCustomers: activeCustomersCount,
      inactiveCustomers: inactiveCustomersCount,
      totalProducts: totalProductsCount,
      lowStockProducts: lowStockProductsCount,
      lowStockAlerts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expense Breakdown Summary for Charts
router.get('/reports/expenses/stats', async (req, res) => {
  try {
    const expenses = await Expense.find().populate('category');
    
    // Group by category name
    const categoryGroup = {};
    expenses.forEach(e => {
      const catName = e.category ? e.category.name : 'Uncategorized';
      categoryGroup[catName] = (categoryGroup[catName] || 0) + e.amount;
    });

    const categoryBreakdown = Object.keys(categoryGroup).map(key => ({
      category: key,
      amount: categoryGroup[key]
    }));

    // Group by month-year
    const monthlyGroup = {};
    expenses.forEach(e => {
      const date = new Date(e.date);
      const label = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      monthlyGroup[label] = (monthlyGroup[label] || 0) + e.amount;
    });

    const monthlyTrend = Object.keys(monthlyGroup).map(key => ({
      month: key,
      amount: monthlyGroup[key]
    })).reverse(); // chronological

    res.json({
      categoryBreakdown,
      monthlyTrend
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ==========================================================================
   REPORTS - EXPORTS (PDF & EXCEL)
   ========================================================================== */

// PDF Invoice
router.get('/reports/invoice/:id/pdf', async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id).populate('customer');
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    let settings = await BusinessSettings.findOne();
    if (!settings) settings = {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${tx.invoiceNumber}.pdf`);

    generateInvoicePDF(tx, settings, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PDF Customer Ledger
router.get('/reports/ledger/:customerId/pdf', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const customer = await Customer.findById(req.params.customerId);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    let txQuery = { customer: customer._id };
    let collQuery = { customer: customer._id };

    if (startDate && endDate) {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);

      txQuery.date = { $gte: sDate, $lte: eDate };
      collQuery.date = { $gte: sDate, $lte: eDate };
    }

    const transactions = await Transaction.find(txQuery).sort({ date: 1 });
    const collections = await Collection.find(collQuery).sort({ date: 1 });

    let settings = await BusinessSettings.findOne();
    if (!settings) settings = {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ledger_${customer.name.replace(/\s+/g, '_')}.pdf`);

    generateLedgerPDF(customer, transactions, collections, { startDate, endDate }, settings, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PDF Expense Report
router.get('/reports/expenses/pdf', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    if (startDate && endDate) {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      query.date = { $gte: sDate, $lte: eDate };
    }

    const expenses = await Expense.find(query).populate('category').sort({ date: 1 });
    
    let settings = await BusinessSettings.findOne();
    if (!settings) settings = {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Expense_Report.pdf`);

    generateExpensesPDF(expenses, settings, { startDate, endDate }, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard Data Excel Export
router.get('/reports/dashboard/excel', async (req, res) => {
  try {
    // Compile general stats, customers, stock, collections, and expenses
    const customers = await Customer.find().lean();
    const products = await Product.find().populate('category').populate('brand').lean();
    const transactions = await Transaction.find().populate('customer').lean();
    const collections = await Collection.find().populate('customer').lean();
    const expenses = await Expense.find().populate('category').lean();

    // Create workbook
    const wb = xlsx.utils.book_new();

    // Customers Sheet
    const custData = customers.map(c => ({
      "Name": c.name,
      "Mobile": c.mobileNumber,
      "Address": c.address,
      "Area": c.area,
      "Type": c.customerType,
      "Status": c.status,
      "Outstanding Balance (INR)": c.balance
    }));
    const wsCust = xlsx.utils.json_to_sheet(custData);
    xlsx.utils.book_append_sheet(wb, wsCust, "Customers");

    // Products Sheet
    const prodData = products.map(p => ({
      "Category": p.category ? p.category.name : "",
      "Brand": p.brand ? p.brand.name : "",
      "Name": p.name,
      "Selling Price (INR)": p.sellingPrice,
      "Stock": `${p.currentStock} ${p.unit}`,
      "Alert Level": p.minimumStockAlert,
      "Status": p.status
    }));
    const wsProd = xlsx.utils.json_to_sheet(prodData);
    xlsx.utils.book_append_sheet(wb, wsProd, "Products");

    // Supplies (Transactions) Sheet
    const txData = [];
    transactions.forEach(t => {
      t.products.forEach(p => {
        txData.push({
          "Invoice No": t.invoiceNumber,
          "Date": new Date(t.date).toLocaleDateString('en-IN'),
          "Time": t.time,
          "Customer": t.customer ? t.customer.name : "N/A",
          "Product": `${p.categoryName} - ${p.brandName} ${p.name}`,
          "Quantity": p.quantity,
          "Unit Price (INR)": p.unitPrice,
          "Total Amount (INR)": p.total
        });
      });
    });
    const wsTx = xlsx.utils.json_to_sheet(txData);
    xlsx.utils.book_append_sheet(wb, wsTx, "Daily Supplies");

    // Collections Sheet
    const colData = collections.map(c => ({
      "Customer": c.customer ? c.customer.name : "N/A",
      "Date": new Date(c.date).toLocaleDateString('en-IN'),
      "Amount Collected (INR)": c.amountCollected,
      "Payment Method": c.paymentMethod,
      "Notes": c.notes
    }));
    const wsCol = xlsx.utils.json_to_sheet(colData);
    xlsx.utils.book_append_sheet(wb, wsCol, "Collections");

    // Expenses Sheet
    const expData = expenses.map(e => ({
      "Date": new Date(e.date).toLocaleDateString('en-IN'),
      "Category": e.category ? e.category.name : "Uncategorized",
      "Amount (INR)": e.amount,
      "Notes": e.notes
    }));
    const wsExp = xlsx.utils.json_to_sheet(expData);
    xlsx.utils.book_append_sheet(wb, wsExp, "Expenses");

    // Buffer to download
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=Dairy_Business_Report.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESTORE DATABASE
router.post('/restore', async (req, res) => {
  try {
    const data = req.body;
    if (!data.exportVersion || !data.products) {
      return res.status(400).json({ error: "Invalid backup format." });
    }

    console.log("Starting bulk restore...");
    // Clear
    await BusinessSettings.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});
    await Transaction.deleteMany({});
    await Collection.deleteMany({});
    await ExpenseCategory.deleteMany({});
    await Expense.deleteMany({});
    await StockHistory.deleteMany({});

    // Bulk Insert
    if (data.settings) await BusinessSettings.create(data.settings);
    if (data.categories?.length) await Category.insertMany(data.categories);
    if (data.brands?.length) await Brand.insertMany(data.brands);
    if (data.products?.length) await Product.insertMany(data.products);
    if (data.customers?.length) await Customer.insertMany(data.customers);
    if (data.transactions?.length) await Transaction.insertMany(data.transactions);
    if (data.collections?.length) await Collection.insertMany(data.collections);
    if (data.expenseCategories?.length) await ExpenseCategory.insertMany(data.expenseCategories);
    if (data.expenses?.length) await Expense.insertMany(data.expenses);
    if (data.stockHistory?.length) await StockHistory.insertMany(data.stockHistory);

    console.log("Restore finished successfully.");
    res.json({ success: true, message: "Database restored successfully." });
  } catch (err) {
    console.error("Restore error:", err);
    res.status(500).json({ error: "Restoration failed: " + err.message });
  }
});

export default router;
