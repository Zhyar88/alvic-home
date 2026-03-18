const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

let mainWindow;
let backendProcess;

function waitForBackend(port, retries = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const socket = net.createConnection(port, '127.0.0.1');
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        attempts++;
        if (attempts >= retries) {
          reject(new Error('Backend did not start in time'));
        } else {
          setTimeout(check, 1000);
        }
      });
    };
    check();
  });
}

function startBackend() {
  const isPackaged = app.isPackaged;

  // When packaged: resources/backend/dist/index.js
  // When dev: ../server/dist/index.js
  const backendPath = isPackaged
    ? path.join(process.resourcesPath, 'backend', 'dist', 'index.js')
    : path.join(__dirname, '..', 'server', 'dist', 'index.js');

  const envPath = isPackaged
    ? path.join(process.resourcesPath, 'backend', '.env')
    : path.join(__dirname, '..', 'server', '.env');

  console.log('Backend path:', backendPath);
  console.log('Env path:', envPath);

  backendProcess = spawn('node', [backendPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '3000',
      DOTENV_CONFIG_PATH: envPath,
    },
    cwd: isPackaged
      ? path.join(process.resourcesPath, 'backend')
      : path.join(__dirname, '..', 'server'),
    stdio: 'pipe',
  });

  backendProcess.stdout.on('data', (data) => {
    console.log('Backend:', data.toString());
  });

  backendProcess.stderr.on('data', (data) => {
    console.error('Backend Error:', data.toString());
  });

  backendProcess.on('close', (code) => {
    console.log('Backend exited with code:', code);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: process.platform === 'win32'
        ? path.join(__dirname, 'logo.ico')
        : process.platform === 'darwin'
            ? path.join(__dirname, 'icon.icns')
            : path.join(__dirname, 'logo.png'),
    title: 'Alvic Home',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  mainWindow.show();

  try {
    startBackend();
    await waitForBackend(3000);
    mainWindow.loadURL('http://localhost:3000');
  } catch (err) {
    console.error('Failed to start:', err);
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});