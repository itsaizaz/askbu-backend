const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
// const bodyParser = require('body-parser'); // Removed: redundant with express.json()
const createError = require('http-errors'); // Added for 404 handler

const indexRouter = require('../routes/index');

const app = express();

// Middleware setup
// app.use(bodyParser.json()); // REDUNDANT: Removed
app.use(cors({ origin: 'https://ask-bu.vercel.app' })); // Restricted CORS for security
app.use(logger('dev'));
app.use(express.json()); // Use built-in JSON parser
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// Serving static files might be better handled by Vercel static assets, 
// but is kept here for local testing compatibility.
app.use(express.static(path.join(__dirname, '../public'))); 

// Routes setup
app.use('/', indexRouter);

// Fallback for undefined routes (404)
app.use((req, res, next) => {
    // Uses the imported createError dependency
    next(createError(404)); 
});

// Final Error handler (Returns JSON for API)
app.use((err, req, res, next) => {
    // Logs the error message for debugging
    console.error(`Status ${err.status || 500}: ${err.message}`);

    // Send JSON response instead of rendering a view
    res.status(err.status || 500).json({
        error: {
            message: err.message,
            // Only expose the stack trace in development mode
            details: req.app.get('env') === 'development' ? err : {}
        }
    });
});

// This is the Express app instance that Vercel will export and run as a serverless function.
module.exports = app;