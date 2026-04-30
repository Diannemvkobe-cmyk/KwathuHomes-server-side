/*
Purpose
- Fills the database with a default Seller and a few sample properties.
- Lets developers and testers start with meaningful data immediately.

How It Works
- Loads environment variables, connects to MongoDB, then prepares data.
- Ensures there is at least one Seller account (creates one if missing).
- Clears any existing properties and inserts a small curated list.
- Exits the process automatically when seeding finishes or if it fails.

Where It Fits
- Run manually with: node seed.js (from the server-side folder).
*/
const mongoose = require('mongoose');
const Property = require('./models/Property');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI 

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Find or create a default seller
    let seller = await User.findOne({ role: 'Seller' });
    if (!seller) {
      console.log('No seller found, creating default seller...');
      seller = new User({
        name: 'Dianne Mvkobe',
        email: 'dianne@example.com',
        password: 'Password123!',
        role: 'Seller'
      });
      await seller.save();
      console.log('Created default seller for seeding.');
    }

    // Clear existing properties (optional, but good for starting fresh with real data)
    await Property.deleteMany({});
    console.log('Cleared existing properties.');

    const properties = [
      {
        title: "The Emerald Sky Villa",
        description: "A breathtaking five-bedroom villa nestled in the prestigious Leopard's Hill corridor. Boasting soaring ceilings, bespoke finishes, and panoramic garden views, this residence offers an unparalleled lifestyle for the discerning buyer.",
        price: "K18,500,000",
        location: "Lusaka, Leopard's Hill",
        coordinates: { type: 'Point', coordinates: [28.3228, -15.3875] },
        beds: 5,
        baths: 4,
        sqft: "4,200",
        tag: "Premium",
        type: "House",
        image: "/house-2.jfif",
        ownerName: seller.name,
        owner: seller._id
      },
      {
        title: "Crystal Vista Manor",
        description: "Positioned in the heart of Ndola, Crystal Vista Manor redefines urban luxury. Each of the four bedrooms is en-suite, and the open-plan living area flows seamlessly onto a sun-drenched terrace.",
        price: "K4,200,000",
        location: "Copperbelt, Ndola",
        coordinates: { type: 'Point', coordinates: [28.6366, -12.9906] },
        beds: 4,
        baths: 3,
        sqft: "3,100",
        tag: "Trending",
        type: "Apartment", // Model enum is 'Apartment' not 'Apartments'
        image: "/apartment-1.jfif",
        ownerName: seller.name,
        owner: seller._id
      },
      {
        title: "Urban Loft Center",
        description: "A sleek two-bedroom loft in the vibrant Central Business District. Floor-to-ceiling windows flood the space with natural light, while premium fixtures and a co-working lounge in the building keep professionals connected.",
        location: "Lusaka, Central",
        coordinates: { type: 'Point', coordinates: [28.2833, -15.4167] },
        price: "K18,500/mo",
        beds: 2,
        baths: 2,
        sqft: "1,200",
        tag: "For Rent",
        type: "Flats",
        image: "/flats.jfif",
        ownerName: seller.name,
        owner: seller._id
      }
    ];

    await Property.insertMany(properties);
    console.log('Seeded initial properties successfully!');
    process.exit();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedData();
