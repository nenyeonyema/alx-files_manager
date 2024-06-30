const redis = require('redis');

class RedisClient {
  constructor() {
    // Create the Redis client
    this.client = redis.createClient();

    // Log any connection errors
    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
    });
  }

  // Check if the connection to Redis is alive
  isAlive() {
    return this.client.connected;
  }

  // Get the value of a key from Redis
  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, value) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  }

  // Set a key-value pair in Redis with an expiration time
  async set(key, value, duration) {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, 'EX', duration, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  // Delete a key from Redis
  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }
}

// Create and export an instance of RedisClient
const redisClient = new RedisClient();
module.exports = redisClient;
