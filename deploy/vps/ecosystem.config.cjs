// PM2 process file: keeps the API and website running and restarts them after a crash or reboot.
// Start:  pm2 start deploy/vps/ecosystem.config.cjs && pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: 'adsign-api',
      cwd: '/srv/adsign/apps/api',
      script: 'dist/index.js',
      node_args: '--env-file=/srv/adsign/.env',
      env: { NODE_ENV: 'production', PORT: 5000 },
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '700M',
      out_file: '/var/log/adsign/api.out.log',
      error_file: '/var/log/adsign/api.err.log',
    },
    {
      name: 'adsign-web',
      cwd: '/srv/adsign/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      node_args: '--env-file=/srv/adsign/.env',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '900M',
      out_file: '/var/log/adsign/web.out.log',
      error_file: '/var/log/adsign/web.err.log',
    },
  ],
};
