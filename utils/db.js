const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    // Retrieve connection details from environment variables or use default values
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.dbName = database;

    // Connect to MongoDB
    this.client.connect((err) => {
      if (err) {
        console.error('MongoDB connection error:', err);
      }
    });
  }

  // Check if the connection to MongoDB is alive
  isAlive() {
    return this.client.isConnected();
  }

  // Get the number of documents in the users collection
  async nbUsers() {
    try {
      const db = this.client.db(this.dbName);
      const collection = db.collection('users');
      return await collection.countDocuments();
    } catch (err) {
      console.error('Error getting number of users:', err);
      return 0;
    }
  }

  // Get the number of documents in the files collection
  async nbFiles() {
    try {
      const db = this.client.db(this.dbName);
      const collection = db.collection('files');
      return await collection.countDocuments();
    } catch (err) {
      console.error('Error getting number of files:', err);
      return 0;
    }
  }
}

// Create and export an instance of DBClient
const dbClient = new DBClient();
module.exports = dbClient;
