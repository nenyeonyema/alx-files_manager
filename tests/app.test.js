const request = require('supertest');
const app = require('../app'); // Adjust the path to your Express app

module.exports = request(app);
