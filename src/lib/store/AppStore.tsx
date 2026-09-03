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
  /** 현재 데이터 전체를 백업 객체로 */
  exportSnapshot: () => BackupFile;
  /** 백업 객체로 전체 교체 (cloud: DB / local: localStorage) */
  importSnapshot: (b: BackupFile) => Promise<void>;
};

/** JSON 백업 파일 형식 */
export type BackupFile = {
  app: "haperseven";
  version: 1;
  exportedAt: string;
  members: Member[];
  matches: Match[];
  paymentEntries: PaymentEntry[];
  extraExpenses: ExtraExpense[];
  refunds: RefundRecord[];
  formationTemplates: FormationTemplate[];
  teamBalance: number;
};

/** 백업 파일 형식 검증 */
export function isBackupFile(v: unknown): v is BackupFile {
  if (!v || typeof v !== "object") return false;
  const b = v as Record<string, unknown>;
  return (
    b.app === "haperseven" &&
    Array.isArray(b.members) &&
    Array.isArray(b.matches) &&
    Array.isArray(b.paymentEntries) &&
    Array.isArray(b.extraExpenses) &&
    Array.isArray(b.refunds) &&
    Array.isArray(b.formationTemplates) &&
    typeof b.teamBalance === "number"
  );
}

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
  // cloud 쓰기에 실어 보낼 소속 팀 (canWrite 가 team_id 존재를 보장한다)
  const teamId = auth.profile?.team_id ?? "";

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
    // cloud 에서 잔고 미설정(새 팀)은 0 — local 모드는 항상 값이 채워져 들어온다
    setTeamBalanceState(s.teamBalance ?? 0);
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
        // 새 팀은 빈 상태로 시작한다 (샘플이 필요하면 설정 → 샘플 초기화)
        const snap = await cloud.fetchSnapshot();
        if (cancelled) return;
        applySnapshot(snap);
        setReady(true);
      } catch (e) {
        console.error(e);
        toast("데이터를 불러오지 못했습니다. 네트워크 상태를 확인하거나 새로고침하세요.", "error");
      }
    })();
    const unsubscribe = teamId
      ? cloud.subscribeChanges(teamId, () => {
          if (refetchTimer.current) clearTimeout(refetchTimer.current);
          refetchTimer.current = setTimeout(() => void refetch(), 400);
        })
      : () => {};
    return () => {
      cancelled = true;
      unsubscribe();
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [isCloud, auth.loading, auth.isApproved, teamId, applySnapshot, refetch, toast]);

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
      if (isCloud) persist(cloud.replaceDocs("members", m, teamId));
      else memberRepository.saveAll(m);
    },
    [guard, isCloud, persist, teamId],
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
      if (isCloud) persist(cloud.upsertDoc("members", m, teamId));
    },
    [guard, isCloud, persist, teamId],
  );
  const removeMember = useCallback(
    (id: string) => {
      if (!guard()) return;
      setMembersState((prev) => {
        const next = prev.filter((x) => x.id !== id);
        if (!isCloud) memberRepository.saveAll(next);
        return next;
      });
      if (isCloud) persist(cloud.removeDoc("members", id, teamId));
    },
    [guard, isCloud, persist, teamId],
  );

  const setMatches = useCallback(
    (m: Match[]) => {
      if (!guard()) return;
      setMatchesState(sortMatches(m));
      if (isCloud) persist(cloud.replaceDocs("matches", m, teamId));
      else matchRepository.saveAll(m);
    },
    [guard, isCloud, persist, teamId],
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
      if (isCloud) persist(cloud.upsertDoc("matches", m, teamId));
    },
    [guard, isCloud, persist, teamId],
  );
  const removeMatch = useCallback(
    (id: string) => {
      if (!guard()) return;
      setMatchesState((prev) => {
        const next = prev.filter((x) => x.id !== id);
        if (!isCloud) matchRepository.saveAll(next);
        return next;
      });
      if (isCloud) persist(cloud.removeDoc("matches", id, teamId));
    },
    [guard, isCloud, persist, teamId],
  );

  const setPaymentEntries = useCallback(
    (e: PaymentEntry[]) => {
      if (!guard()) return;
      setPaymentEntriesState(e);
      if (isCloud) persist(cloud.cloudSettings.setPaymentEntries(e, teamId));
      else paymentRepository.saveEntries(e);
    },
    [guard, isCloud, persist, teamId],
  );
  const setExtraExpenses = useCallback(
    (e: ExtraExpense[]) => {
      if (!guard()) return;
      setExtraExpensesState(e);
      if (isCloud) persist(cloud.cloudSettings.setExtraExpenses(e, teamId));
      else paymentRepository.saveExtraExpenses(e);
    },
    [guard, isCloud, persist, teamId],
  );
  const setRefunds = useCallback(
    (e: RefundRecord[]) => {
      if (!guard()) return;
      setRefundsState(e);
      if (isCloud) persist(cloud.cloudSettings.setRefunds(e, teamId));
      else paymentRepository.saveRefunds(e);
    },
    [guard, isCloud, persist, teamId],
  );
  const upsertFormationTemplate = useCallback(
    (t: FormationTemplate) => {
      if (!guard()) return;
      setFormationTemplates((prev) => {
        const exists = prev.some((x) => x.id === t.id);
        const next = exists ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
        if (isCloud) persist(cloud.cloudSettings.setFormationTemplates(next, teamId));
        else writeJSON(STORAGE_KEYS.formationTemplates, next);
        return next;
      });
    },
    [guard, isCloud, persist, teamId],
  );
  const setTeamBalance = useCallback(
    (n: number) => {
      if (!guard()) return;
      const v = Math.max(0, Math.round(n));
      setTeamBalanceState(v);
      if (isCloud) persist(cloud.cloudSettings.setTeamBalance(v, teamId));
      else writeJSON(STORAGE_KEYS.teamBalance, v);
    },
    [guard, isCloud, persist, teamId],
  );

  const resetToSample = useCallback(() => {
    if (!guard()) return;
    const s = sampleSnapshot();
    if (isCloud) {
      persist(cloud.writeSnapshot(s, teamId).then(refetch));
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
  }, [guard, isCloud, persist, refetch, applySnapshot, teamId]);

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
    await cloud.writeSnapshot(local, teamId);
    await refetch();
  }, [isCloud, guard, refetch, teamId]);

  const exportSnapshot = useCallback(
    (): BackupFile => ({
      app: "haperseven",
      version: 1,
      exportedAt: new Date().toISOString(),
      members,
      matches,
      paymentEntries,
      extraExpenses,
      refunds,
      formationTemplates,
      teamBalance,
    }),
    [members, matches, paymentEntries, extraExpenses, refunds, formationTemplates, teamBalance],
  );

  const importSnapshot = useCallback(
    async (b: BackupFile) => {
      if (!guard()) return;
      const s = {
        members: b.members,
        matches: b.matches,
        paymentEntries: b.paymentEntries,
        extraExpenses: b.extraExpenses,
        refunds: b.refunds,
        formationTemplates: b.formationTemplates.length ? b.formationTemplates : DEFAULT_FORMATION_TEMPLATES,
        teamBalance: b.teamBalance,
      };
      if (isCloud) {
        await cloud.writeSnapshot(s, teamId);
        await refetch();
        return;
      }
      memberRepository.saveAll(s.members);
      matchRepository.saveAll(s.matches);
      paymentRepository.saveEntries(s.paymentEntries);
      paymentRepository.saveExtraExpenses(s.extraExpenses);
      paymentRepository.saveRefunds(s.refunds);
      writeJSON(STORAGE_KEYS.formationTemplates, s.formationTemplates);
      writeJSON(STORAGE_KEYS.teamBalance, s.teamBalance);
      applySnapshot(s);
    },
    [guard, isCloud, refetch, applySnapshot, teamId],
  );

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
    exportSnapshot,
    importSnapshot,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** 스토어 훅 */
export function useAppStore(): AppState & AppActions {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore 는 AppStoreProvider 안에서 사용해야 합니다.");
  return ctx;
}
