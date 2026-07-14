// ─────────────────────────────────────────────────────────────
// 엑셀 → 내부 Member 타입 파싱 (Data/Excel Agent 산출물)
// 잘못된 값/빈 값을 안전하게 처리하고, 부족한 필드는 기본값으로 채운다.
// ─────────────────────────────────────────────────────────────
import * as XLSX from "xlsx";
import type { Member, MemberType, Position, PaymentStatus, FeePeriod } from "@/types/member";
import { getFeeRule } from "@/lib/constants/feePolicy";
import { detailToGroup } from "@/lib/formation/positions";

/** 엑셀 헤더 후보 → 내부 필드 매핑 (유사 표기 허용) */
const HEADER_ALIASES: Record<string, string[]> = {
  no: ["번호", "no", "번호 ", "순번"],
  name: ["이름", "성명", "name", "회원명"],
  memberType: ["구분", "회원구분", "회원 구분", "type"],
  feeAmount: ["회비 금액", "회비금액", "회비", "금액"],
  feePeriod: ["회비 납부 구분", "납부구분", "납부 구분", "주기"],
  preferred: ["선호포지션", "선호 포지션", "포지션", "preferred", "position"],
  note: ["납부 필요 목록", "비고", "메모", "note"],
};

/**
 * 선호포지션 셀("LW,LB" / "CB.RB" / "MF") 파싱.
 * - groups: 순서가 유지된 그룹 목록(첫=주, 둘째=부)
 * - detail: 세부 포지션 토큰(예: ["CB","ST"]) — 좌우중 배치에 사용
 */
export function parsePreferred(raw: unknown): { groups: Position[]; detail: string[]; canGK: boolean } {
  const tokens = String(raw ?? "").split(/[,/.|·]+/);
  const groups: Position[] = [];
  const detail: string[] = [];
  let canGK = false;
  for (const tok of tokens) {
    const g = detailToGroup(tok);
    if (!g) continue;
    if (g === "GK") {
      canGK = true;
      continue;
    }
    const norm = tok.replace(/[^A-Za-z]/g, "").toUpperCase();
    if (norm) detail.push(norm);
    if (!groups.includes(g)) groups.push(g); // 순서 유지 + 중복 제거
  }
  return { groups, detail, canGK };
}

/** 회원 구분 문자열 정규화 */
function normalizeMemberType(raw: unknown): MemberType {
  const s = String(raw ?? "").replace(/\s/g, "");
  if (!s) return "기타";
  // 비활동(탈퇴/휴식)을 우선 판정 — "휴식(육아)" 같은 표기 포함
  if (s.includes("탈퇴")) return "탈퇴";
  if (s.includes("휴식") || s.includes("휴면")) return "휴식";
  // '부상'은 구분이 아니라 일시 상태 → 활동 정회원으로 취급(경기별 부상은 출석에서 처리)
  if (s.includes("부상")) return "정회원";
  // 스텝(파일 표기 "스탭" 포함). "스탭/월2" 처럼 겸직이면 스텝 우선
  if (s.includes("스텝") || s.includes("스탭") || s.includes("스태프")) return "스텝";
  if (s.includes("회장")) return "회장";
  // 월 2회: 파일 표기 "월2" / "월2회"
  if (s.includes("월2") || s.includes("월 2")) return "정회원(월2회)";
  if (s.includes("준회원")) return "준회원";
  if (s.includes("학생")) return "학생";
  if (s.includes("용병")) return "용병";
  // 파일 표기 "일반" = 정회원
  if (s.includes("일반") || s.includes("정회원")) return "정회원";
  return "기타";
}

/**
 * 회비 금액 정규화.
 * 하퍼세븐 엑셀은 금액을 "만원 단위"(예: 16 = 160,000원)로 적습니다.
 * 값이 0 보다 크고 1000 미만이면 만원 단위로 보고 ×10,000 보정합니다.
 * (이미 원 단위로 큰 값이면 그대로 사용)
 */
function normalizeFeeAmount(raw: unknown, memberType: MemberType): number {
  const cleaned = String(raw ?? "").replace(/[, 원]/g, "").trim();
  if (cleaned === "" || Number.isNaN(Number(cleaned))) {
    return getFeeRule(memberType).amount; // 빈 값일 때만 정책 기본값
  }
  const num = Number(cleaned);
  if (num > 0 && num < 1000) return Math.round(num * 10000);
  return num; // 0 또는 이미 원 단위
}

/** 회비 납부 주기 정규화 */
function normalizeFeePeriod(raw: unknown, memberType: MemberType): FeePeriod {
  const s = String(raw ?? "").replace(/\s/g, "");
  if (s.includes("1개월") || s.includes("매월")) return "1개월";
  if (s.includes("3개월")) return "3개월";
  if (s.includes("6개월")) return "6개월";
  if (s.includes("참석")) return "참석시";
  // 비어있으면 회원 구분 기본 정책을 따른다
  return getFeeRule(memberType).period;
}

/** 월별 셀 값 → 납부 상태 */
function parsePaymentCell(raw: unknown): PaymentStatus {
  if (raw === null || raw === undefined || String(raw).trim() === "") return "UNKNOWN";
  const s = String(raw).trim().toLowerCase();
  if (["o", "ㅇ", "완료", "납부", "v", "✓", "o.k", "ok", "y"].some((t) => s.includes(t))) return "PAID";
  if (["면제", "exempt", "-"].some((t) => s.includes(t))) return "EXEMPT";
  if (["x", "미납", "n"].some((t) => s.includes(t))) return "UNPAID";
  // 숫자(납부 금액)면 납부로 간주
  const num = Number(String(raw).replace(/[, 원]/g, ""));
  if (!Number.isNaN(num) && num > 0) return "PAID";
  return "UNKNOWN";
}

