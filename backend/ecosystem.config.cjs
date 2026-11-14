/**
 * pm2 settings for the live server (used by deploy.sh).
 *   kill_timeout: on restart, requests in flight get up to 8 s to finish (see server.js shutdown).
 *   max_memory_restart: a leak restarts the process instead of slowing the whole VPS.
 *   exp_backoff_restart_delay: a crash loop (e.g. database down) retries with growing pauses.
 */
module.exports = {
  apps: [
    {
      name: 'driver-finder',
      script: 'src/server.js',
      cwd: __dirname,
      time: true,
      kill_timeout: 8000,
      max_memory_restart: '800M',
      exp_backoff_restart_delay: 200,
    },
  ],
}
