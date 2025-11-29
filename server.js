require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const port = process.env.PORT || 3000;

// Connect to Database
connectDB();

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

module.exports = server;
