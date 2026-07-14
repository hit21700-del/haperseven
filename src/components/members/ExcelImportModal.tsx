"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import type { Member } from "@/types/member";
import { parseWorkbook, type ParsedWorkbook } from "@/lib/excel/excelParser";

/** 엑셀 회원 import 모달 (시트 선택 + 미리보기) */
export function ExcelImportModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (members: Member[], mode: "replace" | "merge") => void;
}) {
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [sheet, setSheet] = useState<string>("");
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const [fileError, setFileError] = useState<string>("");

  const handleFile = async (file: File) => {
    setFileError("");
    try {
      const buf = await file.arrayBuffer();
      const result = parseWorkbook(buf);
      if (result.sheetNames.length === 0) {
        setFileError(result.errors.join(" ") || "엑셀을 읽지 못했습니다.");
        return;
      }
      setParsed(result);
      setSheet(result.latestSheet); // 최신 연도 시트 기본 선택
    } catch {
      setFileError("파일을 읽는 중 오류가 발생했습니다.");
    }
  };

  const members = parsed && sheet ? parsed.bySheet[sheet] ?? [] : [];

  const handleImport = () => {
    if (members.length === 0) {
      alert("가져올 회원이 없습니다.");
      return;
    }
    onImport(members, mode);
    setParsed(null);
    setSheet("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="엑셀 회원 가져오기"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleImport} disabled={members.length === 0}>
            {members.length}명 가져오기
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm text-gray-600">
            회원 명단 엑셀 파일(.xlsx)을 선택하세요. <code>2023년 명단</code> / <code>2024년 명단</code> /{" "}
            <code>2025</code> 처럼 연도별 시트를 인식하며, 기본으로 <b>최신 연도 시트</b>를 선택합니다.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-white"
          />
          {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}
        </div>

        {parsed && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">시트 선택</label>
                <Select value={sheet} onChange={(e) => setSheet(e.target.value)}>
                  {parsed.sheetNames.map((s) => (
                    <option key={s} value={s}>
                      {s} ({parsed.bySheet[s]?.length ?? 0}명)
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">가져오기 방식</label>
                <Select value={mode} onChange={(e) => setMode(e.target.value as "replace" | "merge")}>
                  <option value="replace">기존 명단 대체</option>
                  <option value="merge">기존 명단에 추가</option>
                </Select>
              </div>
            </div>

            {parsed.errors.length > 0 && (
              <div className="rounded-lg bg-yellow-50 p-2 text-xs text-yellow-700">
                {parsed.errors.map((e, i) => (
                  <div key={i}>⚠ {e}</div>
                ))}
              </div>
            )}

            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 text-sm">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-2 py-1 text-left">이름</th>
                    <th className="px-2 py-1 text-left">구분</th>
                    <th className="px-2 py-1 text-right">회비</th>
                  </tr>
                </thead>
                <tbody>
                  {members.slice(0, 50).map((m) => (
                    <tr key={m.id} className="border-t border-gray-100">
                      <td className="px-2 py-1">{m.name}</td>
                      <td className="px-2 py-1">{m.memberType}</td>
                      <td className="px-2 py-1 text-right">{m.feeAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400">
              ※ 나이/포지션/GK 가능 여부는 엑셀에 없으므로 가져온 뒤 회원 수정에서 입력하세요.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
