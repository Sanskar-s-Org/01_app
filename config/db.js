const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const user = process.env.MONGODB_USER;
    const pass = process.env.MONGODB_PASS;
    
    // MongoDB Atlas connection string
    const atlasCluster = process.env.MONGODB_ATLAS_CLUSTER || "testdb.bhlsic4.mongodb.net";
    const appName = process.env.MONGODB_APP_NAME || "testDB";
    
    let uri = "";
    
    if (user && pass) {
      // Use MongoDB Atlas connection string format
      uri = `mongodb+srv://${user}:${encodeURIComponent(pass)}@${atlasCluster}/?appName=${appName}`;
    } else {
      // Fallback to local MongoDB if no credentials provided
      const host = process.env.MONGODB_HOST || "localhost";
      const port = process.env.MONGODB_PORT || "27017";
      const dbname = process.env.MONGODB_DBNAME || "test";
      uri = `mongodb://${host}:${port}/${dbname}`;
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
