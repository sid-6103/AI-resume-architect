const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './backend/.env' });

const fixIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        const list = await mongoose.connection.db.collection('users').indexes();
        console.log('Current Indexes:', list);

        try {
            await mongoose.connection.db.collection('users').dropIndex('userId_1');
            console.log('✅ Dropped problematic index: userId_1');
        } catch (e) {
            console.log('Index userId_1 not found or already dropped:', e.message);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

fixIndexes();
