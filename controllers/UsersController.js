const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const userQueue = require('../queues/userQueue');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    
    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    }
    
    if (!password) {
      return res.status(400).send({ error: 'Missing password' });
    }
    
    // Check if the user already exists
    const userCollection = dbClient.db.collection('users');
    const userExists = await userCollection.findOne({ email });
    if (userExists) {
      return res.status(400).send({ error: 'Already exist' });
    }
    
    // Hash the password (in a real-world scenario)
    // const hashedPassword = await bcrypt.hash(password, 10);

    // Store user in the database
    const result = await userCollection.insertOne({ email, password }); // Store plain text password for simplicity
    const newUser = result.ops[0];

    // Add a job to the userQueue
    userQueue.add('sendWelcomeEmail', { userId: newUser._id });

    res.status(201).send({ id: newUser._id, email: newUser.email });
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userCollection = dbClient.db.collection('users');
    const user = await userCollection.findOne({ _id: dbClient.ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ id: user._id, email: user.email });
  }
}

module.exports = UsersController;
