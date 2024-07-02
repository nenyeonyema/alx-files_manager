const express = require('express');
const AppController = require('../controllers/AppController');

const router = express.Router();

// Define routes and map them to controller methods
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

module.exports = router;
