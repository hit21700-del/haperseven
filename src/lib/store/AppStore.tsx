"use client";
// ─────────────────────────────────────────────────────────────
// 전역 상태 스토어 (React Context + localStorage repository)
// 모든 화면이 이 스토어를 통해 데이터를 읽고 쓴다.
// 첫 실행 시 샘플 데이터를 시드한다.
// ─────────────────────────────────────────────────────────────
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Member } from "@/types/member";
import type { Match } from "@/types/match";
import type { PaymentEntry, ExtraExpense, RefundRecord } from "@/types/payment";
import type { FormationTemplate } from "@/types/formation";
import { DEFAULT_FORMATION_TEMPLATES } from "@/types/formation";
import { memberRepository } from "@/lib/repository/memberRepository";
import { matchRepository } from "@/lib/repository/matchRepository";
import { paymentRepository } from "@/lib/repository/paymentRepository";
import { readJSON, writeJSON, STORAGE_KEYS, clearAll } from "@/lib/repository/storage";
import {
  SAMPLE_MEMBERS,
  SAMPLE_MATCHES,
  SAMPLE_PAYMENT_ENTRIES,
  SAMPLE_EXTRA_EXPENSES,
  SAMPLE_REFUNDS,
  SEED_VERSION,
} from "@/lib/data/sampleData";
import { applyDefaultTeams } from "@/lib/data/defaultTeams";
import { applyPaymentSeed } from "@/lib/data/paymentSeed";

type AppState = {
  ready: boolean;
  members: Member[];
  matches: Match[];
  paymentEntries: PaymentEntry[];
  extraExpenses: ExtraExpense[];
  refunds: RefundRecord[];
  formationTemplates: FormationTemplate[];
};

type AppActions = {
  setMembers: (m: Member[]) => void;
  upsertMember: (m: Member) => void;
  removeMember: (id: string) => void;
  setMatches: (m: Match[]) => void;
  upsertMatch: (m: Match) => void;
  removeMatch: (id: string) => void;
  setPaymentEntries: (e: PaymentEntry[]) => void;
  setExtraExpenses: (e: ExtraExpense[]) => void;
  setRefunds: (e: RefundRecord[]) => void;
  upsertFormationTemplate: (t: FormationTemplate) => void;
  resetToSample: () => void;
};

