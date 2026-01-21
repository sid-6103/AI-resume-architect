const dotenv = require('dotenv');
const https = require('https');

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log('Fetching available models from Google AI REST API...');

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
                console.error('API Error:', parsed.error);
                return;
            }
            console.log('Available Models:');
            parsed.models.forEach(m => console.log(`- ${m.name}`));
        } catch (e) {
            console.error('Parsing Error:', e.message);
            console.log('Raw Data:', data);
        }
    });
}).on('error', (err) => {
    console.error('Request Error:', err.message);
});
