const redisClient = require('../utils/redis');

describe('redisClient', () => {
  beforeAll(async () => {
    await redisClient.connect();
  });

  afterAll(async () => {
    await redisClient.disconnect();
  });

  test('should set and get a key-value pair', async () => {
    await redisClient.set('testKey', 'testValue');
    const value = await redisClient.get('testKey');
    expect(value).toBe('testValue');
  });

  test('should delete a key', async () => {
    await redisClient.set('testKey', 'testValue');
    await redisClient.del('testKey');
    const value = await redisClient.get('testKey');
    expect(value).toBeNull();
  });
});