/** 헤더 row 에서 alias 로 컬럼 인덱스를 찾는다 */
function buildHeaderIndex(headerRow: unknown[]): Record<string, number> {
  const idx: Record<string, number> = {};
  headerRow.forEach((cell, i) => {
    const key = String(cell ?? "").trim().toLowerCase();
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some((a) => key === a.trim().toLowerCase())) idx[field] = i;
    }
  });
  return idx;
}

/** 시트 이름에서 연도 숫자를 추출(없으면 0) */
function yearOfSheet(name: string): number {
  const m = name.match(/(20\d{2})/);
  return m ? Number(m[1]) : 0;
}

/** 가장 최신 연도 시트 이름을 반환 */
export function pickLatestSheet(sheetNames: string[]): string {
  if (sheetNames.length === 0) return "";
  return [...sheetNames].sort((a, b) => yearOfSheet(b) - yearOfSheet(a))[0];
}

let memberSeq = 0;
function genId(): string {
  memberSeq += 1;
  return `m-import-${Date.now().toString(36)}-${memberSeq}`;
}

/** 하나의 시트를 Member[] 로 파싱 */
export function parseSheetToMembers(ws: XLSX.WorkSheet): { members: Member[]; errors: string[] } {
  const errors: string[] = [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
  if (rows.length === 0) return { members: [], errors: ["빈 시트입니다."] };

  // 헤더 row 찾기: '이름' alias 가 포함된 첫 행
  let headerRowIdx = rows.findIndex((r) =>
    r.some((cell) => HEADER_ALIASES.name.includes(String(cell ?? "").trim().toLowerCase())),
  );
  if (headerRowIdx < 0) headerRowIdx = 0;

  const headerRow = rows[headerRowIdx] as unknown[];
  const colIdx = buildHeaderIndex(headerRow);
  if (colIdx.name === undefined) {
    errors.push("'이름' 컬럼을 찾지 못했습니다. 첫 번째 데이터 컬럼을 이름으로 사용합니다.");
    colIdx.name = 1;
  }

  // 월별 컬럼(1~12) 인덱스 추정: 헤더가 1~12 숫자인 컬럼
  const monthCols: Record<number, number> = {};
  headerRow.forEach((cell, i) => {
    const s = String(cell ?? "").trim().replace(/월/g, "");
    const n = Number(s);
    if (Number.isInteger(n) && n >= 1 && n <= 12) monthCols[n] = i;
  });

  const members: Member[] = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    const name = String(row[colIdx.name] ?? "").trim();
    if (!name) continue; // 이름 없는 행은 스킵

    const memberType = normalizeMemberType(colIdx.memberType !== undefined ? row[colIdx.memberType] : "");
    const rawFee = colIdx.feeAmount !== undefined ? row[colIdx.feeAmount] : undefined;
    const feeAmount = normalizeFeeAmount(rawFee, memberType);

    const monthlyPaymentStatus: Record<number, PaymentStatus> = {};
    for (let mth = 1; mth <= 12; mth++) {
      const ci = monthCols[mth];
      monthlyPaymentStatus[mth] = ci !== undefined ? parsePaymentCell(row[ci]) : "UNKNOWN";
    }

    const noVal = colIdx.no !== undefined ? Number(row[colIdx.no]) : NaN;
    const isActive = memberType !== "탈퇴" && memberType !== "휴식";

    // 선호포지션 파싱(주/부 포지션 순서 유지)
    const pref =
      colIdx.preferred !== undefined
        ? parsePreferred(row[colIdx.preferred])
        : { groups: [] as Position[], detail: [] as string[], canGK: false };

    members.push({
      id: genId(),
      no: Number.isNaN(noVal) ? undefined : noVal,
      name,
      memberType,
      feeAmount,
      feePeriod: normalizeFeePeriod(colIdx.feePeriod !== undefined ? row[colIdx.feePeriod] : "", memberType),
      // 선호포지션 열이 있으면 그 순서(주→부)로, 없으면 ANY
      positions: pref.groups.length > 0 ? pref.groups : (["ANY"] as Position[]),
      preferredDetail: pref.detail.length > 0 ? pref.detail : undefined,
      preferredPosition: pref.groups[0],
      canPlayGK: pref.canGK,
      fixedGK: false,
      isActive,
      note: colIdx.note !== undefined ? String(row[colIdx.note] ?? "").trim() || undefined : undefined,
      monthlyPaymentStatus,
    });
  }

  if (members.length === 0) errors.push("회원 데이터를 한 건도 읽지 못했습니다. 엑셀 형식을 확인하세요.");
  return { members, errors };
}

/** 엑셀 파일(ArrayBuffer) 전체 파싱 결과 */
export type ParsedWorkbook = {
  sheetNames: string[];
  latestSheet: string;
  /** 시트별 회원 목록 */
  bySheet: Record<string, Member[]>;
  errors: string[];
};

/** ArrayBuffer 로부터 워크북을 파싱 */
export function parseWorkbook(data: ArrayBuffer): ParsedWorkbook {
  const errors: string[] = [];
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(data, { type: "array" });
  } catch (e) {
    return { sheetNames: [], latestSheet: "", bySheet: {}, errors: ["엑셀 파일을 읽을 수 없습니다. 형식을 확인하세요."] };
  }
  const bySheet: Record<string, Member[]> = {};
  for (const name of wb.SheetNames) {
    const res = parseSheetToMembers(wb.Sheets[name]);
    bySheet[name] = res.members;
    res.errors.forEach((err) => errors.push(`[${name}] ${err}`));
  }
  return {
    sheetNames: wb.SheetNames,
    latestSheet: pickLatestSheet(wb.SheetNames),
    bySheet,
    errors,
  };
}
