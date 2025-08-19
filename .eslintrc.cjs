module.exports = {
  env: { node: true, es2022: true },
  rules: {
    'no-restricted-imports': ['error',
      { 'name': 'http', 'message': 'No network in runtime' },
      { 'name': 'https', 'message': 'No network in runtime' },
      { 'name': 'node-fetch', 'message': 'No network in runtime' },
      { 'name': 'axios', 'message': 'No network in runtime' },
      { 'name': 'fetch', 'message': 'No network in runtime' },
      { 'name': 'ws', 'message': 'No network in runtime' },
      { 'name': 'net', 'message': 'No network in runtime' },
      { 'name': 'dgram', 'message': 'No network in runtime' },
      { 'name': 'dns', 'message': 'No network in runtime' },
      { 'name': 'tls', 'message': 'No network in runtime' }
    ],
    'no-restricted-globals': ['error', 'fetch', 'WebSocket']
  }
};
