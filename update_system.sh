#!/bin/bash
# =====================================================================
# Vendor Ledger System - Automated System Updater (Linux/Mac)
# =====================================================================

echo "============================================================"
echo "  Updating Vendor Ledger System from Cloud Repository..."
echo "============================================================"
echo

# 1. Fetch updates
echo "[1/3] Fetching new updates from Git..."
git pull origin main || git pull

# 2. Install dependencies
echo
echo "[2/3] Installing new dependencies (npm install)..."
npm install

# 3. Build application
echo
echo "[3/3] Rebuilding application assets (npm run build)..."
npm run build

echo
echo "============================================================"
echo "  ✨ Update and build completed successfully!"
echo "============================================================"
echo
