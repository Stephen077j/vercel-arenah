// Cash movements (entries/exits) service
import { storage } from './storageService';
import { CashMovement, CashRegister } from '../models/types';

const MOVEMENTS_KEY = 'cash_movements';

class CashMovementService {
  getAll(): CashMovement[] {
    return storage.get<CashMovement[]>(MOVEMENTS_KEY, []);
  }

  getByRegister(registerId: string): CashMovement[] {
    return this.getAll().filter(m => m.registerId === registerId);
  }

  add(movement: Omit<CashMovement, 'id' | 'date'>): CashMovement {
    const movements = this.getAll();
    const newMovement: CashMovement = {
      ...movement,
      id: storage.generateId(),
      date: new Date().toISOString(),
    };
    movements.push(newMovement);
    storage.set(MOVEMENTS_KEY, movements);
    return newMovement;
  }

  // Get the last closing amount (yesterday's "sortant" becomes today's coverage)
  getLastClosingAmount(): number {
    const registers = storage.get<CashRegister[]>('cash_registers', []);
    const closed = registers
      .filter(r => r.status === 'closed' && r.closingAmount !== null)
      .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime());
    return closed.length > 0 ? (closed[0].closingAmount || 0) : 0;
  }

  // Calculate current fund: opening + entries - exits
  getCurrentFund(registerId: string, openingAmount: number): { total: number; entries: number; exits: number } {
    const movements = this.getByRegister(registerId);
    const entries = movements.filter(m => m.type === 'entry').reduce((s, m) => s + m.amount, 0);
    const exits = movements.filter(m => m.type === 'exit').reduce((s, m) => s + m.amount, 0);
    return {
      total: openingAmount + entries - exits,
      entries,
      exits,
    };
  }
}

export const cashMovementService = new CashMovementService();
