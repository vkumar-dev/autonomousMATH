#!/bin/bash

# Ralph Blog Loop WSL Autostart Setup
# Sets up automatic startup on WSL boot and runs now

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BASHRC_FILE="$HOME/.bashrc"
PROFILE_FILE="$HOME/.bash_profile"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Make the main script executable
chmod +x "$SCRIPT_DIR/ralph-blog-loop.sh"
log_success "Made ralph-blog-loop.sh executable"

# Create a service wrapper for systemd (if available)
create_systemd_service() {
    if ! command -v systemctl &> /dev/null; then
        return 1
    fi
    
    SERVICE_FILE="/etc/systemd/system/ralph-blog.service"
    
    # Check if we can write to systemd (requires sudo)
    if [ ! -w /etc/systemd/system ]; then
        log_warning "Cannot write to systemd (requires sudo)"
        return 1
    fi
    
    cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Ralph Blog Loop - Autonomous Blog Publisher
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=$SCRIPT_DIR/ralph-blog-loop.sh run
Restart=on-failure
RestartSec=60

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable ralph-blog
    log_success "Created systemd service at $SERVICE_FILE"
    return 0
}

# Setup bashrc entry for autostart
setup_bashrc_autostart() {
    local entry="# Ralph Blog Loop - Autostart
if [ -f \"$SCRIPT_DIR/ralph-blog-loop.sh\" ] && ! pgrep -f 'ralph-blog-loop.sh run' > /dev/null; then
    nohup bash \"$SCRIPT_DIR/ralph-blog-loop.sh\" run > \"$PROJECT_DIR/ralph-blog.log\" 2>&1 &
fi"
    
    # Check if already in bashrc
    if grep -q "ralph-blog-loop" "$BASHRC_FILE" 2>/dev/null; then
        log_warning "Autostart entry already exists in $BASHRC_FILE"
        return 0
    fi
    
    # Add entry
    echo "" >> "$BASHRC_FILE"
    echo "$entry" >> "$BASHRC_FILE"
    log_success "Added autostart entry to $BASHRC_FILE"
}

# Setup cron for periodic runs (alternative)
setup_cron_autostart() {
    local cron_entry="@reboot cd $PROJECT_DIR && nohup bash $SCRIPT_DIR/ralph-blog-loop.sh run > $PROJECT_DIR/ralph-blog.log 2>&1 &"
    
    # Check if crontab exists and has entry
    if crontab -l 2>/dev/null | grep -q "ralph-blog-loop"; then
        log_warning "Cron entry already exists"
        return 0
    fi
    
    # Add cron entry (if cron is available)
    if command -v crontab &> /dev/null; then
        (crontab -l 2>/dev/null || echo "") | { cat; echo "$cron_entry"; } | crontab -
        log_success "Added @reboot entry to crontab"
        return 0
    fi
    
    return 1
}

# Main setup flow
main() {
    echo ""
    log_info "========================================="
    log_info "Ralph Blog Loop - WSL Autostart Setup"
    log_info "========================================="
    echo ""
    
    # Verify script exists
    if [ ! -f "$SCRIPT_DIR/ralph-blog-loop.sh" ]; then
        log_error "ralph-blog-loop.sh not found at $SCRIPT_DIR"
        exit 1
    fi
    
    # Try systemd first (preferred)
    if create_systemd_service; then
        log_info "Setup complete: Using systemd service"
        log_info "The blog loop will start automatically on boot"
    else
        # Fallback to bashrc
        setup_bashrc_autostart
        setup_cron_autostart || true
        log_info "Setup complete: Using bashrc + cron for autostart"
        log_warning "The blog loop will start on next terminal session"
    fi
    
    echo ""
    log_info "Running blog loop now..."
    echo ""
    
    # Run the loop in background
    cd "$PROJECT_DIR"
    nohup bash "$SCRIPT_DIR/ralph-blog-loop.sh" run > "$PROJECT_DIR/ralph-blog.log" 2>&1 &
    PID=$!
    
    log_success "Blog loop started in background (PID: $PID)"
    log_info "Logs: $PROJECT_DIR/ralph-blog.log"
    
    echo ""
    log_info "========================================="
    log_info "Check logs with: tail -f $PROJECT_DIR/ralph-blog.log"
    log_info "Stop the loop with: pkill -f 'ralph-blog-loop.sh run'"
    log_info "========================================="
}

main
