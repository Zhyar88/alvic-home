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
npm run build
npm link node-windows 
node install-frontend-service.cjs