const AppContext = createContext<(AppState & AppActions) | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [members, setMembersState] = useState<Member[]>([]);
  const [matches, setMatchesState] = useState<Match[]>([]);
  const [paymentEntries, setPaymentEntriesState] = useState<PaymentEntry[]>([]);
  const [extraExpenses, setExtraExpensesState] = useState<ExtraExpense[]>([]);
  const [refunds, setRefundsState] = useState<RefundRecord[]>([]);
  const [formationTemplates, setFormationTemplates] = useState<FormationTemplate[]>(DEFAULT_FORMATION_TEMPLATES);

  // 최초 로드: 시드 버전 확인. 버전이 바뀌었으면(=기본 명단 갱신) 자동으로 다시 불러온다.
  useEffect(() => {
    const storedVersion = readJSON<string>(STORAGE_KEYS.seedVersion, "");
    if (storedVersion !== SEED_VERSION) {
      memberRepository.saveAll(SAMPLE_MEMBERS);
      matchRepository.saveAll(SAMPLE_MATCHES);
      paymentRepository.saveEntries(SAMPLE_PAYMENT_ENTRIES);
      paymentRepository.saveExtraExpenses(SAMPLE_EXTRA_EXPENSES);
      paymentRepository.saveRefunds(SAMPLE_REFUNDS);
      writeJSON(STORAGE_KEYS.formationTemplates, DEFAULT_FORMATION_TEMPLATES);
      writeJSON(STORAGE_KEYS.seeded, true);
      writeJSON(STORAGE_KEYS.seedVersion, SEED_VERSION);
    }
    // 자체전 팀 최초 1회 배정(기존 데이터 보존 — 이름 기준 화이트/블랙/감독 적용)
    let loadedMembers = memberRepository.getAll();
    if (!readJSON<boolean>(STORAGE_KEYS.teamsSeeded, false)) {
      loadedMembers = applyDefaultTeams(loadedMembers);
      memberRepository.saveAll(loadedMembers);
      writeJSON(STORAGE_KEYS.teamsSeeded, true);
    }
    // 회비 납부 현황 최초 1회 반영(엑셀 캡처 기준 — 회비 금액/월별 상태만 갱신)
    if (!readJSON<boolean>(STORAGE_KEYS.paymentSeeded, false)) {
      loadedMembers = applyPaymentSeed(loadedMembers);
      memberRepository.saveAll(loadedMembers);
      writeJSON(STORAGE_KEYS.paymentSeeded, true);
    }
    setMembersState(loadedMembers);
    setMatchesState(matchRepository.getAll());
    setPaymentEntriesState(paymentRepository.getEntries());
    setExtraExpensesState(paymentRepository.getExtraExpenses());
    setRefundsState(paymentRepository.getRefunds());
    setFormationTemplates(readJSON<FormationTemplate[]>(STORAGE_KEYS.formationTemplates, DEFAULT_FORMATION_TEMPLATES));
    setReady(true);
  }, []);

  // ── 액션 ──
  const setMembers = useCallback((m: Member[]) => {
    memberRepository.saveAll(m);
    setMembersState(m);
  }, []);
  const upsertMember = useCallback((m: Member) => {
    setMembersState((prev) => {
      const exists = prev.some((x) => x.id === m.id);
      const next = exists ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m];
      memberRepository.saveAll(next);
      return next;
    });
  }, []);
  const removeMember = useCallback((id: string) => {
    setMembersState((prev) => {
      const next = prev.filter((x) => x.id !== id);
      memberRepository.saveAll(next);
      return next;
    });
  }, []);

  const setMatches = useCallback((m: Match[]) => {
    matchRepository.saveAll(m);
    setMatchesState(m.sort((a, b) => b.date.localeCompare(a.date)));
  }, []);
  const upsertMatch = useCallback((m: Match) => {
    setMatchesState((prev) => {
      const exists = prev.some((x) => x.id === m.id);
      const next = (exists ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]).sort((a, b) =>
        b.date.localeCompare(a.date),
      );
      matchRepository.saveAll(next);
      return next;
    });
  }, []);
  const removeMatch = useCallback((id: string) => {
    setMatchesState((prev) => {
      const next = prev.filter((x) => x.id !== id);
      matchRepository.saveAll(next);
      return next;
    });
  }, []);

  const setPaymentEntries = useCallback((e: PaymentEntry[]) => {
    paymentRepository.saveEntries(e);
    setPaymentEntriesState(e);
  }, []);
  const setExtraExpenses = useCallback((e: ExtraExpense[]) => {
    paymentRepository.saveExtraExpenses(e);
    setExtraExpensesState(e);
  }, []);
  const setRefunds = useCallback((e: RefundRecord[]) => {
    paymentRepository.saveRefunds(e);
    setRefundsState(e);
  }, []);

  const upsertFormationTemplate = useCallback((t: FormationTemplate) => {
    setFormationTemplates((prev) => {
      const exists = prev.some((x) => x.id === t.id);
      const next = exists ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
      writeJSON(STORAGE_KEYS.formationTemplates, next);
      return next;
    });
  }, []);

  const resetToSample = useCallback(() => {
    clearAll();
    const seededMembers = applyPaymentSeed(applyDefaultTeams(SAMPLE_MEMBERS));
    memberRepository.saveAll(seededMembers);
    matchRepository.saveAll(SAMPLE_MATCHES);
    paymentRepository.saveEntries(SAMPLE_PAYMENT_ENTRIES);
    paymentRepository.saveExtraExpenses(SAMPLE_EXTRA_EXPENSES);
    paymentRepository.saveRefunds(SAMPLE_REFUNDS);
    writeJSON(STORAGE_KEYS.formationTemplates, DEFAULT_FORMATION_TEMPLATES);
    writeJSON(STORAGE_KEYS.seeded, true);
    writeJSON(STORAGE_KEYS.seedVersion, SEED_VERSION);
    writeJSON(STORAGE_KEYS.teamsSeeded, true);
    writeJSON(STORAGE_KEYS.paymentSeeded, true);
    setMembersState(seededMembers);
    setMatchesState([...SAMPLE_MATCHES].sort((a, b) => b.date.localeCompare(a.date)));
    setPaymentEntriesState(SAMPLE_PAYMENT_ENTRIES);
    setExtraExpensesState(SAMPLE_EXTRA_EXPENSES);
    setRefundsState(SAMPLE_REFUNDS);
    setFormationTemplates(DEFAULT_FORMATION_TEMPLATES);
  }, []);

  const value: AppState & AppActions = {
    ready,
    members,
    matches,
    paymentEntries,
    extraExpenses,
    refunds,
    formationTemplates,
    setMembers,
    upsertMember,
    removeMember,
    setMatches,
    upsertMatch,
    removeMatch,
    setPaymentEntries,
    setExtraExpenses,
    setRefunds,
    upsertFormationTemplate,
    resetToSample,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** 스토어 훅 */
export function useAppStore(): AppState & AppActions {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore 는 AppStoreProvider 안에서 사용해야 합니다.");
  return ctx;
}
