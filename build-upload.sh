#!/data/data/com.termux/files/usr/bin/bash
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
  echo "❌ Folder $BUILD_DIR tidak ditemukan. Cek nama output build di vite.config.js"
  exit 1
fi

# Nama file zip pakai timestamp biar gampang dibedain tiap upload
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ZIP_NAME="build-${TIMESTAMP}.zip"

echo "📦 Membuat zip: $ZIP_NAME (isi folder $BUILD_DIR, bukan foldernya)..."
cd "$BUILD_DIR"
zip -r "../$ZIP_NAME" . -x ".*"
cd ..

echo ""
echo "✅ Selesai!"
echo "File zip siap upload: $(pwd)/$ZIP_NAME"
echo ""
echo "Langkah selanjutnya di cPanel File Manager:"
echo "1. Upload $ZIP_NAME ke public_html"
echo "2. Klik kanan -> Extract"
echo "3. Pastikan index.html langsung ada di public_html (bukan di dalam subfolder)"
echo "4. Hapus file zip setelah selesai extract (opsional, biar rapi)"
