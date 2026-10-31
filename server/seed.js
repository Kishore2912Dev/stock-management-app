/**
 * Seed Script — Creates initial admin user and sample items
 * Run with: node seed.js
 * WARNING: Run only once on a fresh database.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Item = require('./models/Item');

const SEED_ITEMS = [
  'Rajwadi',
  'Kalamkari',
  'Boota',
  'Leppet',
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists. Skipping seed.');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      status: 'active',
    });
    console.log('✅ Admin user created: username=admin, password=admin123');
    console.log('   ⚠️  IMPORTANT: Change the admin password immediately after first login!');

    // Create sample items
    for (const itemName of SEED_ITEMS) {
      await Item.create({
        itemName,
        createdBy: admin._id,
        status: 'active',
      });
      console.log(`✅ Item created: ${itemName}`);
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log('   Login with: username=admin, password=admin123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seedDatabase();
