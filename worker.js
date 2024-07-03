const Bull = require('bull');
const { ObjectId } = require('mongodb');
const dbClient = require('./utils/db');
const imageThumbnail = require('image-thumbnail');
const fs = require('fs');
const path = require('path');

const fileQueue = new Bull('fileQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    return done(new Error('Missing fileId'));
  }

  if (!userId) {
    return done(new Error('Missing userId'));
  }

  try {
    const filesCollection = dbClient.db.collection('files');
    const file = await filesCollection.findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

    if (!file) {
      return done(new Error('File not found'));
    }

    const filePath = path.join('/path/to/files', file.localPath);  // Adjust the base path accordingly

    if (!fs.existsSync(filePath)) {
      return done(new Error('File not found'));
    }

    const sizes = [500, 250, 100];
    for (const size of sizes) {
      const options = { width: size };
      const thumbnail = await imageThumbnail(filePath, options);
      const thumbnailPath = `${filePath}_${size}`;

      fs.writeFileSync(thumbnailPath, thumbnail);
    }

    done();
  } catch (error) {
    done(error);
  }
});

// Create the queue for user jobs
const userQueue = new Bull('userQueue');

// Process the user queue
userQueue.process('sendWelcomeEmail', async (job) => {
  const { userId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  const userCollection = dbClient.db.collection('users');
  const user = await userCollection.findOne({ _id: userId });

  if (!user) {
    throw new Error('User not found');
  }

  // Simulate sending email
  console.log(`Welcome ${user.email}!`);
  // In a real application, you would use a third-party service like Mailgun to send the email
});

console.log('Worker is ready');
