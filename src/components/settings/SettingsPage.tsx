"use client";
import React, { useCallback, useEffect, useState } from "react";
import { CloudUpload, LogOut, RefreshCw, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAppStore } from "@/lib/store/AppStore";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TH, TD, TR } from "@/components/ui/Table";
import { fetchAllProfiles, updateProfile, deleteProfile, type Profile } from "@/lib/repository/cloudRepository";

const STATUS_LABEL: Record<Profile["status"], string> = { pending: "승인 대기", approved: "승인", blocked: "차단" };
const ROLE_LABEL: Record<Profile["role"], string> = { operator: "운영자", member: "회원" };

export function SettingsPage() {
  const auth = useAuth();
  const { mode, canWrite, members, resetToSample, importLocalToCloud } = useAppStore();
  const toast = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader title="설정" description={mode === "cloud" ? "계정, 팀원 승인, 데이터 관리" : "이 브라우저에 저장되는 로컬 모드입니다."} />

      {/* 내 계정 */}
      <Card>
        <SectionTitle icon={<ShieldCheck size={14} />}>내 계정</SectionTitle>
        {mode === "cloud" && auth.profile ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-semibold text-fg">{auth.profile.display_name ?? "이름 없음"}</div>
              <div className="text-fg-muted">
                {auth.profile.email ?? "—"} · {auth.profile.provider ?? "email"} 로그인
              </div>
              <div className="mt-1 flex gap-1.5">
                <Badge tone={auth.profile.role === "operator" ? "blue" : "gray"}>{ROLE_LABEL[auth.profile.role]}</Badge>
                {auth.profile.member_id ? (
                  <Badge tone="green">회원 연결: {members.find((m) => m.id === auth.profile!.member_id)?.name ?? "?"}</Badge>
                ) : (
                  <Badge tone="yellow">회원 미연결</Badge>
                )}
              </div>
            </div>
            <Button variant="secondary" onClick={() => void auth.signOut()}>
              <LogOut size={15} aria-hidden="true" /> 로그아웃
            </Button>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">
            Supabase 가 설정되지 않아 로그인 없이 이 브라우저에만 데이터가 저장됩니다. 여러 기기에서 공유하려면{" "}
            <code className="rounded bg-surface-3 px-1 text-xs">.env.local</code> 에 Supabase 키를 설정하세요.
          </p>
        )}
      </Card>

      {/* 계정 관리 (운영자) */}
      {mode === "cloud" && canWrite && <AccountsManager members={members} myId={auth.profile?.id ?? ""} />}

      {/* 데이터 */}
      {canWrite && (
        <Card>
          <SectionTitle icon={<RefreshCw size={14} />}>데이터</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {mode === "cloud" && (
              <Button variant="secondary" onClick={() => setImportOpen(true)} disabled={busy}>
                <CloudUpload size={15} aria-hidden="true" /> 이 브라우저의 데이터를 DB로 올리기
              </Button>
            )}
            <Button variant="secondary" onClick={() => setResetOpen(true)} disabled={busy}>
              <Trash2 size={15} aria-hidden="true" /> 샘플 데이터로 초기화
            </Button>
          </div>
          <p className="mt-2 text-xs text-fg-muted">
            {mode === "cloud"
              ? "예전에 이 PC 브라우저에서 입력했던 회원·회비·경기 기록을 DB로 옮길 때 한 번만 사용하세요. DB의 현재 데이터를 덮어씁니다."
              : "회원·회비·경기·포메이션 기록이 모두 지워지고 기본 샘플로 바뀝니다."}
          </p>
        </Card>
      )}

      <ConfirmDialog
        open={resetOpen}
        title="샘플 데이터로 초기화"
        message="회원·회비·경기·포메이션 기록이 모두 지워지고 기본 샘플로 바뀝니다. 되돌릴 수 없습니다."
        confirmLabel="초기화"
        onConfirm={() => {
          resetToSample();
          setResetOpen(false);
          toast("샘플 데이터로 초기화했습니다.", "info");
        }}
        onCancel={() => setResetOpen(false)}
      />
      <ConfirmDialog
        open={importOpen}
        title="브라우저 데이터를 DB로 올리기"
        message="DB에 있는 회원·회비·경기·포메이션 데이터가 이 브라우저에 저장된 데이터로 모두 교체됩니다. 되돌릴 수 없습니다."
        confirmLabel="올리기"
        onConfirm={async () => {
          setImportOpen(false);
          setBusy(true);
          try {
            await importLocalToCloud();
            toast("브라우저 데이터를 DB로 옮겼습니다.");
          } catch (e) {
            toast(e instanceof Error ? e.message : "가져오기에 실패했습니다.", "error");
          } finally {
            setBusy(false);
          }
        }}
        onCancel={() => setImportOpen(false)}
      />
    </div>
  );
}

