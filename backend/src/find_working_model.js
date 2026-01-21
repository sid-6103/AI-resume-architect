const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const https = require('https');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

function getModels() {
    return new Promise((resolve, reject) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) reject(parsed.error);
                    else resolve(parsed.models.map(m => m.name.replace('models/', '')));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function testModel(modelName) {
    try {
        console.log(`Testing ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log(`✅ SUCCESS: ${modelName} responded: ${response.text().substring(0, 20)}...`);
        return true;
    } catch (err) {
        console.log(`❌ FAILED: ${modelName} - ${err.message.split('[')[0]}`); // simplify log
        if (err.message.includes('429')) console.log('   -> Quota Exceeded (Limit: 0 implies no free tier access)');
        return false;
    }
}

async function run() {
    try {
        console.log("Fetching available models...");
        const models = await getModels();
        console.log(`Found ${models.length} models. Testing candidates...`);

        const candidates = models.filter(m => m.includes('flash') || m.includes('pro'));

        for (const m of candidates) {
            const success = await testModel(m);
            if (success) {
                console.log(`\n🎉 FOUND WORKING MODEL: ${m}`);
                console.log(`PLEASE UPDATE src/config/gemini.js TO USE: '${m}'`);
                process.exit(0);
            }
        }
        console.log("\n😭 NO WORKING MODELS FOUND. CHECK BILLING/REGION.");
    } catch (e) {
        console.error("Critical Error:", e);
    }
}

run();
