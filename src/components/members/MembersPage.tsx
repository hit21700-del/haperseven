"use client";
import React, { useMemo, useState } from "react";
import { Upload, Download, UserPlus, Pencil, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Table, THead, TH, TD, TR } from "@/components/ui/Table";
import { MemberTypeBadge, PositionBadge, Badge, TeamBadge } from "@/components/ui/Badge";
import { TextInput, Select } from "@/components/ui/Field";
import { StatIconCard } from "@/components/ui/StatIconCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { MemberFormModal } from "./MemberFormModal";
import { ExcelImportModal } from "./ExcelImportModal";
import type { Member } from "@/types/member";
import { ALL_MEMBER_TYPES } from "@/types/member";
import { aggregate } from "@/lib/stats/statsService";
import { formatWon, currentYear } from "@/lib/utils/format";

const TABLE_COLS = 11;

export function MembersPage() {
  const { members, matches, upsertMember, removeMember, setMembers } = useAppStore();
  const [editing, setEditing] = useState<Member | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("전체");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        if (filterType !== "전체" && m.memberType !== filterType) return false;
        if (search && !m.name.includes(search)) return false;
        return true;
      }),
    [members, search, filterType],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * pageSize, curPage * pageSize);

  // 올해(시즌) 회원별 출석/득점 집계 → memberId 키 Map
  const seasonStats = useMemo(() => {
    const aggs = aggregate(members, matches, { type: "year", year: currentYear() });
    return new Map(aggs.map((a) => [a.memberId, a]));
  }, [members, matches]);

  const jeongCount = members.filter((m) => m.memberType.startsWith("정회원")).length;
  const stepCount = members.filter((m) => m.memberType === "스텝").length;

  const handleImport = (imported: Member[], mode: "replace" | "merge") => {
    if (mode === "replace") setMembers(imported);
    else setMembers([...members, ...imported]);
  };
  const openAdd = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (m: Member) => {
    setEditing(m);
    setFormOpen(true);
  };
  const handleExport = async () => {
    const mod = await import("@/lib/excel/excelExporter");
    mod.exportMembersToExcel(members);
  };
  const clearFilters = () => {
    setSearch("");
    setFilterType("전체");
    setPage(1);
  };

  const emptyState = (
    <EmptyState
      compact
      icon={<Search size={18} aria-hidden="true" />}
      title={search ? `'${search}'에 맞는 회원이 없습니다` : "조건에 맞는 회원이 없습니다"}
      description="검색어나 구분 필터를 바꿔 보세요."
      action={
        <Button variant="secondary" onClick={clearFilters}>
          필터 지우기
        </Button>
      }
    />
  );

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <PageHeader
        title="회원 관리"
        description="팀의 모든 회원을 관리하고 정보를 확인하세요."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload size={16} aria-hidden="true" />
              엑셀 가져오기
            </Button>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} aria-hidden="true" />
              엑셀 내보내기
            </Button>
            <Button onClick={openAdd}>
              <UserPlus size={16} aria-hidden="true" />
              회원 추가
            </Button>
          </div>
        }
      />

      {/* 지표 카드 + 검색/필터 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatIconCard icon="👥" iconBg="bg-brand-50" iconColor="text-brand-600" label="전체 회원" value={`${members.length}명`} sub="팀의 모든 등록 회원" />
        <StatIconCard icon="🛡" iconBg="bg-sky-50" iconColor="text-sky-600" label="정회원" value={`${jeongCount}명`} sub="월 회비 납부 회원" />
        <StatIconCard icon="🧑" iconBg="bg-red-50" iconColor="text-red-600" label="스텝" value={`${stepCount}명`} sub="코칭 및 운영 스텝" />
        <Card className="!p-4">
          <TextInput
            placeholder="이름 검색"
            aria-label="이름 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="mb-2"
          />
          <Select
            aria-label="회원 구분 필터"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
          >
            <option value="전체">전체 구분</option>
            {ALL_MEMBER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Card>
      </div>

      {/* 테이블 */}
      <Card>
        <div className="mb-2 text-sm text-gray-500">총 회원 수 {filtered.length}명</div>

        {/* 데스크톱: 테이블 */}
        <div className="hidden md:block">
          <Table>
            <THead>
              <TR>
                <TH>번호</TH>
                <TH>이름</TH>
                <TH>구분</TH>
                <TH>팀</TH>
                <TH>나이</TH>
                <TH>포지션</TH>
                <TH>GK</TH>
                <TH>출석</TH>
                <TH>득점</TH>
                <TH>회비</TH>
                <TH>관리</TH>
              </TR>
            </THead>
            <tbody>
              {pageRows.map((m) => {
                const stat = seasonStats.get(m.id);
                const attend = stat?.attendCount ?? 0;
                const goals = stat?.goals ?? 0;
                return (
                  <TR key={m.id} className={!m.isActive ? "text-gray-500" : ""}>
                    <TD className="text-gray-500">{m.no ?? "-"}</TD>
                    <TD className="font-semibold text-gray-700">{m.name}</TD>
                    <TD>
                      <MemberTypeBadge type={m.memberType} />
                    </TD>
                    <TD>
                      <TeamBadge team={m.team} coach={m.isCoach} />
                    </TD>
                    <TD>{m.age ?? "-"}</TD>
                    <TD>
                      <div className="flex gap-1">
                        {m.positions.map((p) => (
                          <PositionBadge key={p} position={p} />
                        ))}
                      </div>
                    </TD>
                    <TD>
                      {m.fixedGK ? <Badge tone="purple">고정GK</Badge> : m.canPlayGK ? <Badge tone="blue">가능</Badge> : "-"}
                    </TD>
                    <TD>{attend > 0 ? `${attend}회` : <span className="text-gray-500">-</span>}</TD>
                    <TD>{goals > 0 ? `${goals}골` : <span className="text-gray-500">-</span>}</TD>
                    <TD className="font-medium">{formatWon(m.feeAmount)}</TD>
                    <TD>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          <Pencil size={13} aria-hidden="true" />
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(m)}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          삭제
                        </button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={TABLE_COLS} className="px-4 py-3">
                    {emptyState}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* 모바일: 카드 리스트 */}
        <div className="space-y-2 md:hidden">
          {pageRows.map((m) => {
            const stat = seasonStats.get(m.id);
            const attend = stat?.attendCount ?? 0;
            const goals = stat?.goals ?? 0;
            return (
              <Card
                key={m.id}
                className={`flex items-center justify-between gap-3 !p-3 ${!m.isActive ? "opacity-60" : ""}`}
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-gray-800">{m.name}</span>
                    <MemberTypeBadge type={m.memberType} />
                    <TeamBadge team={m.team} coach={m.isCoach} />
                  </div>
                  {m.positions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.positions.map((p) => (
                        <PositionBadge key={p} position={p} />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>
                      출석 {attend > 0 ? <span className="font-semibold text-gray-700">{attend}회</span> : <span className="text-gray-500">-</span>}
                    </span>
                    <span>
                      득점 {goals > 0 ? <span className="font-semibold text-gray-700">{goals}골</span> : <span className="text-gray-500">-</span>}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(m)}
                  className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  aria-label={`${m.name} 수정`}
                >
                  <Pencil size={13} aria-hidden="true" />
                  수정
                </button>
              </Card>
            );
          })}
          {pageRows.length === 0 && <Card>{emptyState}</Card>}
        </div>

        {/* 페이지네이션 */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-gray-500">전체 {filtered.length}명</span>
          <nav className="flex items-center gap-1" aria-label="페이지 이동">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={curPage <= 1}
              aria-label="이전 페이지"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - curPage) <= 2 || p === 1 || p === totalPages)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-500">…</span>}
                  <button
                    type="button"
                    onClick={() => setPage(p)}
                    aria-label={`${p}페이지`}
                    aria-current={p === curPage ? "page" : undefined}
                    className={`flex h-8 min-w-8 items-center justify-center px-2 text-sm ${
                      p === curPage
                        ? "rounded-lg bg-brand-600 font-semibold text-white"
                        : "rounded-lg border border-line bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={curPage >= totalPages}
              aria-label="다음 페이지"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
          <Select
            aria-label="페이지당 표시 개수"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="w-32"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}개씩 보기
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <MemberFormModal open={formOpen} initial={editing} onClose={() => setFormOpen(false)} onSave={upsertMember} />
      <ExcelImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />

      {/* 회원 삭제 확인 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="회원 삭제"
        message={
          deleteTarget && (
            <>
              <b>{deleteTarget.name}</b> 회원의 회비·출석 기록이 함께 삭제됩니다. 되돌릴 수 없습니다.
            </>
          )
        }
        confirmLabel="삭제"
        onConfirm={() => {
          if (deleteTarget) removeMember(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
