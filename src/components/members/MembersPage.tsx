"use client";
import React, { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { Button } from "@/components/ui/Button";
import { Table, THead, TH, TD, TR } from "@/components/ui/Table";
import { MemberTypeBadge, PositionBadge, Badge, TeamBadge } from "@/components/ui/Badge";
import { TextInput, Select } from "@/components/ui/Field";
import { StatIconCard } from "@/components/ui/StatIconCard";
import { MemberFormModal } from "./MemberFormModal";
import { ExcelImportModal } from "./ExcelImportModal";
import type { Member } from "@/types/member";
import { ALL_MEMBER_TYPES } from "@/types/member";
import { exportMembersToExcel } from "@/lib/excel/excelExporter";
import { formatWon } from "@/lib/utils/format";

export function MembersPage() {
  const { members, upsertMember, removeMember, setMembers } = useAppStore();
  const [editing, setEditing] = useState<Member | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
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

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">회원 관리</h1>
          <p className="mt-0.5 text-sm text-gray-400">팀의 모든 회원을 관리하고 정보를 확인하세요.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            📥 엑셀 가져오기
          </Button>
          <Button variant="secondary" onClick={() => exportMembersToExcel(members)}>
            📤 엑셀 내보내기
          </Button>
          <Button onClick={openAdd}>👤 회원 추가</Button>
        </div>
      </div>

      {/* 검색/필터 + 지표 카드 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_12px_rgba(80,70,160,0.06)] xl:col-span-1">
          <TextInput
            placeholder="이름 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="mb-2"
          />
          <Select
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
        </div>
        <StatIconCard icon="👥" iconBg="bg-brand-50" iconColor="text-brand-600" label="전체 회원" value={`${members.length}명`} sub="팀의 모든 등록 회원" />
        <StatIconCard icon="🛡" iconBg="bg-blue-50" iconColor="text-blue-500" label="정회원" value={`${jeongCount}명`} sub="월 회비 납부 회원" />
        <StatIconCard icon="🧑" iconBg="bg-red-50" iconColor="text-red-500" label="스텝" value={`${stepCount}명`} sub="코칭 및 운영 스텝" />
      </div>

      {/* 테이블 */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_12px_rgba(80,70,160,0.06)]">
        <div className="mb-2 text-sm text-gray-500">총 회원 수 {filtered.length}명</div>
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
              <TH>회비</TH>
              <TH>관리</TH>
            </TR>
          </THead>
          <tbody>
            {pageRows.map((m) => (
              <TR key={m.id} className={!m.isActive ? "text-gray-400" : ""}>
                <TD className="text-gray-400">{m.no ?? "-"}</TD>
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
                <TD className="font-medium">{formatWon(m.feeAmount)}</TD>
                <TD>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(m)}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      ✎ 수정
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`${m.name} 회원을 삭제할까요?`)) removeMember(m.id);
                      }}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50"
                    >
                      🗑 삭제
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
            {pageRows.length === 0 && (
              <TR>
                <TD className="text-gray-400">조건에 맞는 회원이 없습니다.</TD>
              </TR>
            )}
          </tbody>
        </Table>

        {/* 페이지네이션 */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-gray-500">전체 {filtered.length}명</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={curPage <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - curPage) <= 2 || p === 1 || p === totalPages)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-300">…</span>}
                  <button
                    onClick={() => setPage(p)}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm ${
                      p === curPage ? "bg-brand-600 font-semibold text-white" : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={curPage >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-40"
            >
              ›
            </button>
          </div>
          <Select
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
      </div>

      <MemberFormModal open={formOpen} initial={editing} onClose={() => setFormOpen(false)} onSave={upsertMember} />
      <ExcelImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
    </div>
  );
}
