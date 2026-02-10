const mongoose = require('mongoose');
const dotenv = require('dotenv');

// We run this from backend folder
dotenv.config();

const fixIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        const collection = mongoose.connection.db.collection('users');
        const indexes = await collection.indexes();
        console.log('Current Indexes:', indexes.map(i => i.name));

        // Attempt to drop problematic index
        try {
            await collection.dropIndex('userId_1');
            console.log('✅ Dropped problematic index: userId_1');
        } catch (e) {
            console.log('⚠️ Could not drop userId_1:', e.message);
        }

        // Also check if email index is unique (it should be)
        try {
            await collection.dropIndex('email_1');
            console.log('✅ Dropped email_1 to recreate it properly via schema if needed');
        } catch (e) {
            console.log('⚠️ Could not drop email_1:', e.message);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

fixIndexes();
