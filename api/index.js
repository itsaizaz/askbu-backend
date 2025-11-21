const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const createError = require('http-errors');
const url = require('url'); // Added for manual query parsing

const indexRouter = require('./routes/index');

const app = express();

// ------------------------------------------------------------------
// CRITICAL FIX: Bypass the Express query parser dependency issue 
// This prevents the application from trying to require the problematic 'gOPD' module.
app.set('query parser', false); 
app.use((req, res, next) => {
    // Manual query parser replacement (avoids the problematic qs/gOPD chain)
    // This runs instead of the default Express query middleware.
    req.query = url.parse(req.url, true).query; 
    next();
});
// ----------------------------------------------------------------------

// Middleware setup
app.use(cors({ origin: 'https://ask-bu.vercel.app' })); 
app.use(logger('dev'));
app.use(express.json()); // Handles JSON body parsing (for POST requests)
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public'))); 

// Routes setup
app.use('/', indexRouter);

// Fallback for undefined routes (404)
app.use((req, res, next) => {
    next(createError(404)); 
});

// Final Error handler (Returns JSON for API)
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