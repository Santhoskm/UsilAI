#!/bin/bash
set -e

echo "=========================================="
echo "🚀 Starting Usil AI Production Deployment"
echo "=========================================="

# 1. Pull latest code cleanly (stashing local edits so git pull never fails)
echo "📥 1. Pulling latest code from GitHub..."
cd /root/UsilAI
git stash || true
git pull origin main

# 2. Update Python dependencies & restart backend
echo "🐍 2. Updating backend dependencies..."
cd /root/UsilAI/usil-backend
source venv/bin/activate
pip install -r requirements.txt --quiet

echo "🔄 Restarting backend service..."
# Cleanly free port 8000 if any rogue process is lingering
fuser -k 8000/tcp 2>/dev/null || true
sleep 1

# If systemd service exists, restart it; otherwise restart via background process
if systemctl list-unit-files | grep -q usil-backend.service; then
    sudo systemctl restart usil-backend
else
    pkill -9 -f "run.py" 2>/dev/null || true
    nohup python -u run.py > backend.log 2>&1 &
fi
sleep 3

# 3. Optional: Sync new dictionary words
if [ -f "scripts/load_data.py" ]; then
    echo "📚 3. Checking dictionary data..."
    python scripts/load_data.py || true
fi

# 4. Build frontend
echo "⚡ 4. Building frontend..."
cd /root/UsilAI/tanglish-converter
npm install --legacy-peer-deps --no-audit
npm run build

# 5. Deploy frontend build to Nginx
echo "🚀 5. Deploying frontend build to /var/www/usil/..."
sudo rm -rf /var/www/usil/*
sudo cp -r dist/* /var/www/usil/
sudo chown -R www-data:www-data /var/www/usil

# 6. Test and reload Nginx safely (reload ensures zero downtime)
echo "🔁 6. Reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

# 7. Verification health checks
echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="

echo "🔍 Backend Health Check:"
curl -s http://127.0.0.1:8000/health || echo "Backend check failed"
echo ""

echo "🔍 SQLAdmin Portal Check:"
curl -s -I http://127.0.0.1/sqladmin/ | head -n 3

echo ""
echo "🌐 Live URLs:"
echo "   - Main App:        http://64.227.134.179/"
echo "   - Admin Dashboard: http://64.227.134.179/admin"
echo "   - SQLAdmin Portal: http://64.227.134.179/sqladmin/"
