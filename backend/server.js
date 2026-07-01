import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes.js';
import dns from 'dns';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 5050;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/milkapp';

// CORS configuration - Allow all for simple local network & development environments
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Dairy Distribution Server is active.' });
});

// Mount Routes
app.use('/api', apiRouter);

// Database Connection & Server Startup
console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully.');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=========================================`);
      console.log(`Dairy Distribution Server Started!`);
      console.log(`Port: ${PORT}`);
      console.log(`Access locally: http://localhost:${PORT}`);
      console.log(`=========================================`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error details:', err);
    process.exit(1);
  });
