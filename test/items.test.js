require('dotenv').config();
const request = require('supertest');
const chai = require('chai');
const expect = chai.expect;
const app = require('../app');
const mongoose = require('mongoose');
const Item = require('../models/Item');

// Check if MongoDB credentials are available
const hasMongoCredentials = () => {
    const user = process.env.MONGODB_USER;
    const pass = process.env.MONGODB_PASS;
    return (user && pass) || process.env.MONGODB_HOST === 'localhost';
};

(hasMongoCredentials() ? describe : describe.skip)('Items API Integration Tests', () => {
    before(async function() {
        this.timeout(30000); // Increase timeout to 30 seconds for MongoDB connection
        
        // Connect to a test database or ensure connection is open
        if (mongoose.connection.readyState === 0) {
            const user = process.env.MONGODB_USER;
            const pass = process.env.MONGODB_PASS;
            
            let uri = "";
            
            if (user && pass) {
                // Use MongoDB Atlas connection string format
                const atlasCluster = process.env.MONGODB_ATLAS_CLUSTER || "testdb.bhlsic4.mongodb.net";
                const appName = process.env.MONGODB_APP_NAME || "testDB";
                uri = `mongodb+srv://${user}:${encodeURIComponent(pass)}@${atlasCluster}/?appName=${appName}`;
            } else {
                // Fallback to local MongoDB if no credentials provided
                const host = process.env.MONGODB_HOST || "localhost";
                const port = process.env.MONGODB_PORT || "27017";
                const dbname = process.env.MONGODB_DBNAME || "test";
                uri = `mongodb://${host}:${port}/${dbname}`;
            }
            
            try {
                console.log('Attempting to connect to MongoDB...');
                await mongoose.connect(uri, {
                    serverSelectionTimeoutMS: 20000, // 20 seconds timeout for initial connection
                    socketTimeoutMS: 45000, // 45 seconds for socket operations
                });
                console.log('MongoDB connected successfully for tests');
            } catch (error) {
                console.error('Failed to connect to MongoDB:', error.message);
                console.log('Skipping MongoDB tests due to connection failure');
                this.skip(); // Skip this test suite if connection fails
            }
        }
    });

    after(async function() {
        this.timeout(30000); // Increase timeout for cleanup
        
        // Clean up database after tests
        try {
            if (mongoose.connection.readyState === 1) {
                await Item.deleteMany({});
                await mongoose.connection.close();
                console.log('MongoDB connection closed');
            }
        } catch (error) {
            console.error('Error during cleanup:', error.message);
        }
    });

    beforeEach(async () => {
        await Item.deleteMany({});
    });

    describe('GET /api/items', () => {
        it('should return an empty array when no items exist', async () => {
            const res = await request(app).get('/api/items');
            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(0);
        });

        it('should return a list of items', async () => {
            await Item.create({ name: 'Test Item 1' });
            await Item.create({ name: 'Test Item 2' });

            const res = await request(app).get('/api/items');
            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(2);
        });
    });

    describe('POST /api/items', () => {
        it('should create a new item', async () => {
            const newItem = { name: 'New Item', description: 'Description' };
            const res = await request(app).post('/api/items').send(newItem);

            expect(res.status).to.equal(201);
            expect(res.body).to.have.property('name', 'New Item');
            expect(res.body).to.have.property('description', 'Description');

            const items = await Item.find();
            expect(items.length).to.equal(1);
        });

        it('should fail if name is missing', async () => {
            const newItem = { description: 'Description' };
            const res = await request(app).post('/api/items').send(newItem);

            expect(res.status).to.equal(400);
        });
    });
});
