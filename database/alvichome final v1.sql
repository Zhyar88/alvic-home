import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

function findPgDump(): string {
  const windowsPaths = [
    'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
  ];

  const macPaths = [
    '/usr/local/Cellar/postgresql@18/18.3/bin/pg_dump',
  ];

  const paths = process.platform === 'win32' ? windowsPaths : macPaths;

  for (const p of paths) {
    if (existsSync(p)) {
      console.log('Found pg_dump at:', p);
      return p;
    }
  }

  console.log('pg_dump not found in known paths, falling back to PATH...');
  return 'pg_dump';
}

router.get('/download', verifyToken, requireAdmin, (req: Request, res: Response) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ error: 'DATABASE_URL not set' });
  }

  const pgDumpPath = process.env.PG_DUMP_PATH || findPgDump();

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fileName = `alvichome-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.sql`;

  const args = [
    dbUrl,
    '--no-owner',
    '--no-acl',
    '--clean',
    '--if-exists',
    '--verbose',
  ];

  console.log('Starting pg_dump...');
  console.log('pg_dump path:', pgDumpPath);
  console.log('Platform:', process.platform);
  console.log('DB URL:', dbUrl.replace(/:(.*?)@/, ':****@'));

  // Set headers immediately so filename is always correct
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'no-cache');

  const pgDump = spawn(pgDumpPath, args);

  let stderr = '';
  let hasOutput = false;

  pgDump.stdout.on('data', (chunk) => {
    hasOutput = true;
    res.write(chunk);
  });

  pgDump.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    console.error('pg_dump stderr:', text);
  });

  pgDump.on('error', (err) => {
    console.error('pg_dump process error:', err);
    console.error('Tried path:', pgDumpPath);
    if (!res.headersSent) {
      res.status(500).json({
        error: `Backup failed: ${err.message}`,
        path: pgDumpPath,
        hint: process.platform === 'win32'
          ? 'Set PG_DUMP_PATH in your .env file, e.g. C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe'
          : 'Make sure PostgreSQL is installed and pg_dump is in your PATH',
      });
    } else {
      res.end();
    }
  });

  pgDump.on('close', (code) => {
    console.log('pg_dump closed with code:', code);
    console.log('pg_dump produced output:', hasOutput);

    if (code !== 0) {
      if (!res.headersSent) {
        return res.status(500).json({
          error: 'Database backup failed',
          details: stderr || `pg_dump exited with code ${code}`,
        });
      }
      return res.end();
    }

    if (!hasOutput) {
      console.error('pg_dump succeeded but produced no output');
    }

    res.end();
  });
});

export default router;