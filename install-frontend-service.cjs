const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'AlvicHomeFrontend',
  description: 'Alvic Home Frontend Vite Dev Server',
  script: path.join(__dirname, 'node_modules', '.bin', 'vite.cmd'),
  execPath: process.execPath,
});

svc.on('install', () => {
  console.log('Frontend service installed!');
  svc.start();
});

svc.on('start', () => {
  console.log('Frontend service started!');
});

svc.install();