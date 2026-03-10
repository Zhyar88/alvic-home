import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple paths for .env file
const envPaths = [
  join(__dirname, '../.env'),           // When running from compiled dist
  join(process.cwd(), '.env'),          // When running from server directory
  join(process.cwd(), 'server/.env'),   // When running from project root
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✓ Loaded environment from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠ No .env file found, using system environment variables');
}
