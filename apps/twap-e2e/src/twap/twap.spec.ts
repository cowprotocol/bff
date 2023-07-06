import axios from 'axios';

describe('GET /', () => {
  it('should be healthy', async () => {
    const res = await axios.get(`/health-check`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ status: 'ok' });
  });
});
