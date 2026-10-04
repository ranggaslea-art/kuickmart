import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export interface MySqlConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

let pool: Pool | null = null;
let lastConnectionStatus: {
  connected: boolean;
  message: string;
  timestamp: string;
  tableCounts?: Record<string, number>;
} = {
  connected: false,
  message: 'Belum diuji',
  timestamp: new Date().toISOString(),
};

export function getMySqlConfig(): MySqlConfig {
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'kuickmart_user',
    password: process.env.MYSQL_PASSWORD || 'Kuickmart2026Secure',
    database: process.env.MYSQL_DATABASE || 'kuickmart_db',
  };
}

export function getMySqlPool(): Pool {
  if (pool) return pool;

  const cfg = getMySqlConfig();
  const poolConfig: PoolOptions = {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 2000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };

  pool = mysql.createPool(poolConfig);
  return pool;
}

/**
 * Uji koneksi ke database MySQL / MariaDB
 */
export async function testMySqlConnection(): Promise<{
  connected: boolean;
  message: string;
  version?: string;
  tableCounts?: Record<string, number>;
}> {
  try {
    const p = getMySqlPool();
    const [rows]: any = await p.query('SELECT VERSION() as version');
    const version = rows?.[0]?.version || 'MySQL / MariaDB';

    // Hitung baris di tabel utama jika ada
    const counts: Record<string, number> = {};
    const tables = ['products', 'orders', 'categories', 'brands', 'customers', 'staff_users'];
    for (const t of tables) {
      try {
        const [c]: any = await p.query(`SELECT COUNT(*) as count FROM ${t}`);
        counts[t] = c?.[0]?.count || 0;
      } catch (_) {
        counts[t] = 0;
      }
    }

    lastConnectionStatus = {
      connected: true,
      message: `Berhasil terhubung ke MariaDB / MySQL (${version})`,
      timestamp: new Date().toISOString(),
      tableCounts: counts,
    };

    return {
      connected: true,
      message: lastConnectionStatus.message,
      version,
      tableCounts: counts,
    };
  } catch (err: any) {
    lastConnectionStatus = {
      connected: false,
      message: `Gagal terhubung: ${err.message || 'Koneksi ditolak pada port 3306'}`,
      timestamp: new Date().toISOString(),
    };
    return {
      connected: false,
      message: lastConnectionStatus.message,
    };
  }
}

/**
 * Jalankan inisialisasi skema tabel otomatis jika tabel belum ada
 */
export async function initializeMySqlSchema(): Promise<{ success: boolean; message: string }> {
  try {
    const p = getMySqlPool();
    const schemaPath = path.resolve(process.cwd(), 'src/db/mysqlSchema.sql');
    if (!fs.existsSync(schemaPath)) {
      return { success: false, message: 'Berkas mysqlSchema.sql tidak ditemukan' };
    }

    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    // Pisahkan query berdasarkan titik koma
    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 5) {
        await p.query(statement);
      }
    }

    return { success: true, message: 'Skema tabel MySQL berhasil diinisialisasi!' };
  } catch (err: any) {
    return { success: false, message: `Gagal inisialisasi skema: ${err.message}` };
  }
}

export function getLastMySqlStatus() {
  return lastConnectionStatus;
}
