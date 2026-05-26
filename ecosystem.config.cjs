module.exports = {
  apps: [{
    name: 'mpw-rfq-api',
    script: './server.cjs',
    env: {
      PORT: 3001,
      NODE_ENV: 'production',
    },
    restart_delay: 3000,
    max_restarts: 10,
  }],
};
