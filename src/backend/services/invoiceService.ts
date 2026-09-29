// Central Invoice/Billing Service - shared across all modules
import { storage } from './storageService';
import { auditService } from './auditService';

export interface Invoice {
  id: string;
  number: string; // INV-YYYYMMDD-XXX
  module: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  discountType: 'percent' | 'fixed';
  total: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod?: 'especes' | 'carte' | 'mobile' | 'mixte';
  amountReceived?: number;
  amountChange?: number;
  clientName: string;
  userId: string;
  userName: string;
  createdAt: string;
  paidAt?: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CashTransaction {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  type: 'income' | 'refund';
  amount: number;
  paymentMethod: string;
  module: string;
  userId: string;
  userName: string;
  date: string;
}

const INVOICES_KEY = 'invoices';
const CASH_TX_KEY = 'cash_transactions';

class InvoiceService {
  private getNextNumber(): string {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const all = this.getAll();
    const todayInvoices = all.filter(i => i.number.includes(today));
    const seq = (todayInvoices.length + 1).toString().padStart(3, '0');
    return `INV-${today}-${seq}`;
  }

  createInvoice(data: {
    module: string;
    items: InvoiceItem[];
    discount?: number;
    discountType?: 'percent' | 'fixed';
    clientName: string;
    userId: string;
    userName: string;
  }): Invoice {
    const subtotal = data.items.reduce((s, i) => s + i.total, 0);
    const discountAmount = data.discount
      ? data.discountType === 'percent'
        ? subtotal * (data.discount / 100)
        : Math.min(data.discount, subtotal)
      : 0;

    const invoice: Invoice = {
      id: storage.generateId(),
      number: this.getNextNumber(),
      module: data.module,
      items: data.items,
      subtotal,
      discount: discountAmount,
      discountType: data.discountType || 'fixed',
      total: subtotal - discountAmount,
      status: 'pending',
      clientName: data.clientName,
      userId: data.userId,
      userName: data.userName,
      createdAt: new Date().toISOString(),
    };

    const all = this.getAll();
    all.push(invoice);
    storage.set(INVOICES_KEY, all);
    return invoice;
  }

  payInvoice(id: string, paymentMethod: string, amountReceived: number): Invoice | null {
    const all = this.getAll();
    const inv = all.find(i => i.id === id);
    if (!inv || inv.status !== 'pending') return null;

    inv.status = 'paid';
    inv.paymentMethod = paymentMethod as Invoice['paymentMethod'];
    inv.amountReceived = amountReceived;
    inv.amountChange = Math.max(0, amountReceived - inv.total);
    inv.paidAt = new Date().toISOString();
    storage.set(INVOICES_KEY, all);

    // Add cash transaction
    this.addCashTransaction({
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      type: 'income',
      amount: inv.total,
      paymentMethod,
      module: inv.module,
      userId: inv.userId,
      userName: inv.userName,
    });

    auditService.log('invoice_paid', inv.module, inv.userId, inv.userName,
      `Facture ${inv.number} payée: ${inv.total} (${paymentMethod})`);

    return inv;
  }

  cancelInvoice(id: string, userId: string, userName: string): boolean {
    const all = this.getAll();
    const inv = all.find(i => i.id === id);
    if (!inv) return false;

    if (inv.status === 'paid') {
      inv.status = 'refunded';
      this.addCashTransaction({
        invoiceId: inv.id,
        invoiceNumber: inv.number,
        type: 'refund',
        amount: -inv.total,
        paymentMethod: inv.paymentMethod || 'especes',
        module: inv.module,
        userId, userName,
      });
    } else {
      inv.status = 'cancelled';
    }

    storage.set(INVOICES_KEY, all);
    auditService.log('invoice_cancel', inv.module, userId, userName, `Facture ${inv.number} annulée/remboursée`);
    return true;
  }

  private addCashTransaction(data: Omit<CashTransaction, 'id' | 'date'>) {
    const all = storage.get<CashTransaction[]>(CASH_TX_KEY, []);
    all.push({ ...data, id: storage.generateId(), date: new Date().toISOString() });
    storage.set(CASH_TX_KEY, all);
  }

  getAll(): Invoice[] {
    return storage.get<Invoice[]>(INVOICES_KEY, []);
  }

  getByModule(module: string): Invoice[] {
    return this.getAll().filter(i => i.module === module);
  }

  getCashTransactions(): CashTransaction[] {
    return storage.get<CashTransaction[]>(CASH_TX_KEY, []);
  }

  getCashTransactionsByModule(module: string): CashTransaction[] {
    return this.getCashTransactions().filter(t => t.module === module);
  }

  getTodayRevenue(module?: string): number {
    const today = new Date().toISOString().split('T')[0];
    const txs = module ? this.getCashTransactionsByModule(module) : this.getCashTransactions();
    return txs.filter(t => t.date.startsWith(today) && t.type === 'income').reduce((s, t) => s + t.amount, 0);
  }

  getMonthRevenue(module?: string): number {
    const month = new Date().toISOString().slice(0, 7);
    const txs = module ? this.getCashTransactionsByModule(module) : this.getCashTransactions();
    return txs.filter(t => t.date.startsWith(month) && t.type === 'income').reduce((s, t) => s + t.amount, 0);
  }

  generateReceiptData(invoiceId: string, businessName: string): Record<string, unknown> | null {
    const inv = this.getAll().find(i => i.id === invoiceId);
    if (!inv) return null;
    return {
      invoiceNumber: inv.number,
      businessName,
      module: inv.module,
      items: inv.items,
      subtotal: inv.subtotal,
      discount: inv.discount,
      total: inv.total,
      paymentMethod: inv.paymentMethod,
      amountReceived: inv.amountReceived,
      change: inv.amountChange,
      cashier: inv.userName,
      client: inv.clientName,
      date: inv.paidAt || inv.createdAt,
    };
  }
}

export const invoiceService = new InvoiceService();
