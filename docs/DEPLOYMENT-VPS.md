# Deploying ADSIGN Skill Academy on a Hostinger VPS

This guide takes a fresh Hostinger VPS (KVM 4 or larger, Ubuntu 24.04) to a live, HTTPS-secured
academy with daily off-server backups. Allow about two hours. Commands run as `root` unless noted.

## What you need first

| Item | Where |
|---|---|
| VPS with Ubuntu 24.04 and your SSH key | Hostinger hPanel → VPS |
| Domain with an `A` record pointing to the VPS IP | Your domain registrar / Hostinger DNS |
| Razorpay live API keys and a webhook secret | Razorpay Dashboard → Account & Settings |
| SMS gateway (MSG91) with DLT sender ID and OTP template | MSG91 + DLT portal |
| SMTP mailbox for emails | Hostinger Email, Zoho, Brevo or Amazon SES |
| Off-server backup storage (e.g. Backblaze B2, ~₹150/month for 100 GB) | Any rclone-supported storage |

## 1. Harden the server (one time)

```bash
git clone <repo-url> /srv/adsign
cd /srv/adsign
bash deploy/vps/setup-server.sh academy.example.com you@example.com
```

`setup-server.sh` does the following:

- **Security updates:** installs updates and turns on automatic security updates.
- **Firewall:** the firewall (UFW) allows only SSH, HTTP and HTTPS. The database is never reachable from the internet.
- **SSH:** blocks repeated SSH login attempts (fail2ban), switches to key-only SSH and disables root password login.
- **Software:** installs Node.js 22, PM2, Nginx, PostgreSQL 16, ffmpeg and rclone.
- **Database:** creates the `adsign` database user and the `adsign_lms` database. The generated password is in `/root/adsign-db-credentials.txt`.
- **Nginx:** configures [`deploy/vps/nginx.conf`](../deploy/vps/nginx.conf) with security headers, rate limits on sign-in and OTP, and a referrer-locked video folder.
- **HTTPS:** gets a free Let's Encrypt certificate that renews automatically.
- **Backups:** installs the backup schedule from [`deploy/vps/adsign-cron`](../deploy/vps/adsign-cron).

## 2. Configure the app

```bash
cp deploy/vps/env.production.example /srv/adsign/.env
chmod 600 /srv/adsign/.env
nano /srv/adsign/.env     # fill in every value; generate secrets with: openssl rand -hex 32
chown -R adsign:adsign /srv/adsign
```

Important settings:

- `OTP_DEMO_MODE=false`: codes are only sent by SMS or email, never shown on screen.
- `CLIENT_URL` and `NEXT_PUBLIC_SITE_URL`: your real domain. They are used for the video domain lock, emails, invoices and SEO.
- `INVOICE_GSTIN`, `INVOICE_STATE`, `INVOICE_ADDRESS`: printed on every GST invoice.

## 3. Deploy the app

```bash
sudo -iu adsign
cd /srv/adsign
npm ci
npm run build:shared
cd apps/api && npx prisma migrate deploy || npx prisma db push && cd ../..
npm run build --workspace=apps/api
npm run build --workspace=apps/web
pm2 start deploy/vps/ecosystem.config.cjs && pm2 save
exit
pm2 startup systemd -u adsign --hp /home/adsign   # run the printed command as root
```

For a demo-style start with sample data, run `npm run db:seed` once. Skip it for a clean
production launch and create the first main admin from the console instead.

## 4. Razorpay

1. In Razorpay, go to Settings → Webhooks, add `https://academy.example.com/api/v1/webhooks/razorpay`, and select
   `payment.captured`, `order.paid`, `payment.failed` and `refund.processed`. Use the same secret as `RAZORPAY_WEBHOOK_SECRET`.
2. Put the live `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`, then run `pm2 restart all`.
3. Checkout opens Razorpay automatically once keys are present; the demo gateway is switched off.

## 5. Videos

Upload course videos as MP4 (H.264 + AAC, 720p recommended). Package them as encrypted HLS:

```bash
python3 scripts/demo-media/build_hls.py      # writes apps/web/public/media/hls/... and the keys file
```

For production content, generate keys at upload time and store them only in the database
(`Lesson.hlsKeyHex`). Never commit real video keys to Git. Nginx serves the encrypted segments; the
API serves the playlist and key only to signed-in, enrolled students on your domain.

When usage grows (100–150 viewers at the same time, more than about 60% of the monthly bandwidth,
or a confirmed leak), move the videos to Bunny Stream or VdoCipher. Only the video URLs change.

## 6. Backups and restore

- **Daily, 02:30 IST:** a compressed database dump, see [`scripts/backup/backup.sh`](../scripts/backup/backup.sh).
- **Weekly, Sunday:** uploaded files (assignments, materials).
- **Monthly, on the 1st:** [`scripts/backup/test-restore.sh`](../scripts/backup/test-restore.sh) loads the latest dump into a throw-away database and checks it.
- **Retention:** 30 days, kept both on the server and in the off-server storage (`BACKUP_REMOTE`).

Set up off-server storage once:

```bash
sudo -iu adsign rclone config        # create e.g. a "b2" remote
echo 'BACKUP_REMOTE=b2:adsign-backups' >> /srv/adsign/.env
sudo -iu adsign /srv/adsign/scripts/backup/backup.sh db   # first backup, check the log
```

Restore (target: under 4 hours from a failure to a working site):

```bash
# 1. Get the dump (skip if it is still on the server)
rclone copy b2:adsign-backups/db/<file>.dump /var/backups/adsign/db/
# 2. Restore the database (asks you to type RESTORE)
sudo -iu adsign /srv/adsign/scripts/backup/restore.sh db latest
# 3. Restore uploaded files
sudo -iu adsign /srv/adsign/scripts/backup/restore.sh files latest
pm2 restart all
```

Backup activity is logged in `/var/log/adsign/backup.log`.

## 7. Updating

```bash
sudo -iu adsign
cd /srv/adsign && git pull && npm ci && npm run build:shared
cd apps/api && npx prisma db push && cd ../..
npm run build --workspace=apps/api && npm run build --workspace=apps/web
pm2 reload all      # reloads without downtime
```

Always take a fresh backup (`scripts/backup/backup.sh db`) before an update.
