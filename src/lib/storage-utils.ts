import { promises as fs } from 'fs';
import path from 'path';

/**
 * Get the size of the SQLite database file
 * Handles both local development and production Docker environments
 * SERVER-SIDE ONLY - uses Node.js fs module
 */
export async function getDbSize(): Promise<number> {
  const dbPath = process.env.NODE_ENV === 'production'
    ? '/app/prisma/prod.db'
    : path.join(process.cwd(), 'prisma', 'dev.db');
  
  try {
    const stats = await fs.stat(dbPath);
    return stats.size;
  } catch (error) {
    console.error('Failed to get DB size:', error);
    return 0;
  }
}
