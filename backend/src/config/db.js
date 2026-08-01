import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/waste2worth';

  console.log('Connecting to MongoDB...');
  console.log(`URI: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('\n❌ MongoDB connection failed.');
    console.error('   Make sure MongoDB is running (Compass se connect ho raha ho?).');
    console.error('   macOS: brew services start mongodb-community');
    console.error(`   Error: ${err.message}\n`);
    throw err;
  }
}
