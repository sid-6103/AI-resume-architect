const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        // Note: The SDK doesn't expose listModels directly on the main class easily in all versions, 
        // but we can try to use a model that is very likely to exist or check accessibility.

        console.log('Testing connection to Gemini...');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("test");
        const response = await result.response;
        console.log('Gemini 1.5 Flash is working! Response:', response.text());
    } catch (err) {
        console.error('Error with Gemini 1.5 Flash:', err.message);

        try {
            console.log('Testing connection to Gemini Pro...');
            const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("test");
            const response = await result.response;
            console.log('Gemini Pro is working! Response:', response.text());
        } catch (err2) {
            console.error('Error with Gemini Pro:', err2.message);
        }
    }
}

listModels();
