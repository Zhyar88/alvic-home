import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/download', verifyToken, requireAdmin, (req: Request, res: Response) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ error: 'DATABASE_URL not set' });
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fileName = `backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.sql`;

  const pgDumpPath = process.env.PG_DUMP_PATH || 'pg_dump';

  const args = [
    dbUrl,
    '--no-owner',
    '--no-acl',
    '--clean',
    '--if-exists',
    '--verbose',
  ];

  console.log('Starting pg_dump...');
  console.log('PG_DUMP_PATH:', pgDumpPath);
  console.log('DB URL:', dbUrl.replace(/:(.*?)@/, ':****@'));

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
    if (!res.headersSent) {
      return res.status(500).json({ error: `Failed to start pg_dump: ${err.message}` });
    }
    res.end();
  });

  res.setHeader('Content-Type', 'application/sql');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

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


// ****************************
// ******* for windows ********
// ****************************

// import { Router, Request, Response } from 'express';
// import { spawn } from 'child_process';
// import { existsSync } from 'fs';
// import { verifyToken, requireAdmin } from '../middleware/auth.js';

// const router = Router();

// function findPgDump(): string {
//   // Mac (Homebrew)
//   const macPaths = [
//     '/opt/homebrew/bin/pg_dump',
//     '/usr/local/bin/pg_dump',
//     '/usr/bin/pg_dump',
//   ];

//   // Windows - check all common PostgreSQL versions
//   const windowsPaths = [
//     'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
//   ];

//   const paths = process.platform === 'win32' ? windowsPaths : macPaths;

//   for (const p of paths) {
//     if (existsSync(p)) {
//       console.log('Found pg_dump at:', p);
//       return p;
//     }
//   }

//   // Fall back to PATH
//   console.log('pg_dump not found in known paths, trying PATH...');
//   return 'pg_dump';
// }

// router.get('/download', verifyToken, requireAdmin, (req: Request, res: Response) => {
//   const dbUrl = process.env.DATABASE_URL;
//   if (!dbUrl) {
//     return res.status(500).json({ error: 'DATABASE_URL not set' });
//   }

//   // Use PG_DUMP_PATH from env if set, otherwise auto-detect
//   const pgDumpPath = process.env.PG_DUMP_PATH || findPgDump();

//   const now = new Date();
//   const pad = (n: number) => String(n).padStart(2, '0');
//   const fileName = `backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.sql`;

//   const args = [
//     dbUrl,
//     '--no-owner',
//     '--no-acl',
//     '--clean',
//     '--if-exists',
//     '--verbose',
//   ];

//   console.log('Starting pg_dump...');
//   console.log('pg_dump path:', pgDumpPath);
//   console.log('DB URL:', dbUrl.replace(/:(.*?)@/, ':****@'));

//   const pgDump = spawn(pgDumpPath, args);

//   let stderr = '';
//   let hasOutput = false;
//   let headersSent = false;

//   pgDump.stdout.on('data', (chunk) => {
//     if (!headersSent) {
//       res.setHeader('Content-Type', 'application/sql');
//       res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
//       headersSent = true;
//     }
//     hasOutput = true;
//     res.write(chunk);
//   });

//   pgDump.stderr.on('data', (chunk) => {
//     const text = chunk.toString();
//     stderr += text;
//     console.error('pg_dump stderr:', text);
//   });

//   pgDump.on('error', (err) => {
//     console.error('pg_dump process error:', err);
//     console.error('Tried path:', pgDumpPath);
//     if (!headersSent) {
//       res.status(500).json({
//         error: `Backup failed: ${err.message}. pg_dump not found at: ${pgDumpPath}`,
//       });
//     } else {
//       res.end();
//     }
//   });

//   pgDump.on('close', (code) => {
//     console.log('pg_dump closed with code:', code);
//     console.log('pg_dump produced output:', hasOutput);

//     if (code !== 0) {
//       if (!headersSent) {
//         return res.status(500).json({
//           error: 'Database backup failed',
//           details: stderr || `pg_dump exited with code ${code}`,
//         });
//       }
//       return res.end();
//     }

//     if (!hasOutput) {
//       console.error('pg_dump succeeded but produced no output');
//     }

//     res.end();
//   });
// });

// export default router;