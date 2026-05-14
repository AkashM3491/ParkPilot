import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import franchiseRoutes from './routes/franchiseRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Allow all origins including Vercel frontend
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

import path from 'path';

const __dirname = path.resolve();

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/franchise', franchiseRoutes);
app.use('/api/parking', bookingRoutes);

// Catch-all route to serve React index.html for unknown routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  } else {
    next();
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
