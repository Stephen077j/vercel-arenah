// Abstraction layer for storage - easy migration to SQLite/PostgreSQL
import { generateId } from '../../lib/utils/generateId';

class StorageService {
  get<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  generateId(): string {
    return generateId();
  }

  // Export all data for migration
  exportAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          result[key] = JSON.parse(localStorage.getItem(key)!);
        } catch {
          result[key] = localStorage.getItem(key);
        }
      }
    }
    return result;
  }

  // Import data (restore)
  importAll(data: Record<string, unknown>): void {
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'current_user') {
        this.set(key, value);
      }
    });
  }

  // Clear all data
  clearAll(): void {
    const currentUser = localStorage.getItem('current_user');
    localStorage.clear();
    if (currentUser) localStorage.setItem('current_user', currentUser);
  }

  // Generate SQL migration script
  generateMigrationSQL(): string {
    const tables = [
      { key: 'users', table: 'users', columns: 'id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT, full_name TEXT, role TEXT, assigned_modules TEXT, active BOOLEAN, created_at TIMESTAMP' },
      { key: 'sales', table: 'sales', columns: 'id TEXT PRIMARY KEY, items JSONB, total NUMERIC, module TEXT, user_id TEXT, date TIMESTAMP, cancelled BOOLEAN' },
      { key: 'expenses', table: 'expenses', columns: 'id TEXT PRIMARY KEY, description TEXT, amount NUMERIC, category TEXT, date TIMESTAMP, user_id TEXT' },
      { key: 'cash_registers', table: 'cash_registers', columns: 'id TEXT PRIMARY KEY, opened_at TIMESTAMP, closed_at TIMESTAMP, opening_amount NUMERIC, closing_amount NUMERIC, user_id TEXT, status TEXT' },
      { key: 'cash_movements', table: 'cash_movements', columns: 'id TEXT PRIMARY KEY, register_id TEXT, type TEXT, amount NUMERIC, description TEXT, date TIMESTAMP, user_id TEXT' },
      { key: 'audit_log', table: 'audit_log', columns: 'id TEXT PRIMARY KEY, action TEXT, module TEXT, user_id TEXT, user_name TEXT, details TEXT, date TIMESTAMP' },
    ];

    let sql = '-- GestPro Migration Script\n-- Generated: ' + new Date().toISOString() + '\n\n';

    tables.forEach(({ key, table, columns }) => {
      sql += `CREATE TABLE IF NOT EXISTS ${table} (${columns});\n\n`;
      const data = this.get<any[]>(key, []);
      if (data.length > 0) {
        data.forEach(row => {
          const values = Object.values(row).map(v =>
            typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` :
            typeof v === 'object' ? `'${JSON.stringify(v).replace(/'/g, "''")}'` :
            v === null ? 'NULL' : String(v)
          ).join(', ');
          sql += `INSERT INTO ${table} VALUES (${values});\n`;
        });
        sql += '\n';
      }
    });

    return sql;
  }
}

export const storage = new StorageService();
