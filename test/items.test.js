require('dotenv').config();
const request = require('supertest');
const chai = require('chai');
const expect = chai.expect;
const app = require('../app');
const mongoose = require('mongoose');
const Item = require('../models/Item');

describe('Items API Integration Tests', () => {
    before(async () => {
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
            
            await mongoose.connect(uri);
        }
    });

    after(async () => {
        // Clean up database after tests
        await Item.deleteMany({});
        // await mongoose.connection.close(); // Keep connection open for other tests if needed, or close it.
        // For this sample, we might want to keep it open or close it depending on how mocha runs.
        // Given other tests might run, let's just clean up.
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
