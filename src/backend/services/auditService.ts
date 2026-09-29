// Audit logging service - records all actions
import { storage } from './storageService';
import { AuditEntry } from '../models/types';

const AUDIT_KEY = 'audit_log';

class AuditService {
  log(action: string, module: string, userId: string, userName: string, details: string): void {
    const entries = storage.get<AuditEntry[]>(AUDIT_KEY, []);
    entries.push({
      id: storage.generateId(),
      action,
      module,
      userId,
      userName,
      details,
      date: new Date().toISOString(),
    });
    storage.set(AUDIT_KEY, entries);
  }

  getAll(): AuditEntry[] {
    return storage.get<AuditEntry[]>(AUDIT_KEY, []);
  }

  getByModule(module: string): AuditEntry[] {
    return this.getAll().filter(e => e.module === module);
  }

  getByUser(userId: string): AuditEntry[] {
    return this.getAll().filter(e => e.userId === userId);
  }

  getRecent(count: number = 50): AuditEntry[] {
    return this.getAll()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, count);
  }

  clear(): void {
    storage.set(AUDIT_KEY, []);
  }
}

export const auditService = new AuditService();
