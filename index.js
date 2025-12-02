// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
// const mongoSanitize = require('express-mongo-sanitize');
// require('dotenv').config();

// const authRoutes = require('./routes/auth');
// const userRoutes = require('./routes/users');
// const leadRoutes = require('./routes/leads');
// const dashboardRoutes = require('./routes/dashboard');

// const app = express();

// // Security middleware
// app.use(helmet());
// app.use(mongoSanitize());
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//   credentials: true
// }));

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100 // limit each IP to 100 requests per windowMs
// });
// app.use('/api/', limiter);

// // Body parsing
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/leads', leadRoutes);
// app.use('/api/dashboard', dashboardRoutes);

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ error: 'Something went wrong!' });
// });

// // Database connection
// mongoose.connect(process.env.MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// })
// .then(() => console.log('MongoDB connected'))
// .catch(err => console.error('MongoDB connection error:', err));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });











const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
// const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const leadRoutes = require('./routes/leads');
const dashboardRoutes = require('./routes/dashboard');
const tagRoutes = require('./routes/tags');
const noteRoutes = require('./routes/notes');

const app = express();

// Security middleware
// app.use(helmet());
// app.use(mongoSanitize());
app.use(cors({
  origin: 'http://localhost:5173' || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/notes', noteRoutes);

// 404 handler
// app.use(/.*/, (req, res) => {
//   res.status(404).json({ error: 'Route not found' });
// });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      details: Object.values(err.errors).map(e => e.message) 
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({ 
      error: 'Duplicate field value entered' 
    });
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Default error
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// Database connection with retry logic
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  setTimeout(connectDB, 5000);
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});