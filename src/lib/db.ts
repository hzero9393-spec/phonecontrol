import { Client } from 'pg';

// ============================================================
// Database connection factory
// ============================================================

type DbStatement = string | { sql: string; args?: unknown[] };
type DbResult = { rows: any[] };

class PgDbClient {
  private client: Client | null = null;
  private connectPromise: Promise<Client> | null = null;

  private getSslConfig(url: string): false | { rejectUnauthorized: false } {
    return url.includes('supabase.co') ? { rejectUnauthorized: false } : false;
  }

  private async getClient(): Promise<Client> {
    if (this.client) return this.client;

    if (!this.connectPromise) {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL is not configured');
      }

      this.connectPromise = (async () => {
        const client = new Client({
          connectionString,
          ssl: this.getSslConfig(connectionString),
        });
        await client.connect();
        this.client = client;
        return client;
      })();
    }

    return this.connectPromise;
  }

  private toPgSql(sql: string) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  async execute(statement: DbStatement): Promise<DbResult> {
    const client = await this.getClient();
    const sql = typeof statement === 'string' ? statement : statement.sql;
    const args = typeof statement === 'string' ? [] : statement.args || [];
    const result = await client.query(this.toPgSql(sql), args);
    return { rows: result.rows };
  }
}

const globalForDb = globalThis as unknown as { _phonecrmClient: PgDbClient | undefined };

function getClient(): PgDbClient {
  if (process.env.NODE_ENV !== 'production') {
    if (!globalForDb._phonecrmClient) {
      globalForDb._phonecrmClient = new PgDbClient();
    }
    return globalForDb._phonecrmClient;
  }
  return new PgDbClient();
}

/** Get the PostgreSQL query client used by API routes */
export function getDb(): PgDbClient {
  return getClient();
}

/** Convert database boolean-ish values to JS boolean */
export function toBool(val: unknown): boolean {
  return val === 1 || val === true || val === '1';
}

/** Convert JS boolean to numeric boolean for legacy payloads */
export function fromBool(val: unknown): number {
  return val ? 1 : 0;
}
