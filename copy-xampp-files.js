import fs from 'fs';
import path from 'path';

const filesToCopy = [
  'db_sync_bridge.php',
  'alyamama_erp_system.sql'
];

const distDir = path.resolve('dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

filesToCopy.forEach(file => {
  const src = path.resolve(file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[XAMPP Bundler] Copied ${file} to dist/`);
  } else {
    console.warn(`[XAMPP Bundler] Warning: ${file} not found in root!`);
  }
});

console.log('[XAMPP Bundler] Done! You can now copy the contents of the "dist" folder directly into XAMPP "htdocs" directory (e.g., htdocs/olad-dawood/) and it will work instantly with local MySQL database.');
