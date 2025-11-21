var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var indexRouter = require('./routes/index');

var app = express();

// --- Deployment Best Practice: Remove unused 'views' engine in API ---
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'pug');

// --- CORS Setup (Allow all for API access) ---
var corsOptions = {
    // You should change '*' to your actual frontend domain for production security
    origin: '*' 
};
app.use(cors(corsOptions));

// --- Middleware Setup ---
app.use(logger('dev'));
app.use(express.json()); // Handles JSON body parsing (replaces body-parser)
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---
app.use('/', indexRouter);

// --- Error Handling ---
// Catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// Final error handler
app.use(function(err, req, res, next) {
    // For Vercel/API, return JSON instead of rendering a view
    res.status(err.status || 500).json({
        error: {
            message: err.message,
            // Only expose stack trace in development mode
            stack: req.app.get('env') === 'development' ? err.stack : undefined
        }
    });
});

module.exports = app;