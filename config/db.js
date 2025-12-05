const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const host = process.env.MONGODB_HOST;
    const port = process.env.MONGODB_PORT;
    const dbname = process.env.MONGODB_DBNAME;
    const user = process.env.MONGODB_USER;
    const pass = process.env.MONGODB_PASS;
    const options = process.env.MONGODB_OPTIONS || "";

    let uri = "";
    if (user && pass) {
      uri = `mongodb://${user}:${encodeURIComponent(
        pass
      )}@${host}:${port}/${dbname}${options}`;
    } else {
      uri = `mongodb://${host}:${port}/${dbname}${options}`;
    }

    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
