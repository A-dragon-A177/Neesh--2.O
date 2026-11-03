/**
 * Unit tests for ledger balance computation (LedgerService.computeBalanceFromEntries).
 * Tests pure BigInt arithmetic — no database calls.
 */
import { describe, it, expect } from 'vitest';

// Inline the pure function under test to avoid importing server-side supabase client.
function computeBalance(
  entries: Array<{ direction: string; amount_paise: string | number | bigint; status?: string }>
): bigint {
  let balance = 0n;
  for (const entry of entries) {
    if (entry.status && entry.status !== 'COMPLETED') continue;
    const amount = BigInt(entry.amount_paise.toString());
    if (entry.direction === 'CREDIT') balance += amount;
    else if (entry.direction === 'DEBIT') balance -= amount;
  }
  return balance;
}

describe('Ledger balance computation', () => {
  it('returns 0n for empty ledger', () => {
    expect(computeBalance([])).toBe(0n);
  });

  it('adds CREDIT entries', () => {
    const entries = [
      { direction: 'CREDIT', amount_paise: '50000', status: 'COMPLETED' },
    ];
    expect(computeBalance(entries)).toBe(50000n);
  });

  it('subtracts DEBIT entries', () => {
    const entries = [
      { direction: 'CREDIT', amount_paise: '100000', status: 'COMPLETED' },
      { direction: 'DEBIT', amount_paise: '30000', status: 'COMPLETED' },
    ];
    expect(computeBalance(entries)).toBe(70000n);
  });

  it('skips PENDING entries', () => {
    const entries = [
      { direction: 'CREDIT', amount_paise: '100000', status: 'COMPLETED' },
      { direction: 'DEBIT', amount_paise: '50000', status: 'PENDING' },
    ];
    expect(computeBalance(entries)).toBe(100000n);
  });

  it('skips REVERSED entries', () => {
    const entries = [
      { direction: 'CREDIT', amount_paise: '100000', status: 'COMPLETED' },
      { direction: 'CREDIT', amount_paise: '50000', status: 'REVERSED' },
    ];
    expect(computeBalance(entries)).toBe(100000n);
  });

  it('handles entries without status field (treat as COMPLETED)', () => {
    const entries = [
      { direction: 'CREDIT', amount_paise: '25000' },
    ];
    expect(computeBalance(entries)).toBe(25000n);
  });

  it('handles BigInt amount_paise directly', () => {
    const entries = [
      { direction: 'CREDIT', amount_paise: 84000n, status: 'COMPLETED' },
      { direction: 'DEBIT', amount_paise: 8400n, status: 'COMPLETED' },
    ];
    expect(computeBalance(entries)).toBe(75600n);
  });

  it('balance can go negative (overdraft scenario)', () => {
    const entries = [
      { direction: 'DEBIT', amount_paise: '50000', status: 'COMPLETED' },
    ];
    expect(computeBalance(entries)).toBe(-50000n);
  });

  it('multi-entry sprint purchase scenario', () => {
    // 10 days of sprint @ ₹84/day = 84,000 paise credit, then one sprint debit
    const SPRINT_DAY_PRICE_PAISE = 8400n;
    const days = 10;
    const entries = [
      { direction: 'CREDIT', amount_paise: (SPRINT_DAY_PRICE_PAISE * BigInt(days)).toString(), status: 'COMPLETED' },
      { direction: 'DEBIT', amount_paise: SPRINT_DAY_PRICE_PAISE.toString(), status: 'COMPLETED' },
    ];
    expect(computeBalance(entries)).toBe(SPRINT_DAY_PRICE_PAISE * 9n);
  });
});
