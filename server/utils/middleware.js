const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const express = require('express');
const handle404 = (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
}

function loadPrefixMiddleware(app) {
    // Security & performance middleware
    app.use(helmet());
    app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.'
    });
    // Apply only to sensitive routes
    app.use(['/api/auth', '/api/analytics'], limiter);

    // CORS configuration (env-driven)
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''))
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    app.use(cors({
        origin: allowedOrigins.length ? allowedOrigins : ['http://localhost:3000'],
        credentials: true
    }));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
}

function load404Handler(app) {
    // 404 handler
    app.use('/api/*', handle404);
}

function loadErrorHandler(app) {
    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({
            error: 'Something went wrong!',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        });
    });
}

module.exports = { loadPrefixMiddleware, load404Handler, loadErrorHandler }