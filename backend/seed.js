import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
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

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/milkapp';

async function seed() {
  try {
    console.log("Connecting to database for seeding...");
    await mongoose.connect(MONGODB_URI);
    console.log("Database connected. Cleaning existing data...");

    // Clean existing data
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

    console.log("Cleared old data. Seeding Business Settings...");
    const settings = await BusinessSettings.create({
      businessName: "Yash General Store",
      ownerName: "Rajesh Sharma",
      phoneNumber: "9425012345",
      businessAddress: "142, Subhash Marg, Near Main Square, Indore, MP",
      gstNumber: "23AABCU1234F1Z1",
      theme: "light"
    });

    console.log("Seeding Categories...");
    const catMilk = await Category.create({ name: "Milk" });
    const catCurd = await Category.create({ name: "Curd" });
    const catPaneer = await Category.create({ name: "Paneer" });
    const catButter = await Category.create({ name: "Butter" });
    const catCheese = await Category.create({ name: "Cheese" });
    const catLassi = await Category.create({ name: "Lassi" });

    console.log("Seeding Brands...");
    const brandAmul = await Brand.create({ name: "Amul", category: catMilk._id });
    const brandGokul = await Brand.create({ name: "Gokul", category: catMilk._id });
    
    const brandAmulCurd = await Brand.create({ name: "Amul", category: catCurd._id });
    const brandGokulCurd = await Brand.create({ name: "Gokul", category: catCurd._id });

    const brandAmulPaneer = await Brand.create({ name: "Amul", category: catPaneer._id });
    const brandAmulButter = await Brand.create({ name: "Amul", category: catButter._id });
    const brandAmulCheese = await Brand.create({ name: "Amul", category: catCheese._id });
    const brandAmulLassi = await Brand.create({ name: "Amul", category: catLassi._id });

    console.log("Seeding Products...");
    const p1 = await Product.create({
      category: catMilk._id,
      brand: brandAmul._id,
      name: "Gold 500 ml",
      quantity: 500,
      unit: "ml",
      sellingPrice: 33,
      currentStock: 120,
      minimumStockAlert: 15,
      status: "Available"
    });

    const p2 = await Product.create({
      category: catMilk._id,
      brand: brandAmul._id,
      name: "Gold 1 L",
      quantity: 1,
      unit: "L",
      sellingPrice: 66,
      currentStock: 8, // Low stock alert trigger
      minimumStockAlert: 10,
      status: "Available"
    });

    const p3 = await Product.create({
      category: catMilk._id,
      brand: brandAmul._id,
      name: "Taaza 500 ml",
      quantity: 500,
      unit: "ml",
      sellingPrice: 27,
      currentStock: 180,
      minimumStockAlert: 20,
      status: "Available"
    });

    const p4 = await Product.create({
      category: catMilk._id,
      brand: brandGokul._id,
      name: "Cow Milk 500 ml",
      quantity: 500,
      unit: "ml",
      sellingPrice: 28,
      currentStock: 90,
      minimumStockAlert: 15,
      status: "Available"
    });

    const p5 = await Product.create({
      category: catMilk._id,
      brand: brandGokul._id,
      name: "Toned Milk 1 L",
      quantity: 1,
      unit: "L",
      sellingPrice: 54,
      currentStock: 45,
      minimumStockAlert: 10,
      status: "Available"
    });

    const p6 = await Product.create({
      category: catCurd._id,
      brand: brandAmulCurd._id,
      name: "Cup Curd 200 g",
      quantity: 200,
      unit: "g",
      sellingPrice: 22,
      currentStock: 60,
      minimumStockAlert: 10,
      status: "Available"
    });

    const p7 = await Product.create({
      category: catCurd._id,
      brand: brandGokulCurd._id,
      name: "Pouch Curd 500 g",
      quantity: 500,
      unit: "g",
      sellingPrice: 46,
      currentStock: 5, // Low stock alert trigger
      minimumStockAlert: 10,
      status: "Available"
    });

    const p8 = await Product.create({
      category: catPaneer._id,
      brand: brandAmulPaneer._id,
      name: "Fresh Paneer 200 g",
      quantity: 200,
      unit: "g",
      sellingPrice: 95,
      currentStock: 35,
      minimumStockAlert: 5,
      status: "Available"
    });

    const p9 = await Product.create({
      category: catLassi._id,
      brand: brandAmulLassi._id,
      name: "Rose Lassi 250 ml",
      quantity: 250,
      unit: "ml",
      sellingPrice: 25,
      currentStock: 80,
      minimumStockAlert: 10,
      status: "Available"
    });

    console.log("Seeding Stock History Log...");
    await StockHistory.insertMany([
      { product: p1._id, quantityAdded: 150, notes: "Opening Stock Lot A", supplier: "Amul Indore Depot" },
      { product: p2._id, quantityAdded: 20, notes: "Opening Stock Lot A", supplier: "Amul Indore Depot" },
      { product: p3._id, quantityAdded: 200, notes: "Opening Stock Lot B", supplier: "Amul Indore Depot" },
      { product: p4._id, quantityAdded: 100, notes: "Opening Stock Cow Lot", supplier: "Gokul Indore" },
      { product: p5._id, quantityAdded: 50, notes: "Opening Stock Toned Lot", supplier: "Gokul Indore" },
      { product: p6._id, quantityAdded: 70, notes: "Curd Batch 1", supplier: "Amul Fresh Shop" },
      { product: p7._id, quantityAdded: 20, notes: "Curd Batch 2", supplier: "Gokul Fresh" },
      { product: p8._id, quantityAdded: 40, notes: "Paneer Fresh Lot", supplier: "Amul Indore Depot" },
      { product: p9._id, quantityAdded: 80, notes: "Lassi Batch A", supplier: "Amul Fresh Shop" }
    ]);

    console.log("Seeding Customers...");
    const c1 = await Customer.create({
      name: "Sharma Kirana Store",
      mobileNumber: "9876543211",
      address: "Shop 4, Sector B, Scheme 54",
      area: "Scheme 54",
      customerType: "Shop",
      notes: "Delivers before 7:00 AM",
      status: "Active",
      balance: 1450 // Initial debt
    });

    const c2 = await Customer.create({
      name: "Verma Sweets & Bakery",
      mobileNumber: "9425099887",
      address: "22, Shastri Colony Main Road",
      area: "Shastri Colony",
      customerType: "Shop",
      notes: "Requires paneer daily",
      status: "Active",
      balance: 3120 // Initial debt
    });

    const c3 = await Customer.create({
      name: "Amit Patel (Home 102)",
      mobileNumber: "9988776655",
      address: "Flat 102, Royal Residency, Sector B",
      area: "Royal Residency",
      customerType: "Home",
      notes: "Needs 1 L Gold, leaves bottle outside",
      status: "Active",
      balance: 240 // Initial debt
    });

    const c4 = await Customer.create({
      name: "Mrs. Sunita Joshi",
      mobileNumber: "9302114455",
      address: "House 14, Gali 2, Shastri Colony",
      area: "Shastri Colony",
      customerType: "Home",
      notes: "Pay on 1st of every month",
      status: "Active",
      balance: 0
    });

    const c5 = await Customer.create({
      name: "Gupta General Store (Closed)",
      mobileNumber: "9009001234",
      address: "Chota Chowk, Scheme 54",
      area: "Scheme 54",
      customerType: "Shop",
      notes: "Business closed temporarily",
      status: "Inactive",
      balance: 500
    });

    console.log("Seeding Expense Categories...");
    const expFuel = await ExpenseCategory.create({ name: "Fuel (Diesel/Petrol)" });
    const expStaff = await ExpenseCategory.create({ name: "Staff Salary" });
    const expVehicle = await ExpenseCategory.create({ name: "Vehicle Maintenance" });
    const expElectricity = await ExpenseCategory.create({ name: "Electricity" });
    const expIce = await ExpenseCategory.create({ name: "Ice Blocks" });
    const expRent = await ExpenseCategory.create({ name: "Rent" });
    const expMisc = await ExpenseCategory.create({ name: "Miscellaneous" });

    console.log("Seeding Expenses...");
    await Expense.insertMany([
      { category: expFuel._id, amount: 850, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), notes: "Loading Auto Diesel refill" },
      { category: expIce._id, amount: 350, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), notes: "Ice for crate cooling" },
      { category: expVehicle._id, amount: 1500, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), notes: "Loading Auto Tyre repair" },
      { category: expRent._id, amount: 8000, date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), notes: "June Depot Rent" },
      { category: expStaff._id, amount: 12000, date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), notes: "Driver Salary - June" },
      { category: expMisc._id, amount: 200, date: new Date(), notes: "Chai-Nashta for delivery helpers" }
    ]);

    console.log("Seeding Daily Supply Transactions (Supplies)...");
    
    // Transaction 1: Sharma Kirana
    const tx1 = await Transaction.create({
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      time: "06:45 AM",
      customer: c1._id,
      products: [
        {
          product: p1._id,
          categoryName: "Milk",
          brandName: "Amul",
          name: "Gold 500 ml",
          quantity: 20,
          unit: "ml",
          unitPrice: 33,
          total: 660
        },
        {
          product: p6._id,
          categoryName: "Curd",
          brandName: "Amul",
          name: "Cup Curd 200 g",
          quantity: 10,
          unit: "g",
          unitPrice: 22,
          total: 220
        }
      ],
      grandTotal: 880,
      invoiceNumber: "INV-20260630-0001"
    });
    
    // Deduct stock for Transaction 1
    p1.currentStock -= 20;
    p6.currentStock -= 10;
    await p1.save();
    await p6.save();

    // Transaction 2: Verma Sweets
    const tx2 = await Transaction.create({
      date: new Date(),
      time: "07:15 AM",
      customer: c2._id,
      products: [
        {
          product: p4._id,
          categoryName: "Milk",
          brandName: "Gokul",
          name: "Cow Milk 500 ml",
          quantity: 10,
          unit: "ml",
          unitPrice: 28,
          total: 280
        },
        {
          product: p8._id,
          categoryName: "Paneer",
          brandName: "Amul",
          name: "Fresh Paneer 200 g",
          quantity: 5,
          unit: "g",
          unitPrice: 95,
          total: 475
        }
      ],
      grandTotal: 755,
      invoiceNumber: "INV-20260701-0001"
    });

    p4.currentStock -= 10;
    p8.currentStock -= 5;
    await p4.save();
    await p8.save();

    console.log("Seeding Collections...");
    // Collection from Sharma Kirana
    await Collection.create({
      customer: c1._id,
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      amountCollected: 500,
      collectionStatus: 'Collected',
      paymentMethod: 'Cash',
      notes: "Part payment received"
    });

    // Collection from Amit Patel
    await Collection.create({
      customer: c3._id,
      date: new Date(),
      amountCollected: 240,
      collectionStatus: 'Collected',
      paymentMethod: 'UPI',
      notes: "Full payment received for last week"
    });

    console.log("Database seeded successfully!");
    mongoose.connection.close();
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
