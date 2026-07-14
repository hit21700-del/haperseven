// ─────────────────────────────────────────────────────────────
// 회비 저장소 (납부 입력 / 추가지출 / 환불) - localStorage 구현
// ─────────────────────────────────────────────────────────────
import type { PaymentEntry, ExtraExpense, RefundRecord } from "@/types/payment";
import { readJSON, writeJSON, STORAGE_KEYS } from "./storage";

export interface PaymentRepository {
  getEntries(): PaymentEntry[];
  saveEntries(entries: PaymentEntry[]): void;
  getExtraExpenses(): ExtraExpense[];
  saveExtraExpenses(items: ExtraExpense[]): void;
  getRefunds(): RefundRecord[];
  saveRefunds(items: RefundRecord[]): void;
}

export const paymentRepository: PaymentRepository = {
  getEntries() {
    return readJSON<PaymentEntry[]>(STORAGE_KEYS.paymentEntries, []);
  },
  saveEntries(entries) {
    writeJSON(STORAGE_KEYS.paymentEntries, entries);
  },
  getExtraExpenses() {
    return readJSON<ExtraExpense[]>(STORAGE_KEYS.extraExpenses, []);
  },
  saveExtraExpenses(items) {
    writeJSON(STORAGE_KEYS.extraExpenses, items);
  },
  getRefunds() {
    return readJSON<RefundRecord[]>(STORAGE_KEYS.refunds, []);
  },
  saveRefunds(items) {
    writeJSON(STORAGE_KEYS.refunds, items);
  },
};

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(performance.now())}`;
}
