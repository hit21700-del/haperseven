"use client";
// ─────────────────────────────────────────────────────────────
// 전역 상태 스토어
//   - local 모드: localStorage 저장소 (Supabase 미설정 시)
//   - cloud 모드: Supabase (여러 기기 공유, 실시간 동기화, 운영자만 쓰기)
// 모든 화면은 이 스토어의 동일한 API 를 사용한다.
// ─────────────────────────────────────────────────────────────
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
import { applyPaymentSeed, SEED_VERSION_PAYMENT } from "@/lib/data/paymentSeed";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import * as cloud from "@/lib/repository/cloudRepository";

const DEFAULT_BALANCE = 8_825_526;

type AppState = {
  ready: boolean;
  mode: "local" | "cloud";
  /** 쓰기 가능 여부 (local: 항상 true / cloud: 운영자만) */
  canWrite: boolean;
  members: Member[];
  matches: Match[];
  paymentEntries: PaymentEntry[];
  extraExpenses: ExtraExpense[];
  refunds: RefundRecord[];
  formationTemplates: FormationTemplate[];
  teamBalance: number;
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
  setTeamBalance: (n: number) => void;
  resetToSample: () => void;
  /** (cloud) 이 브라우저의 localStorage 데이터를 DB 로 올려 덮어쓴다 */
  importLocalToCloud: () => Promise<void>;
};

const AppContext = createContext<(AppState & AppActions) | null>(null);

const sortMatches = (m: Match[]) => [...m].sort((a, b) => b.date.localeCompare(a.date));

