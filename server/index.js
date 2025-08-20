require('dotenv').config();
require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const { loadPrefixMiddleware, load404Handler, loadErrorHandler } = require('./utils/middleware');
const healthCheck = async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'OK',
    db: dbStatus,
    message: 'HackHub API is running',
    timestamp: new Date().toISOString()
  });
}
// const cors = require('cors');
// const helmet = require('helmet');
// const compression = require('compression');
// const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

{// // Security & performance middleware
  // app.use(helmet());
  // app.use(compression());

  // // Rate limiting
  // const limiter = rateLimit({
  //   windowMs: 15 * 60 * 1000, // 15 minutes
  //   max: 100, // limit each IP to 100 requests per windowMs
  //   message: 'Too many requests from this IP, please try again later.'
  // });
  // // Apply only to sensitive routes
  // app.use(['/api/auth', '/api/analytics'], limiter);

  // // CORS configuration (env-driven)
  // const allowedOrigins = (process.env.ALLOWED_ORIGINS || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''))
  //   .split(',')
  //   .map(s => s.trim())
  //   .filter(Boolean);
  // app.use(cors({
  //   origin: allowedOrigins.length ? allowedOrigins : ['http://localhost:3000'],
  //   credentials: true
  // }));

  // // Body parsing middleware
  // app.use(express.json({ limit: '10mb' }));
  // app.use(express.urlencoded({ extended: true, limit: '10mb' }));
}

loadPrefixMiddleware(app);

// Health check endpoint (includes DB status)
app.get('/api/health', healthCheck);

// API routes (centralized)
app.use('/api', require('./routes'));

// 404 handler
load404Handler(app);

// Error handling middleware
loadErrorHandler(app);

// Connect to MongoDB (Mongoose 6+ doesn't need extra options)
let memoryMongoServer;
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hackhub';
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    if (process.env.NODE_ENV !== 'production') {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryMongoServer = await MongoMemoryServer.create();
        const memUri = memoryMongoServer.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`MongoDB Memory Server Connected: ${conn.connection.host}`);
      } catch (memErr) {
        console.error('Failed to start MongoDB Memory Server:', memErr);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

let server;
// Start server
const startServer = async () => {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      console.log(`🚀 HackHub Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown with DB close
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  try {
    await mongoose.connection.close(false);
    console.log('MongoDB connection closed.');
  } catch (e) {
    console.log('Error closing MongoDB connection:', e?.message);
  }

  if (memoryMongoServer) {
    try {
      await memoryMongoServer.stop();
      console.log('MongoDB Memory Server stopped.');
    } catch (e) {
      console.log('Error stopping Memory Server:', e?.message);
    }
  }

  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();
