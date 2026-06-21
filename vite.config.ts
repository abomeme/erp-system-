import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { exec } from 'child_process';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'system-updater-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.startsWith('/api/system-update')) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              
              const isWin = process.platform === 'win32';
              const command = isWin ? 'update_system.bat' : 'sh update_system.sh';
              
              console.log(`[Updater] Launching update command: ${command}`);
              
              exec(command, (error: any, stdout: string, stderr: string) => {
                if (error) {
                  console.error(`[Updater] Error: ${error.message}`);
                  res.statusCode = 500;
                  res.end(JSON.stringify({
                    status: 'error',
                    message: 'فشلت عملية تشغيل ملف تحديث النظام تلقائياً!',
                    error: error.message,
                    stderr: stderr
                  }));
                  return;
                }
                
                console.log(`[Updater] Success: ${stdout}`);
                res.statusCode = 200;
                res.end(JSON.stringify({
                  status: 'success',
                  message: 'تم تحديث وترقية النظام وحل الحزم وإعادة بناء التطبيق من المستودع بنجاح!',
                  stdout: stdout
                }));
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
