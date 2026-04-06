import { createClient } from '@libsql/client';

let _client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!_client) {
    const dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db';
    _client = createClient({
      url: dbUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN || '',
    });
  }
  return _client;
}

/** Convert SQLite boolean (0/1) to JS boolean */
export function toBool(val: unknown): boolean {
  return val === 1 || val === true;
}

/** Convert JS boolean to SQLite integer (0/1) */
export function fromBool(val: boolean | undefined | null): number {
  return val ? 1 : 0;
}
