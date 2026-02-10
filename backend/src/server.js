const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Connect to database
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/careerforge');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        console.log('Running in generic mode without database connection.');
        // process.exit(1); // Do not exit, allow server to run for static demo purposes
    }
};

connectDB();

const app = express();

// Body parser (Exempt Stripe Webhook from JSON parsing to allow raw body access)
app.use((req, res, next) => {
    if (req.originalUrl === '/api/payment/webhook') {
        next();
    } else {
        express.json()(req, res, next);
    }
});


// Enable CORS
app.use(cors());

// Route files
const auth = require('./routes/auth');
const resumes = require('./routes/resumes');
const ai = require('./routes/ai');
const pdf = require('./routes/pdf');
const payment = require('./routes/payment');
const jobs = require('./routes/jobs');

// Mount routers
app.use('/api/auth', auth);
app.use('/api/resumes', resumes);
app.use('/api/ai', ai);
app.use('/api/pdf', pdf);
app.use('/api/payment', payment);
app.use('/api/jobs', jobs);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
