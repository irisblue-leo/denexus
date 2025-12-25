#!/bin/bash

# Denexus Web Deployment Script
# Usage: ./deploy.sh

set -e

echo "=========================================="
echo "  Denexus Web Deployment Script"
echo "=========================================="

# Configuration
APP_DIR="/var/www/denexus/web"
REPO_URL="your-git-repo-url"
BRANCH="main"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root or with sudo"
    exit 1
fi

# Create necessary directories
log_info "Creating directories..."
mkdir -p $APP_DIR
mkdir -p /var/log/pm2
mkdir -p /var/www/certbot

# Navigate to app directory
cd $APP_DIR

# Pull latest code (if git repo exists)
if [ -d ".git" ]; then
    log_info "Pulling latest code..."
    git fetch origin
    git reset --hard origin/$BRANCH
else
    log_warn "Not a git repository. Please clone your repo first:"
    log_warn "git clone $REPO_URL $APP_DIR"
fi

# Install dependencies
log_info "Installing dependencies..."
pnpm install --frozen-lockfile

# Build the application
log_info "Building application..."
pnpm build

# Setup PM2
log_info "Setting up PM2..."
pm2 delete denexus-web 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Setup Nginx (if not already done)
if [ ! -f "/etc/nginx/sites-available/denexus" ]; then
    log_info "Setting up Nginx..."
    cp nginx.conf /etc/nginx/sites-available/denexus
    ln -sf /etc/nginx/sites-available/denexus /etc/nginx/sites-enabled/

    log_warn "Please update /etc/nginx/sites-available/denexus with your domain name"
    log_warn "Then run: nginx -t && systemctl reload nginx"
else
    log_info "Nginx config already exists"
fi

# Test Nginx configuration
log_info "Testing Nginx configuration..."
nginx -t

# Reload Nginx
log_info "Reloading Nginx..."
systemctl reload nginx

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update /etc/nginx/sites-available/denexus with your domain"
echo "2. Setup SSL with: certbot --nginx -d your-domain.com"
echo "3. Create .env.local with your environment variables"
echo "4. Run: pm2 restart denexus-web"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check app status"
echo "  pm2 logs denexus-web    - View logs"
echo "  pm2 restart denexus-web - Restart app"
echo "  pm2 monit               - Monitor resources"
echo ""
