#!/bin/bash

# Denexus Web Deployment Script
# Usage: ./deploy.sh [first|update|restart|status|logs]

set -e

# Configuration
APP_NAME="denexus-web"
APP_DIR="/var/www/denexus/web"
BRANCH="main"
NODE_VERSION="18"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root or with sudo"
        exit 1
    fi
}

# Check required commands
check_requirements() {
    log_step "Checking requirements..."

    local missing=()

    command -v node >/dev/null 2>&1 || missing+=("node")
    command -v pnpm >/dev/null 2>&1 || missing+=("pnpm")
    command -v pm2 >/dev/null 2>&1 || missing+=("pm2")
    command -v nginx >/dev/null 2>&1 || missing+=("nginx")

    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required commands: ${missing[*]}"
        echo ""
        echo "Install missing dependencies:"
        echo "  Node.js: curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - && apt-get install -y nodejs"
        echo "  pnpm: npm install -g pnpm"
        echo "  PM2: npm install -g pm2"
        echo "  Nginx: apt-get install -y nginx"
        exit 1
    fi

    log_info "All requirements satisfied"
}

# Create necessary directories
create_directories() {
    log_step "Creating directories..."
    mkdir -p $APP_DIR
    mkdir -p /var/log/pm2
    mkdir -p /var/log/nginx
}

# Setup environment file
setup_env() {
    log_step "Setting up environment..."

    if [ ! -f "$APP_DIR/.env.local" ]; then
        if [ -f "$APP_DIR/.env.production.example" ]; then
            cp "$APP_DIR/.env.production.example" "$APP_DIR/.env.local"
            log_warn "Created .env.local from template. Please edit it with your values:"
            log_warn "  nano $APP_DIR/.env.local"
        else
            log_warn ".env.local not found. Please create it manually."
        fi
    else
        log_info ".env.local already exists"
    fi
}

# Setup SSL certificates
setup_ssl() {
    log_step "Setting up SSL certificates..."

    local ssl_dir="/var/www/denexus/web"

    if [ -f "$APP_DIR/denexus.art.pem" ] && [ -f "$APP_DIR/denexus.art.key" ]; then
        log_info "SSL certificates found"

        # Set proper permissions
        chmod 644 "$APP_DIR/denexus.art.pem"
        chmod 600 "$APP_DIR/denexus.art.key"

        log_info "SSL certificate permissions set"
    else
        log_warn "SSL certificates not found at:"
        log_warn "  $APP_DIR/denexus.art.pem"
        log_warn "  $APP_DIR/denexus.art.key"
        log_warn "Please add your SSL certificates before enabling HTTPS"
    fi
}

# Install dependencies
install_deps() {
    log_step "Installing dependencies..."
    cd $APP_DIR
    pnpm install --frozen-lockfile
    log_info "Dependencies installed"
}

# Build application
build_app() {
    log_step "Building application..."
    cd $APP_DIR
    pnpm build
    log_info "Build complete"
}

# Setup PM2
setup_pm2() {
    log_step "Setting up PM2..."
    cd $APP_DIR

    # Stop existing process if running
    pm2 delete $APP_NAME 2>/dev/null || true

    # Start with ecosystem config
    pm2 start ecosystem.config.js --env production

    # Save PM2 process list
    pm2 save

    # Setup PM2 to start on boot
    pm2 startup systemd -u root --hp /root 2>/dev/null || true

    log_info "PM2 configured"
}

# Setup Nginx
setup_nginx() {
    log_step "Setting up Nginx..."

    local nginx_available="/etc/nginx/sites-available/denexus"
    local nginx_enabled="/etc/nginx/sites-enabled/denexus"

    # Copy nginx config
    cp "$APP_DIR/nginx.conf" "$nginx_available"

    # Enable site
    ln -sf "$nginx_available" "$nginx_enabled"

    # Remove default site if exists
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

    # Test nginx configuration
    log_info "Testing Nginx configuration..."
    if nginx -t; then
        log_info "Nginx configuration valid"

        # Reload nginx
        systemctl reload nginx
        log_info "Nginx reloaded"
    else
        log_error "Nginx configuration invalid. Please check the config."
        exit 1
    fi
}

