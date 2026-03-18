<!-- Global Node -->
npm install -g node-windows

<!-- Install Electron -->
CD clectron
npm install --save-dev electron electron-builder
npm install
npm start
npm run build:win

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
