module.exports = {
  apps: [{
    name: 'phonecrm',
    script: 'npx',
    args: 'next dev -p 3000 --webpack',
    cwd: '/home/z/my-project',
    env: {
      NODE_OPTIONS: '--max-old-space-size=768'
    },
    watch: false,
    max_memory_restart: '500M',
    restart_delay: 3000,
    max_restarts: 100,
    exp_backoff_restart_delay: 100
  }]
};
