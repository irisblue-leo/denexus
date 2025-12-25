module.exports = {
  apps: [
    {
      name: "denexus-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/var/www/denexus/web",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/pm2/denexus-web-error.log",
      out_file: "/var/log/pm2/denexus-web-out.log",
      merge_logs: true,
      // Restart delay
      restart_delay: 4000,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Health check
      min_uptime: "10s",
      max_restarts: 10,
    },
  ],
};
