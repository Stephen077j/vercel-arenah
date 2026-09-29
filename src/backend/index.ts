// Backend barrel export - single entry point
export { storage } from './services/storageService';
export { auditService } from './services/auditService';
export { dailyReportService } from './services/dailyReportService';
export { cashMovementService } from './services/cashMovementService';
export { invoiceService } from './services/invoiceService';
export type { Invoice, InvoiceItem, CashTransaction } from './services/invoiceService';
export * from './models/types';

// Re-export db for backward compatibility
export { db } from '../lib/database';
