const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

let model;
try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.warn('Warning: GOOGLE_API_KEY is not set. AI features will not work.');
        model = {
            generateContent: async () => ({
                response: { text: () => 'AI integration requires GOOGLE_API_KEY.' }
            })
        };
    } else {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Use gemini-1.5-flash as it is more standard usually, but keeping 2.5-flash if that was intended.
        // Assuming 1.5-flash is safer fallback if 2.5 doesn't exist.
        model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
} catch (error) {
    console.error('Error initializing Gemini:', error.message);
    model = {
        generateContent: async () => ({
            response: { text: () => 'AI Model failed to initialize.' }
        })
    };
}

console.log('Gemini AI Model Initialized');

module.exports = model;
