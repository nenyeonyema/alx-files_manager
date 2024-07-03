const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const filesCollection = dbClient.db.collection('files');

    // Validate parentId if provided
    if (parentId !== 0) {
      const parentFile = await filesCollection.findOne({ _id: dbClient.ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (type === 'folder') {
      // Create a new folder document
      const newFolder = {
        userId,
        name,
        type,
        isPublic,
        parentId,
      };
      const result = await filesCollection.insertOne(newFolder);
      return res.status(201).json({ id: result.insertedId, ...newFolder });
    } else {
      // Prepare the storage path
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const localPath = path.join(folderPath, uuidv4());
      const buffer = Buffer.from(data, 'base64');
      fs.writeFileSync(localPath, buffer);

      // Create a new file or image document
      const newFile = {
        userId,
        name,
        type,
        isPublic,
        parentId,
        localPath,
      };
      const result = await filesCollection.insertOne(newFile);
      return res.status(201).json({ id: result.insertedId, ...newFile });
    }
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    if (!ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const filesCollection = dbClient.db.collection('files');
    const file = await filesCollection.findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId = '0', page = 0 } = req.query;

    const filesCollection = dbClient.db.collection('files');
    const query = { userId: new ObjectId(userId), parentId };
    const options = {
      limit: 20,
      skip: 20 * page,
    };

    const files = await filesCollection.find(query, options).toArray();
    const response = files.map(file => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    }));

    return res.status(200).json(response);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    if (!ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const filesCollection = dbClient.db.collection('files');
    const file = await filesCollection.findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await filesCollection.updateOne({ _id: new ObjectId(fileId) }, { $set: { isPublic: true } });

    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId: file.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    if (!ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const filesCollection = dbClient.db.collection('files');
    const file = await filesCollection.findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await filesCollection.updateOne({ _id: new ObjectId(fileId) }, { $set: { isPublic: false } });

    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: false,
      parentId: file.parentId,
    });
  }

  static async getFile(req, res) {
    try {
      const fileId = req.params.id;
      if (!ObjectId.isValid(fileId)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const filesCollection = dbClient.db.collection('files');
      const file = await filesCollection.findOne({ _id: new ObjectId(fileId) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Check if the file is a folder
      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      // Retrieve the user ID from the token if provided
      const token = req.headers['x-token'];
      let userId = null;
      if (token) {
        userId = await redisClient.get(`auth_${token}`);
      }

      // Check file permissions
      if (!file.isPublic) {
        if (!userId || userId !== file.userId.toString()) {
          return res.status(404).json({ error: 'Not found' });
        }
      }

      // Construct the file path
      const filePath = path.join('/path/to/files', file.localPath);  // Adjust the base path accordingly

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Get MIME type and send file content
      const mimeType = mime.lookup(file.name);
      res.setHeader('Content-Type', mimeType);
      const fileContent = fs.readFileSync(filePath);
      res.status(200).send(fileContent);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = FilesController;
