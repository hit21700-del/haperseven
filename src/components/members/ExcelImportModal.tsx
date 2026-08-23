"use client";
import React, { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormRow, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import type { Member } from "@/types/member";
import type { ParsedWorkbook } from "@/lib/excel/excelParser";

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
  const toast = useToast();
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [sheet, setSheet] = useState<string>("");
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const [fileError, setFileError] = useState<string>("");

  const handleFile = async (file: File) => {
    setFileError("");
    try {
      const buf = await file.arrayBuffer();
      const { parseWorkbook } = await import("@/lib/excel/excelParser");
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
      toast("가져올 회원이 없습니다. 파일과 시트를 확인하세요.", "error");
      return;
    }
    onImport(members, mode);
    toast(`${members.length}명의 회원을 가져왔습니다.`);
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
            aria-label="엑셀 파일 선택"
            aria-invalid={fileError ? true : undefined}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:font-semibold file:text-white"
          />
          {fileError && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {fileError}
            </p>
          )}
        </div>

        {parsed && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormRow label="시트 선택">
                <Select value={sheet} onChange={(e) => setSheet(e.target.value)}>
                  {parsed.sheetNames.map((s) => (
                    <option key={s} value={s}>
                      {s} ({parsed.bySheet[s]?.length ?? 0}명)
                    </option>
                  ))}
                </Select>
              </FormRow>
              <FormRow label="가져오기 방식">
                <Select value={mode} onChange={(e) => setMode(e.target.value as "replace" | "merge")}>
                  <option value="replace">기존 명단 대체</option>
                  <option value="merge">기존 명단에 추가</option>
                </Select>
              </FormRow>
            </div>

            {parsed.errors.length > 0 && (
              <div role="alert" className="space-y-0.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                {parsed.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="max-h-48 overflow-y-auto rounded-lg border border-line text-sm">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 text-xs text-gray-600">
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
                      <td className="px-2 py-1 text-right tabular-nums">{m.feeAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">
              나이/포지션/GK 가능 여부는 엑셀에 없으므로 가져온 뒤 회원 수정에서 입력하세요.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
