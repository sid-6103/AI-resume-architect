const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// ============================================
// DATABASE CONNECTION
// ============================================
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/careerforge');
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`❌ Database Error: ${err.message}`);
        console.log('Running in demo mode without database connection.');
    }
};

connectDB();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Stripe webhook needs raw body — MUST come before express.json()
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Static files for PDF downloads
app.use('/pdfs', express.static(path.join(__dirname, '../pdfs')));

// ============================================
// ROUTE FILES
// ============================================
const resumes = require('./routes/resumes');
const ai = require('./routes/ai');
const auth = require('./routes/auth');
const pdf = require('./routes/pdf');
const subscription = require('./routes/subscription');
const coverLetter = require('./routes/coverLetter');
const dashboard = require('./routes/dashboard');

// ============================================
// MOUNT ROUTERS
// ============================================
app.use('/api/resumes', resumes);
app.use('/api/ai', ai);
app.use('/api/auth', auth);
app.use('/api/resume', pdf);
app.use('/api/subscription', subscription);
app.use('/api/cover-letter', coverLetter);
app.use('/api/dashboard', dashboard);

// ============================================
// SERVE FRONTEND (Static)
// ============================================
app.use(express.static(path.join(__dirname, '../../frontend')));

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'CareerForge Pro API is running',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

// Catch-all: serve frontend
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║     🚀 CareerForge Pro - API Server v2.0        ║
║     Mode: ${(process.env.NODE_ENV || 'development').padEnd(38)}║
║     Port: ${String(PORT).padEnd(38)}║
║     PDF:  /api/resume/generate-pdf               ║
║     Auth: /api/auth/register | /login            ║
║     Sub:  /api/subscription/*                    ║
╚══════════════════════════════════════════════════╝
    `);
});
