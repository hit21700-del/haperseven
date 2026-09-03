"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CloudUpload, Copy, Download, FileUp, ImageUp, LogOut, RefreshCw, ShieldCheck, Shield, Trash2, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAppStore, isBackupFile, type BackupFile } from "@/lib/store/AppStore";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select, FormRow, TextInput } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TH, TD, TR } from "@/components/ui/Table";
import { TeamLogo } from "@/components/brand/TeamIdentity";
import { fetchAllProfiles, updateProfile, deleteProfile, updateTeam, type Profile } from "@/lib/repository/cloudRepository";

const STATUS_LABEL: Record<Profile["status"], string> = { pending: "승인 대기", approved: "승인", blocked: "차단" };
const ROLE_LABEL: Record<Profile["role"], string> = { operator: "운영자", member: "회원" };

export function SettingsPage() {
  const auth = useAuth();
  const { mode, canWrite, members, resetToSample, importLocalToCloud, exportSnapshot, importSnapshot } = useAppStore();
  const toast = useToast();
  const [resetOpen, setResetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backupTarget, setBackupTarget] = useState<BackupFile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadBackup = () => {
    const snap = exportSnapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `haperseven-backup-${snap.exportedAt.slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast(`백업 파일을 저장했습니다. (회원 ${snap.members.length}명 · 경기 ${snap.matches.length}건)`);
  };

  const pickBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!isBackupFile(parsed)) throw new Error("하퍼세븐 백업 파일이 아닙니다.");
      setBackupTarget(parsed);
    } catch (e) {
      toast(e instanceof Error ? e.message : "파일을 읽지 못했습니다.", "error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

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

      {/* 팀 정보 */}
      {mode === "cloud" && auth.team && <TeamCard />}

      {/* 계정 관리 (운영자) */}
      {mode === "cloud" && canWrite && <AccountsManager members={members} myId={auth.profile?.id ?? ""} />}

      {/* 데이터 */}
      <Card>
        <SectionTitle icon={<RefreshCw size={14} />}>데이터</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={downloadBackup} disabled={busy}>
            <Download size={15} aria-hidden="true" /> 백업 파일 다운로드 (JSON)
          </Button>
          {canWrite && (
            <>
              <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
                <FileUp size={15} aria-hidden="true" /> 백업 파일 가져오기
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                aria-label="백업 파일 선택"
                onChange={(e) => void pickBackup(e.target.files?.[0])}
              />
              {mode === "cloud" && (
                <Button variant="secondary" onClick={() => setImportOpen(true)} disabled={busy}>
                  <CloudUpload size={15} aria-hidden="true" /> 이 브라우저의 데이터를 DB로 올리기
                </Button>
              )}
              <Button variant="secondary" onClick={() => setResetOpen(true)} disabled={busy}>
                <Trash2 size={15} aria-hidden="true" /> 샘플 데이터로 초기화
              </Button>
            </>
          )}
        </div>
        <p className="mt-2 text-xs text-fg-muted">
          백업 파일은 회원·회비·경기·포메이션·잔고 전체를 담습니다.{" "}
          {mode === "cloud"
            ? "다른 브라우저에서 내려받은 백업을 '가져오기'로 올리면 DB 데이터가 그 파일로 교체됩니다."
            : "클라우드로 전환한 뒤 이 파일을 '가져오기'하면 지금 데이터가 그대로 옮겨집니다."}
        </p>
      </Card>

      <ConfirmDialog
        open={backupTarget !== null}
        title="백업 파일 가져오기"
        message={
          backupTarget && (
            <>
              <b>{backupTarget.exportedAt.slice(0, 10)}</b> 백업 (회원 {backupTarget.members.length}명 · 경기 {backupTarget.matches.length}건 · 잔고{" "}
              {backupTarget.teamBalance.toLocaleString("ko-KR")}원)으로 {mode === "cloud" ? "DB" : "이 브라우저"}의 데이터를 모두 교체합니다. 되돌릴 수
              없습니다.
            </>
          )
        }
        confirmLabel="가져오기"
        onConfirm={async () => {
          const b = backupTarget;
          setBackupTarget(null);
          if (!b) return;
          setBusy(true);
          try {
            await importSnapshot(b);
            toast("백업을 가져왔습니다.");
          } catch (e) {
            toast(e instanceof Error ? e.message : "가져오기에 실패했습니다.", "error");
          } finally {
            setBusy(false);
          }
        }}
        onCancel={() => setBackupTarget(null)}
      />

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

/** 팀 정보 — 이름/분류코드 수정(운영자), 로고 업로드, 코드 복사 */
function TeamCard() {
  const { team, canWrite, refreshProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(team?.name ?? "");
  const [code, setCode] = useState(team?.code ?? "");
  const [busy, setBusy] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  // 값 자체가 바뀔 때만 입력창을 동기화 (백그라운드 재조회로 새 team 객체가 와도 편집 중 내용 유지)
  useEffect(() => {
    setName(team?.name ?? "");
    setCode(team?.code ?? "");
  }, [team?.id, team?.name, team?.code]);

  if (!team) return null;
  const dirty = name.trim() !== team.name || code.trim().toUpperCase() !== team.code;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(team.code);
      toast(`분류코드 ${team.code} 를 복사했습니다. 팀원에게 알려주세요.`);
    } catch {
      toast("복사하지 못했습니다.", "error");
    }
  };

  const save = async () => {
    const n = name.trim();
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!n) return toast("팀 이름을 입력하세요.", "error");
    if (c.length < 2 || c.length > 12) return toast("분류코드는 영문/숫자 2~12자여야 합니다.", "error");
    setBusy(true);
    try {
      await updateTeam(team.id, { name: n, code: c });
      await refreshProfile();
      toast("팀 정보를 저장했습니다.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast(msg.includes("duplicate") || msg.includes("unique") ? "이미 사용 중인 분류코드입니다." : "저장하지 못했습니다.", "error");
    } finally {
      setBusy(false);
    }
  };

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 128);
      await updateTeam(team.id, { logo_url: dataUrl });
      await refreshProfile();
      toast("팀 로고를 변경했습니다.");
    } catch {
      toast("로고를 올리지 못했습니다. 이미지 파일인지 확인하세요.", "error");
    } finally {
      setBusy(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  };

  return (
    <Card>
      <SectionTitle icon={<Shield size={14} />}>팀 정보</SectionTitle>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-col items-center gap-2">
          <TeamLogo team={team} size={64} />
          {canWrite && (
            <>
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
              >
                <ImageUp size={13} aria-hidden="true" /> 로고 변경
              </button>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="팀 로고 이미지 선택"
                onChange={(e) => void pickLogo(e.target.files?.[0])}
              />
            </>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {canWrite ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormRow label="팀 이름">
                <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="팀 이름" />
              </FormRow>
              <FormRow label="분류코드" hint="팀원이 가입할 때 입력하는 코드">
                <TextInput
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="HSFC"
                  autoCapitalize="characters"
                />
              </FormRow>
            </div>
          ) : (
            <div className="text-sm">
              <div className="font-semibold text-fg">{team.name}</div>
              <div className="text-fg-muted">분류코드: {team.code}</div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void copyCode()}>
              <Copy size={15} aria-hidden="true" /> 분류코드 복사
            </Button>
            {canWrite && dirty && (
              <Button onClick={() => void save()} disabled={busy}>
                저장
              </Button>
            )}
          </div>
          <p className="text-xs text-fg-muted">
            팀원은 가입 화면에서 분류코드 <b className="text-fg">{team.code}</b> 를 입력해 이 팀에 가입할 수 있습니다.
          </p>
        </div>
      </div>
    </Card>
  );
}

/** 이미지 파일을 정사각형으로 리사이즈해 PNG data URL 로 변환 */
async function resizeImageToDataUrl(file: File, size: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) throw new Error("이미지 크기를 읽을 수 없습니다. 다른 이미지를 사용하세요.");
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    const scale = Math.max(size / iw, size / ih);
    const w = iw * scale;
    const h = ih * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
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
