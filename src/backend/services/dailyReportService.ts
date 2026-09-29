// Daily report generation for Super Admin
import { storage } from './storageService';
import { DailyReport, Sale, Expense } from '../models/types';

const REPORTS_KEY = 'daily_reports';

class DailyReportService {
  generate(): DailyReport {
    const today = new Date().toISOString().split('T')[0];
    const reports = this.getAll();
    
    // Check if already generated today
    const existing = reports.find(r => r.date === today);
    if (existing) return existing;

    const sales = storage.get<Sale[]>('sales', []).filter(s => !s.cancelled && s.date.startsWith(today));
    const expenses = storage.get<Expense[]>('expenses', []).filter(e => e.date.startsWith(today));

    const report: DailyReport = {
      id: storage.generateId(),
      date: today,
      totalSales: sales.reduce((s, sale) => s + sale.total, 0),
      totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
      salesCount: sales.length,
      generatedAt: new Date().toISOString(),
      read: false,
    };

    reports.push(report);
    storage.set(REPORTS_KEY, reports);
    return report;
  }

  getAll(): DailyReport[] {
    return storage.get<DailyReport[]>(REPORTS_KEY, []);
  }

  getUnread(): DailyReport[] {
    return this.getAll().filter(r => !r.read);
  }

  markRead(id: string): void {
    const reports = this.getAll();
    const report = reports.find(r => r.id === id);
    if (report) {
      report.read = true;
      storage.set(REPORTS_KEY, reports);
    }
  }

  markAllRead(): void {
    const reports = this.getAll().map(r => ({ ...r, read: true }));
    storage.set(REPORTS_KEY, reports);
  }
}

export const dailyReportService = new DailyReportService();