/** 샘플 시드 스냅샷 (팀 배정 + 회비 반영 포함) */
function sampleSnapshot() {
  return {
    members: applyPaymentSeed(applyDefaultTeams(SAMPLE_MEMBERS)),
    matches: SAMPLE_MATCHES,
    paymentEntries: SAMPLE_PAYMENT_ENTRIES,
    extraExpenses: SAMPLE_EXTRA_EXPENSES,
    refunds: SAMPLE_REFUNDS,
    formationTemplates: DEFAULT_FORMATION_TEMPLATES,
    teamBalance: DEFAULT_BALANCE,
  };
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const toast = useToast();
  const isCloud = auth.mode === "cloud";

  const [ready, setReady] = useState(false);
  const [members, setMembersState] = useState<Member[]>([]);
  const [matches, setMatchesState] = useState<Match[]>([]);
  const [paymentEntries, setPaymentEntriesState] = useState<PaymentEntry[]>([]);
  const [extraExpenses, setExtraExpensesState] = useState<ExtraExpense[]>([]);
  const [refunds, setRefundsState] = useState<RefundRecord[]>([]);
  const [formationTemplates, setFormationTemplates] = useState<FormationTemplate[]>(DEFAULT_FORMATION_TEMPLATES);
  const [teamBalance, setTeamBalanceState] = useState<number>(DEFAULT_BALANCE);

  /* ── 공통: 스냅샷 적용 ── */
  const applySnapshot = useCallback((s: cloud.CloudSnapshot) => {
    setMembersState(s.members);
    setMatchesState(sortMatches(s.matches));
    setPaymentEntriesState(s.paymentEntries);
    setExtraExpensesState(s.extraExpenses);
    setRefundsState(s.refunds);
    setFormationTemplates(s.formationTemplates ?? DEFAULT_FORMATION_TEMPLATES);
    setTeamBalanceState(s.teamBalance ?? DEFAULT_BALANCE);
  }, []);

  /* ── local 모드 로드 (기존 동작 그대로) ── */
  useEffect(() => {
    if (isCloud) return;
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
    let loadedMembers = memberRepository.getAll();
    if (!readJSON<boolean>(STORAGE_KEYS.teamsSeeded, false)) {
      loadedMembers = applyDefaultTeams(loadedMembers);
      memberRepository.saveAll(loadedMembers);
      writeJSON(STORAGE_KEYS.teamsSeeded, true);
    }
    if (readJSON<string | boolean>(STORAGE_KEYS.paymentSeeded, "") !== SEED_VERSION_PAYMENT) {
      loadedMembers = applyPaymentSeed(loadedMembers);
      memberRepository.saveAll(loadedMembers);
      writeJSON(STORAGE_KEYS.paymentSeeded, SEED_VERSION_PAYMENT);
    }
    applySnapshot({
      members: loadedMembers,
      matches: matchRepository.getAll(),
      paymentEntries: paymentRepository.getEntries(),
      extraExpenses: paymentRepository.getExtraExpenses(),
      refunds: paymentRepository.getRefunds(),
      formationTemplates: readJSON<FormationTemplate[]>(STORAGE_KEYS.formationTemplates, DEFAULT_FORMATION_TEMPLATES),
      teamBalance: readJSON<number>(STORAGE_KEYS.teamBalance, DEFAULT_BALANCE),
    });
    setReady(true);
  }, [isCloud, applySnapshot]);

  /* ── cloud 모드 로드 + 실시간 동기화 ── */
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refetch = useCallback(async () => {
    try {
      applySnapshot(await cloud.fetchSnapshot());
    } catch {
      /* 일시 오류는 무시 (다음 변경 때 재시도) */
    }
  }, [applySnapshot]);

  useEffect(() => {
    if (!isCloud) return;
    if (auth.loading || !auth.isApproved) {
      setReady(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let snap = await cloud.fetchSnapshot();
        // 첫 실행(빈 DB)이고 운영자면 샘플로 시작
        if (snap.members.length === 0 && auth.canWrite) {
          await cloud.writeSnapshot(sampleSnapshot());
          snap = await cloud.fetchSnapshot();
        }
        if (cancelled) return;
        applySnapshot(snap);
        setReady(true);
      } catch (e) {
        console.error(e);
        toast("데이터를 불러오지 못했습니다. 네트워크 상태를 확인하거나 새로고침하세요.", "error");
      }
    })();
    const unsubscribe = cloud.subscribeChanges(() => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(() => void refetch(), 400);
    });
    return () => {
      cancelled = true;
      unsubscribe();
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [isCloud, auth.loading, auth.isApproved, auth.canWrite, applySnapshot, refetch, toast]);

  /* ── 쓰기 가드 + 영속화 ── */
  const canWrite = auth.canWrite;
  const guard = useCallback(() => {
    if (isCloud && !canWrite) {
      toast("운영자만 수정할 수 있습니다.", "error");
      return false;
    }
    return true;
  }, [isCloud, canWrite, toast]);

  const persist = useCallback(
    (p: Promise<void>) => {
      p.catch((e) => {
        console.error(e);
        toast("저장하지 못했습니다. 권한이 없거나 네트워크 오류입니다.", "error");
        void refetch();
      });
    },
    [toast, refetch],
  );

  /* ── 액션 ── */
  const setMembers = useCallback(
    (m: Member[]) => {
      if (!guard()) return;
      setMembersState(m);
      if (isCloud) persist(cloud.replaceDocs("members", m));
      else memberRepository.saveAll(m);
    },
    [guard, isCloud, persist],
  );
  const upsertMember = useCallback(
    (m: Member) => {
      if (!guard()) return;
      setMembersState((prev) => {
        const exists = prev.some((x) => x.id === m.id);
        const next = exists ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m];
        if (!isCloud) memberRepository.saveAll(next);
        return next;
      });
      if (isCloud) persist(cloud.upsertDoc("members", m));
    },
    [guard, isCloud, persist],
  );
  const removeMember = useCallback(
    (id: string) => {
      if (!guard()) return;
      setMembersState((prev) => {
        const next = prev.filter((x) => x.id !== id);
        if (!isCloud) memberRepository.saveAll(next);
        return next;
      });
      if (isCloud) persist(cloud.removeDoc("members", id));
    },
    [guard, isCloud, persist],
  );

  const setMatches = useCallback(
    (m: Match[]) => {
      if (!guard()) return;
      setMatchesState(sortMatches(m));
      if (isCloud) persist(cloud.replaceDocs("matches", m));
      else matchRepository.saveAll(m);
    },
    [guard, isCloud, persist],
  );
  const upsertMatch = useCallback(
    (m: Match) => {
      if (!guard()) return;
      setMatchesState((prev) => {
        const exists = prev.some((x) => x.id === m.id);
        const next = sortMatches(exists ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]);
        if (!isCloud) matchRepository.saveAll(next);
        return next;
      });
      if (isCloud) persist(cloud.upsertDoc("matches", m));
    },
    [guard, isCloud, persist],
  );
  const removeMatch = useCallback(
    (id: string) => {
      if (!guard()) return;
      setMatchesState((prev) => {
        const next = prev.filter((x) => x.id !== id);
        if (!isCloud) matchRepository.saveAll(next);
        return next;
      });
      if (isCloud) persist(cloud.removeDoc("matches", id));
    },
    [guard, isCloud, persist],
  );

  const setPaymentEntries = useCallback(
    (e: PaymentEntry[]) => {
      if (!guard()) return;
      setPaymentEntriesState(e);
      if (isCloud) persist(cloud.cloudSettings.setPaymentEntries(e));
      else paymentRepository.saveEntries(e);
    },
    [guard, isCloud, persist],
  );
  const setExtraExpenses = useCallback(
    (e: ExtraExpense[]) => {
      if (!guard()) return;
      setExtraExpensesState(e);
      if (isCloud) persist(cloud.cloudSettings.setExtraExpenses(e));
      else paymentRepository.saveExtraExpenses(e);
    },
    [guard, isCloud, persist],
  );
  const setRefunds = useCallback(
    (e: RefundRecord[]) => {
      if (!guard()) return;
      setRefundsState(e);
      if (isCloud) persist(cloud.cloudSettings.setRefunds(e));
      else paymentRepository.saveRefunds(e);
    },
    [guard, isCloud, persist],
  );
  const upsertFormationTemplate = useCallback(
    (t: FormationTemplate) => {
      if (!guard()) return;
      setFormationTemplates((prev) => {
        const exists = prev.some((x) => x.id === t.id);
        const next = exists ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
        if (isCloud) persist(cloud.cloudSettings.setFormationTemplates(next));
        else writeJSON(STORAGE_KEYS.formationTemplates, next);
        return next;
      });
    },
    [guard, isCloud, persist],
  );
  const setTeamBalance = useCallback(
    (n: number) => {
      if (!guard()) return;
      const v = Math.max(0, Math.round(n));
      setTeamBalanceState(v);
      if (isCloud) persist(cloud.cloudSettings.setTeamBalance(v));
      else writeJSON(STORAGE_KEYS.teamBalance, v);
    },
    [guard, isCloud, persist],
  );

  const resetToSample = useCallback(() => {
    if (!guard()) return;
    const s = sampleSnapshot();
    if (isCloud) {
      persist(cloud.writeSnapshot(s).then(refetch));
      return;
    }
    clearAll();
    memberRepository.saveAll(s.members);
    matchRepository.saveAll(s.matches);
    paymentRepository.saveEntries(s.paymentEntries);
    paymentRepository.saveExtraExpenses(s.extraExpenses);
    paymentRepository.saveRefunds(s.refunds);
    writeJSON(STORAGE_KEYS.formationTemplates, DEFAULT_FORMATION_TEMPLATES);
    writeJSON(STORAGE_KEYS.teamBalance, DEFAULT_BALANCE);
    writeJSON(STORAGE_KEYS.seeded, true);
    writeJSON(STORAGE_KEYS.seedVersion, SEED_VERSION);
    writeJSON(STORAGE_KEYS.teamsSeeded, true);
    writeJSON(STORAGE_KEYS.paymentSeeded, SEED_VERSION_PAYMENT);
    applySnapshot({ ...s, formationTemplates: DEFAULT_FORMATION_TEMPLATES });
  }, [guard, isCloud, persist, refetch, applySnapshot]);

  const importLocalToCloud = useCallback(async () => {
    if (!isCloud || !guard()) return;
    const local = {
      members: memberRepository.getAll(),
      matches: matchRepository.getAll(),
      paymentEntries: paymentRepository.getEntries(),
      extraExpenses: paymentRepository.getExtraExpenses(),
      refunds: paymentRepository.getRefunds(),
      formationTemplates: readJSON<FormationTemplate[]>(STORAGE_KEYS.formationTemplates, DEFAULT_FORMATION_TEMPLATES),
      teamBalance: readJSON<number>(STORAGE_KEYS.teamBalance, DEFAULT_BALANCE),
    };
    if (local.members.length === 0) throw new Error("이 브라우저에 저장된 회원 데이터가 없습니다.");
    await cloud.writeSnapshot(local);
    await refetch();
  }, [isCloud, guard, refetch]);

  const value: AppState & AppActions = {
    ready,
    mode: auth.mode,
    canWrite,
    members,
    matches,
    paymentEntries,
    extraExpenses,
    refunds,
    formationTemplates,
    teamBalance,
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
    setTeamBalance,
    resetToSample,
    importLocalToCloud,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** 스토어 훅 */
export function useAppStore(): AppState & AppActions {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore 는 AppStoreProvider 안에서 사용해야 합니다.");
  return ctx;
}
