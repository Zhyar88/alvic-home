<!-- Global Node -->
npm install -g node-windows

<!-- Install Server -->
CD server:
npm install
npm run build
npm link node-windows 
node install-service.cjs

<!-- Install Client -->
npm install
npm install --save-dev electron electron-builder
npm run build
npm link node-windows 
node install-frontend-service.cjs

<!-- add this to server/index.tx -->
import { existsSync } from 'fs';
const frontendDist = join(process.cwd(), 'frontend-dist');
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(frontendDist, 'index.html'));
  });
}


<!-- Install Electron -->
CD clectron
npm install --save-dev electron electron-builder
npm install
npm start
npm run build:win



