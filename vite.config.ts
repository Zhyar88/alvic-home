import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function safeCopyPublicPlugin() {
  return {
    name: 'safe-copy-public',
    closeBundle() {
      const publicDir = path.resolve(__dirname, 'public');
      const outDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(publicDir)) return;
      const files = fs.readdirSync(publicDir);
      for (const file of files) {
        const src = path.join(publicDir, file);
        const dest = path.join(outDir, file);
        try {
          fs.copyFileSync(src, dest);
        } catch {
        }
      }
    },
  };
}

export default defineConfig({
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  publicDir: false,
  plugins: [react(), safeCopyPublicPlugin()],
});
