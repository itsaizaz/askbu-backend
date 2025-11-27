const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const createError = require('http-errors');

const indexRouter = require('../routes/index');

const app = express();

// Middleware setup
app.use(cors({ 
  origin: ['https://ask-bu.vercel.app', 'http://localhost:3000', 'https://ask-bu-five.vercel.app/'],
  credentials: true 
})); // ✅ FIXED: Allow both production and local development
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public'))); 

// Routes setup
app.use('/', indexRouter);

// Fallback for undefined routes (404)
app.use((req, res, next) => {
    next(createError(404)); 
});

// Final Error handler
app.use((err, req, res, next) => {
    console.error(`Status ${err.status || 500}: ${err.message}`);
    res.status(err.status || 500).json({
        error: {
            message: err.message,
            details: req.app.get('env') === 'development' ? err : {}
        }
    });
});

module.exports = app;