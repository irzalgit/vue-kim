#!/usr/bin/env bash
# ============================================
# Script build & zip project React-Vite
# Jalankan dari root folder project (tempat package.json berada)
# Cara pakai: bash build-upload.sh
# ============================================

set -e  # hentikan script kalau ada error

echo "🔧 Install dependencies..."
npm install

echo "🏗️  Build project (vite build)..."
npm run build

# Vite default output folder = dist
BUILD_DIR="dist"

if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Folder $BUILD_DIR tidak ditemukan. Cek nama output build di vite.config.ts"
  exit 1
fi

# Pastikan .htaccess dan file penting masuk ke folder dist
if [ -f "public/.htaccess" ]; then
  cp -f "public/.htaccess" "$BUILD_DIR/.htaccess"
fi
if [ -f "public/gemini-proxy.php" ]; then
  cp -f "public/gemini-proxy.php" "$BUILD_DIR/gemini-proxy.php"
fi

# Nama file zip pakai timestamp biar gampang dibedain tiap upload
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ZIP_NAME="build-${TIMESTAMP}.zip"

echo "📦 Membuat zip: $ZIP_NAME dan dist.zip (termasuk .htaccess & file tersembunyi)..."
rm -f "$ZIP_NAME" "dist.zip"
cd "$BUILD_DIR"
# Include semua file dan direktori termasuk .htaccess tanpa prefix ./
zip -r "../$ZIP_NAME" .
cd ..
cp -f "$ZIP_NAME" "dist.zip"

echo ""
echo "✅ Selesai!"
echo "File zip siap upload: $(pwd)/$ZIP_NAME (atau $(pwd)/dist.zip)"
echo ""
echo "Langkah selanjutnya di cPanel File Manager:"
echo "1. Upload $ZIP_NAME (atau dist.zip) ke public_html (atau direktori web root Anda)"
echo "2. Klik kanan file zip -> Extract"
echo "3. Pastikan index.html dan .htaccess langsung ada di dalam folder tujuan (bukan subfolder)"
echo "4. Buka website di browser untuk memastikan aplikasi berjalan lancar!"
echo "5. Hapus file zip setelah selesai extract (opsional, biar hemat kuota storage)"
