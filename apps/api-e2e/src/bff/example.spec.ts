import axios from 'axios';

test('GET /example', async () => {
  const res = await axios.get('/example');

  expect(res.data).toEqual('this is an example');
});