/** 운영자용 계정 승인/역할/회원 연결 */
function AccountsManager({ members, myId }: { members: { id: string; name: string; isActive: boolean }[]; myId: string }) {
  const toast = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    try {
      setProfiles(await fetchAllProfiles());
    } catch {
      toast("계정 목록을 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (id: string, p: Parameters<typeof updateProfile>[1], msg: string) => {
    try {
      await updateProfile(id, p);
      await load();
      toast(msg);
    } catch {
      toast("변경하지 못했습니다.", "error");
    }
  };

  const pending = profiles.filter((p) => p.status === "pending").length;

  return (
    <Card>
      <SectionTitle
        icon={<UserCheck size={14} />}
        action={pending > 0 ? <Badge tone="yellow">승인 대기 {pending}명</Badge> : undefined}
      >
        계정 관리
      </SectionTitle>
      {loading ? (
        <p className="py-4 text-sm text-fg-muted">불러오는 중…</p>
      ) : profiles.length === 0 ? (
        <EmptyState compact title="가입한 계정이 없습니다" description="팀원이 가입하면 여기서 승인하고 회원 명단과 연결합니다." />
      ) : (
        <>
          {/* 모바일 카드 */}
          <ul className="space-y-2 md:hidden">
            {profiles.map((p) => (
              <li key={p.id} className="rounded-xl border border-line bg-surface-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-fg">
                      {p.display_name ?? "이름 없음"} {p.id === myId && <span className="text-xs text-fg-muted">(나)</span>}
                    </div>
                    <div className="truncate text-xs text-fg-muted">{p.email ?? p.provider}</div>
                  </div>
                  <Badge tone={p.status === "approved" ? "green" : p.status === "pending" ? "yellow" : "red"}>{STATUS_LABEL[p.status]}</Badge>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <Select value={p.status} onChange={(e) => patch(p.id, { status: e.target.value as Profile["status"] }, "상태를 변경했습니다.")} aria-label="상태" disabled={p.id === myId}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </Select>
                  <Select value={p.role} onChange={(e) => patch(p.id, { role: e.target.value as Profile["role"] }, "역할을 변경했습니다.")} aria-label="역할" disabled={p.id === myId}>
                    {Object.entries(ROLE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </Select>
                  <Select value={p.member_id ?? ""} onChange={(e) => patch(p.id, { member_id: e.target.value || null }, "회원을 연결했습니다.")} aria-label="연결 회원">
                    <option value="">회원 미연결</option>
                    {members.filter((m) => m.isActive).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </Select>
                </div>
              </li>
            ))}
          </ul>
          {/* 데스크톱 표 */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>이름</TH>
                  <TH>이메일 / 로그인</TH>
                  <TH>가입일</TH>
                  <TH>상태</TH>
                  <TH>역할</TH>
                  <TH>연결 회원</TH>
                  <TH> </TH>
                </TR>
              </THead>
              <tbody>
                {profiles.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium text-fg">
                      {p.display_name ?? "이름 없음"} {p.id === myId && <span className="text-xs text-fg-muted">(나)</span>}
                    </TD>
                    <TD className="text-fg-muted">
                      {p.email ?? "—"} <span className="text-xs">· {p.provider ?? "email"}</span>
                    </TD>
                    <TD className="text-fg-muted">{p.created_at.slice(0, 10)}</TD>
                    <TD>
                      <Select className="w-28" value={p.status} disabled={p.id === myId} aria-label="상태"
                        onChange={(e) => patch(p.id, { status: e.target.value as Profile["status"] }, "상태를 변경했습니다.")}>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </Select>
                    </TD>
                    <TD>
                      <Select className="w-24" value={p.role} disabled={p.id === myId} aria-label="역할"
                        onChange={(e) => patch(p.id, { role: e.target.value as Profile["role"] }, "역할을 변경했습니다.")}>
                        {Object.entries(ROLE_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </Select>
                    </TD>
                    <TD>
                      <Select className="w-32" value={p.member_id ?? ""} aria-label="연결 회원"
                        onChange={(e) => patch(p.id, { member_id: e.target.value || null }, "회원을 연결했습니다.")}>
                        <option value="">미연결</option>
                        {members.filter((m) => m.isActive).map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </Select>
                    </TD>
                    <TD>
                      {p.id !== myId && (
                        <button type="button" onClick={() => setDeleteTarget(p)} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15">
                          삭제
                        </button>
                      )}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
      <p className="mt-3 text-xs text-fg-muted">
        승인 + 회원 연결까지 해야 팀원이 자기 참석 투표를 할 수 있습니다. 운영자는 모든 데이터를 편집할 수 있고, 회원은 조회와 본인 투표만 가능합니다.
      </p>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="계정 삭제"
        message={<>{deleteTarget?.display_name ?? deleteTarget?.email} 계정의 접근 권한을 삭제합니다. 다시 가입하면 승인 대기로 돌아옵니다.</>}
        confirmLabel="삭제"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteProfile(deleteTarget.id);
            await load();
            toast("계정을 삭제했습니다.", "info");
          } catch {
            toast("삭제하지 못했습니다.", "error");
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </Card>
  );
}
