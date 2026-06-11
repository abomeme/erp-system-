#!/bin/bash
# =====================================================================
# Vendor Ledger System - Standalone Setup & Local Launcher (v4.0)
# نظام إدارة الحسابات والعهد - ملف التشغيل والتثبيت السريع المستقل (ماك ولينكس)
# =====================================================================

# Color printing
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}   VENDOR LEDGER SYSTEM v4.0 - نظام إدارة الموردين والعملاء والعمال  ${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

echo -e "[1/4] Checking for Node.js environment..."
echo -e "جاري التحقق من وجود بيئة تشغيل نود..."

if ! command -v node &> /dev/null
then
    echo -e "${RED}ERROR: Node.js is not installed on this computer!${NC}"
    echo -e "${RED}خطأ: بيئة تشغيل Node.js غير مثبتة على هذا الجهاز!${NC}"
    echo ""
    echo -e "Please install Node.js from https://nodejs.org"
    echo -e "يرجى تحميل وتثبيت نود من الموقع الرسمي https://nodejs.org"
    echo ""
    exit 1
fi

echo -e "${GREEN}Node.js detected: $(node -v)${NC}"
echo ""

echo -e "[2/4] Verifying packages and node_modules..."
echo -e "جاري التحقق من الحزم التابعة للمشروع..."

if [ ! -d "node_modules" ]; then
    echo "node_modules directory is missing. Installing dependencies..."
    echo "مجلد الحزم غير موجود، جاري التثبيت التلقائي..."
    npm install
else
    echo -e "${GREEN}Dependencies already installed.${NC}"
    echo "الحزم مثبتة بالفعل مسبقاً."
fi

echo ""
echo -e "[3/4] Building production assets..."
echo -e "جاري بناء وتجهيز ملفات النظام للتشغيل السريع..."
npm run build

echo ""
echo -e "[4/4] Starting local offline server..."
echo -e "تشغيل الخادم المحلي الآن..."
echo -e "Applet will be accessible at: ${GREEN}http://localhost:3000${NC}"
echo -e "سيتم تشغيل النظام على الرابط: ${GREEN}http://localhost:3000${NC}"
echo ""

# Attempt to open default web browser based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3000 2>/dev/null || echo "Please open http://localhost:3000 manually."
fi

# Run dev dev server (or start server)
npm run dev
