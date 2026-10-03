module.exports = {
  apps: [
    {
      name: 'kuickmart',
      script: './dist/server.cjs',
      cwd: '/var/www/kuickmart',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
