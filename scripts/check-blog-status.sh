#!/bin/bash

# Blog Loop Status Checker
# Shows if blog loop is running and recent activity

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$PROJECT_DIR/ralph-blog.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Ralph Blog Loop - Status Report                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if process is running
if pgrep -f "ralph-blog-loop.sh run" > /dev/null; then
    PID=$(pgrep -f "ralph-blog-loop.sh run" | head -1)
    echo -e "${GREEN}✅ Blog Loop Status: RUNNING${NC}"
    echo -e "   Process ID: ${PID}"
    echo ""
else
    echo -e "${RED}❌ Blog Loop Status: NOT RUNNING${NC}"
    echo ""
    echo -e "${YELLOW}To start the blog loop:${NC}"
    echo "  - From terminal: bash scripts/ralph-blog-loop.sh run"
    echo "  - From Windows: Run scripts/start-blog-visible.bat"
    echo "  - Or use Autostart (configured)"
    echo ""
fi

# Check log file
if [ ! -f "$LOG_FILE" ]; then
    echo -e "${YELLOW}⚠️  No log file found yet${NC}"
    echo "   First run hasn't occurred"
    echo ""
else
    echo -e "${BLUE}📋 Recent Activity:${NC}"
    echo ""
    
    # Last 5 log entries
    echo "Last 5 log entries:"
    tail -5 "$LOG_FILE" | sed 's/^/  /'
    echo ""
    
    # Extract stats from log
    TOTAL_RUNS=$(grep -c "Starting new article generation cycle" "$LOG_FILE" 2>/dev/null || echo "0")
    SUCCESSFUL_RUNS=$(grep -c "Cycle complete" "$LOG_FILE" 2>/dev/null || echo "0")
    ARTICLES_GENERATED=$(ls -1 "$PROJECT_DIR/articles/"*/*/*.md 2>/dev/null | wc -l)
    
    echo -e "${BLUE}📊 Statistics:${NC}"
    echo "  Total cycles run: $TOTAL_RUNS"
    echo "  Successful cycles: $SUCCESSFUL_RUNS"
    echo "  Articles generated: $ARTICLES_GENERATED"
    echo ""
    
    # Last run time
    LAST_RUN=$(grep "Starting new article generation cycle" "$LOG_FILE" | tail -1 | grep -o '\[.*\]' | head -1 || echo "Never")
    echo -e "${BLUE}⏰ Last Run:${NC} $LAST_RUN"
    echo ""
fi

# Next scheduled run
NEXT_RUN_EPOCH=$(($(date +%s) + 14400))
NEXT_RUN=$(date -d @$NEXT_RUN_EPOCH '+%Y-%m-%d %H:%M:%S')

echo -e "${BLUE}⏱️  Next Article:${NC} $NEXT_RUN (in 4 hours)"
echo ""

# Quick commands
echo -e "${BLUE}📌 Quick Commands:${NC}"
echo "  • View logs:        tail -f ralph-blog.log"
echo "  • Check status:     bash scripts/check-blog-status.sh"
echo "  • Run once:         bash scripts/ralph-blog-loop.sh once"
echo "  • See help:         bash scripts/ralph-blog-loop.sh help"
echo ""

echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