# Health check
health_check() {
    log_step "Running health check..."

    sleep 3

    # Check PM2 process
    if pm2 list | grep -q "$APP_NAME"; then
        log_info "PM2 process is running"
    else
        log_error "PM2 process is not running"
        return 1
    fi

    # Check if port 3000 is listening
    if netstat -tlnp 2>/dev/null | grep -q ":3000" || ss -tlnp | grep -q ":3000"; then
        log_info "Application is listening on port 3000"
    else
        log_warn "Application may not be listening on port 3000 yet"
    fi

    # Check HTTP response
    sleep 2
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
    if [ "$response" = "200" ] || [ "$response" = "307" ] || [ "$response" = "302" ]; then
        log_info "HTTP health check passed (status: $response)"
    else
        log_warn "HTTP health check returned status: $response"
    fi
}

# Show status
show_status() {
    echo ""
    echo "=========================================="
    echo "  Application Status"
    echo "=========================================="
    echo ""
    pm2 status
    echo ""
    echo "Nginx status:"
    systemctl status nginx --no-pager -l | head -5
    echo ""
}

# Show logs
show_logs() {
    pm2 logs $APP_NAME --lines 50
}

# First time deployment
first_deploy() {
    echo "=========================================="
    echo "  Denexus Web - First Deployment"
    echo "=========================================="
    echo ""

    check_root
    check_requirements
    create_directories

    # Check if code exists
    if [ ! -f "$APP_DIR/package.json" ]; then
        log_error "Application code not found at $APP_DIR"
        log_error "Please copy your code to $APP_DIR first"
        exit 1
    fi

    setup_env
    setup_ssl
    install_deps
    build_app
    setup_pm2
    setup_nginx
    health_check

    echo ""
    echo "=========================================="
    echo "  First Deployment Complete!"
    echo "=========================================="
    echo ""
    echo "Your application should now be running at:"
    echo "  http://localhost:3000"
    echo "  https://denexus.art (after DNS setup)"
    echo ""
    echo "Important next steps:"
    echo "  1. Edit .env.local with your actual values"
    echo "  2. Configure DNS to point to this server"
    echo "  3. Restart: pm2 restart $APP_NAME"
    echo ""
}

# Update deployment
update_deploy() {
    echo "=========================================="
    echo "  Denexus Web - Update Deployment"
    echo "=========================================="
    echo ""

    check_root
    cd $APP_DIR

    # Pull latest code if git repo
    if [ -d ".git" ]; then
        log_step "Pulling latest code..."
        git fetch origin
        git reset --hard origin/$BRANCH
    fi

    install_deps
    build_app

    log_step "Restarting application..."
    pm2 restart $APP_NAME

    health_check

    echo ""
    echo "=========================================="
    echo "  Update Complete!"
    echo "=========================================="
    echo ""
}

# Restart application
restart_app() {
    log_step "Restarting application..."
    pm2 restart $APP_NAME
    health_check
    log_info "Restart complete"
}

# Show help
show_help() {
    echo "Denexus Web Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  first    - First time deployment (setup everything)"
    echo "  update   - Update deployment (pull, build, restart)"
    echo "  restart  - Restart the application"
    echo "  status   - Show application status"
    echo "  logs     - Show application logs"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh first   # First time setup"
    echo "  ./deploy.sh update  # Update to latest code"
    echo "  ./deploy.sh restart # Quick restart"
    echo ""
}

# Main
case "${1:-help}" in
    first)
        first_deploy
        ;;
    update)
        update_deploy
        ;;
    restart)
        check_root
        restart_app
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
