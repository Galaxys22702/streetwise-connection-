const path = require('node:path');
module.exports = { apps: [{
  name: 'streetwise-edge-api',
  cwd: path.resolve(__dirname,'../api'),
  script: 'server.mjs',
  node_args: '--env-file=/etc/streetwise/api.env',
  instances: 1,
  exec_mode: 'fork',
  autorestart: true,
  min_uptime: '10s',
  max_restarts: 5
}] };
