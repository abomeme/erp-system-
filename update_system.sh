#!/bin/bash
# =====================================================================
# Vendor Ledger System - Automated System Updater (Linux/Mac)
# =====================================================================

echo "============================================================"
echo "  Updating Vendor Ledger System from Cloud Repository..."
echo "============================================================"
echo

# 1. Git configurations
echo "[*] Setting git config..."
git config --global user.name "abomeme"
git config --global user.email "mf39343934@gmail.com"

# 2. Init if needed
if [ ! -d ".git" ]; then
    echo "[*] Initializing git repository..."
    git init
fi

# 3. Add remotes
git remote remove url 2>/dev/null || true
git remote add url https://github.com/abomeme/erp-system-.git 2>/dev/null || true
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/abomeme/erp-system-.git 2>/dev/null || true

# 4. Save current commit
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")

# 5. Stash local changes
echo "[*] Stashing local changes (git stash)..."
git stash

# 6. Fetch updates
echo "[1/3] Fetching new updates from main branch..."
git pull origin main

POST_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")

echo
echo "============================================================"
echo "📋 System update logs and file-level changes:"
echo "============================================================"
if [ -z "$PREV_COMMIT" ]; then
    echo "First fetch of the repository. No comparative diff is available."
elif [ "$PREV_COMMIT" = "$POST_COMMIT" ]; then
    echo "✨ Your system is already up-to-date with code on GitHub."
else
    # Loop over changes and output
    git diff --name-status "$PREV_COMMIT" "$POST_COMMIT" | while read -r status file; do
        echo
        if [ "$status" = "A" ]; then
            echo " 🆕 [New File Added] : $file"
            echo "   - This file was introduced as a completely new addition."
        elif [ "$status" = "M" ]; then
            echo " 📝 [File Modified] : $file"
            echo "   - Code adjustments with line headers (@@):"
            echo "     --------------------------------------------------"
            git diff -U0 --no-color "$PREV_COMMIT" "$POST_COMMIT" -- "$file" | grep -v "^diff " | grep -v "^index " | grep -v "^--- " | grep -v "^+++" || true
            echo "     --------------------------------------------------"
        elif [ "$status" = "D" ]; then
            echo " 🗑️ [File Deleted] : $file"
        else
            echo " 🔄 [Updated $status] : $file"
        fi
    done
fi
echo "============================================================"
echo

# 7. Install dependencies
echo "[2/3] Installing new dependencies (npm install)..."
npm install

# 8. Build application
echo
echo "[3/3] Rebuilding application assets (npm run build)..."
npm run build

echo
echo "============================================================"
echo "  ✨ Update and build completed successfully!"
echo "============================================================"
echo
