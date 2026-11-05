#!/usr/bin/env bash
# One-time hardening and setup of a fresh Hostinger VPS (Ubuntu 24.04) for ADSIGN Skill Academy.
# Run as root:  bash deploy/vps/setup-server.sh academy.example.com admin@example.com
set -euo pipefail

DOMAIN="${1:?usage: setup-server.sh <domain> <letsencrypt-email>}"
EMAIL="${2:?usage: setup-server.sh <domain> <letsencrypt-email>}"
APP_USER=adsign
APP_DIR=/srv/adsign

echo "==> System updates"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw fail2ban unattended-upgrades nginx certbot python3-certbot-nginx postgresql postgresql-contrib ffmpeg rclone

echo "==> Automatic security updates"
dpkg-reconfigure -f noninteractive unattended-upgrades
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
CONF

echo "==> Firewall: only SSH, HTTP and HTTPS are reachable"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Brute-force protection for SSH"
cat >/etc/fail2ban/jail.local <<'CONF'
[sshd]
enabled = true
maxretry = 5
bantime = 1h
findtime = 10m
CONF
systemctl enable --now fail2ban

echo "==> SSH: keys only, no root password login"
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl reload ssh || systemctl reload sshd || true

echo "==> 2 GB swap (protects against out-of-memory during builds)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Node.js 22 and PM2"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pm2

echo "==> App user and folders"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "$APP_USER"
mkdir -p "$APP_DIR" /var/backups/adsign /var/log/adsign "$APP_DIR/uploads"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR" /var/backups/adsign /var/log/adsign

echo "==> PostgreSQL database (listens on localhost only)"
DB_PASS="$(openssl rand -hex 24)"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='adsign'" | grep -q 1 || sudo -u postgres psql -c "CREATE ROLE adsign LOGIN PASSWORD '$DB_PASS';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='adsign_lms'" | grep -q 1 || sudo -u postgres createdb -O adsign adsign_lms
echo "DATABASE_URL=postgresql://adsign:$DB_PASS@127.0.0.1:5432/adsign_lms" > /root/adsign-db-credentials.txt
chmod 600 /root/adsign-db-credentials.txt

echo "==> Nginx site"
sed "s/academy.example.com/$DOMAIN/g" "$(dirname "$0")/nginx.conf" > /etc/nginx/sites-available/adsign
ln -sf /etc/nginx/sites-available/adsign /etc/nginx/sites-enabled/adsign
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> HTTPS certificate (auto-renews)"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo "==> Backups: daily database, weekly uploads"
install -m 644 "$(dirname "$0")/adsign-cron" /etc/cron.d/adsign

cat <<DONE

Server ready.
  Database credentials: /root/adsign-db-credentials.txt (copy into $APP_DIR/.env)
  Next: follow docs/DEPLOYMENT-VPS.md from "Deploy the app".
DONE
