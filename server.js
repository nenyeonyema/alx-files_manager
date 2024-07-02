const express = require('express');
const routes = require('./routes/index');

const app = express();

// Define the port from environment variable or default to 5000
const PORT = process.env.PORT || 5000;

// Load routes
app.use('/', routes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
