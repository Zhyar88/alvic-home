const path = require('path');
const { Service } = require('node-windows');

const svc = new Service({
  name: 'AlvicHome',
  description: 'My TypeScript Node backend service',
  script: path.join(__dirname, 'dist', 'index.js'),
  workingDirectory: __dirname,
  nodeOptions: [
    '--max-old-space-size=512'
  ],
  wait: 2,
  grow: 0.5,
  maxRetries: 40
});

svc.on('install', () => {
  console.log('Service installed');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('Service already installed');
});

svc.on('start', () => {
  console.log('Service started');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
});

svc.install();