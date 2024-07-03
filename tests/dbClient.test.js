const dbClient = require('../utils/db');

describe('dbClient', () => {
  beforeAll(async () => {
    await dbClient.connect();
  });

  afterAll(async () => {
    await dbClient.disconnect();
  });

  test('should connect to the database', () => {
    expect(dbClient.db).toBeDefined();
  });

  test('should find a document in a collection', async () => {
    const usersCollection = dbClient.db.collection('users');
    const result = await usersCollection.findOne({});
    expect(result).not.toBeNull();
  });
});
