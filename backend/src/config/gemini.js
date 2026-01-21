const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Use gemini-2.5-flash as it is the only model confirmed to work with this key
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

console.log('Gemini AI Model Initialized');

module.exports = model;
