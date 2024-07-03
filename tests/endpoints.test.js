const request = require('./app.test');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

describe('API Endpoints', () => {
  beforeAll(async () => {
    await redisClient.connect();
    await dbClient.connect();
  });

  afterAll(async () => {
    await redisClient.disconnect();
    await dbClient.disconnect();
  });

  // GET /status
  test('GET /status', async () => {
    const res = await request.get('/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('redis');
    expect(res.body).toHaveProperty('db');
  });

  // GET /stats
  test('GET /stats', async () => {
    const res = await request.get('/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('files');
  });

  // POST /users
  test('POST /users', async () => {
    const res = await request.post('/users').send({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email');
  });

  // GET /connect
  test('GET /connect', async () => {
    const res = await request.get('/connect')
      .set('Authorization', 'Basic dGVzdEBleGFtcGxlLmNvbTpwYXNzd29yZDEyMw=='); // base64 of test@example.com:password123
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  // GET /disconnect
  test('GET /disconnect', async () => {
    const token = await getToken();
    const res = await request.get('/disconnect').set('X-Token', token);
    expect(res.status).toBe(204);
  });

  // GET /users/me
  test('GET /users/me', async () => {
    const token = await getToken();
    const res = await request.get('/users/me').set('X-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email');
  });

  // POST /files
  test('POST /files', async () => {
    const token = await getToken();
    const res = await request.post('/files')
      .set('X-Token', token)
      .send({
        name: 'testfile.txt',
        type: 'file',
        isPublic: false,
        parentId: 0,
        data: 'SGVsbG8gd29ybGQ=' // Base64 of "Hello world"
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  // GET /files/:id
  test('GET /files/:id', async () => {
    const token = await getToken();
    const file = await uploadTestFile(token);
    const res = await request.get(`/files/${file.id}`).set('X-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', file.id);
  });

  // GET /files
  test('GET /files', async () => {
    const token = await getToken();
    const res = await request.get('/files').set('X-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  // GET /files with pagination
  test('GET /files with pagination', async () => {
    const token = await getToken();
    const res = await request.get('/files?page=1').set('X-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  // PUT /files/:id/publish
  test('PUT /files/:id/publish', async () => {
    const token = await getToken();
    const file = await uploadTestFile(token);
    const res = await request.put(`/files/${file.id}/publish`).set('X-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isPublic', true);
  });

  // PUT /files/:id/unpublish
  test('PUT /files/:id/unpublish', async () => {
    const token = await getToken();
    const file = await uploadTestFile(token);
    const res = await request.put(`/files/${file.id}/unpublish`).set('X-Token', token);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isPublic', false);
  });

  // GET /files/:id/data
  test('GET /files/:id/data', async () => {
    const token = await getToken();
    const file = await uploadTestFile(token);
    const res = await request.get(`/files/${file.id}/data`).set('X-Token', token);
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/plain');
    expect(res.text).toBe('Hello world');
  });

  // GET /files/:id/data with size
  test('GET /files/:id/data with size', async () => {
    const token = await getToken();
    const file = await uploadTestFile(token);
    await request.put(`/files/${file.id}/publish`).set('X-Token', token); // Publish file to allow access without token
    const res = await request.get(`/files/${file.id}/data?size=100`);
    expect(res.status).toBe(200);
  });
});

// Helper function to get token
async function getToken() {
  const res = await request.get('/connect')
    .set('Authorization', 'Basic dGVzdEBleGFtcGxlLmNvbTpwYXNzd29yZDEyMw==');
  return res.body.token;
}

// Helper function to upload test file
async function uploadTestFile(token) {
  const res = await request.post('/files')
    .set('X-Token', token)
    .send({
      name: 'testfile.txt',
      type: 'file',
      isPublic: false,
      parentId: 0,
      data: 'SGVsbG8gd29ybGQ=' // Base64 of "Hello world"
    });
  return res.body;
}
