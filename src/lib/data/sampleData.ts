// ─────────────────────────────────────────────────────────────
// 샘플(기본) 데이터 — 회원 명단은 실제 엑셀
//   "하퍼세븐_20260623회비 납부 내역.xlsx" 의 [2025] 시트 기준으로 생성됨.
//   선호포지션 열(주/부 + 세부 포지션 CB/ST/RB…)을 반영했습니다.
// ※ 나이/GK 가능 여부 등은 엑셀에 없어 기본값입니다(회원 수정에서 변경).
// ※ 월별 납부 현황은 엑셀 셀 색상 표기라 자동 추출 불가 → 회비 화면에서 마킹.
//    (회비 0원 회원은 자동 '면제' 처리)
// ─────────────────────────────────────────────────────────────
import type { Member } from "@/types/member";
import type { Match } from "@/types/match";
import type { PaymentEntry, ExtraExpense, RefundRecord } from "@/types/payment";

const YEAR = 2025;

// 시드 데이터 버전. 이 값이 바뀌면 앱이 자동으로 기본 명단을 다시 불러옵니다.
// (명단/포지션을 갱신할 때마다 올려주세요. 단, 사용자가 입력한 데이터는 초기화됩니다.)
export const SEED_VERSION = "20260624-11man-grid-2";

// [2025] 시트 실제 회원 명단 (세부 선호포지션 반영)
export const SAMPLE_MEMBERS: Member[] = [
  { id:"m1", no:1, name:"봉진영", memberType:"스텝", feeAmount:160000, feePeriod:"6개월", positions:["FW","DF"], preferredDetail:["LW","LB"], preferredPosition:"FW", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m2", no:2, name:"고혁준", memberType:"정회원", feeAmount:0, feePeriod:"6개월", positions:["MF","FW"], preferredDetail:["MF","ST"], preferredPosition:"MF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m3", no:3, name:"양윤석", memberType:"정회원(월2회)", feeAmount:0, feePeriod:"6개월", positions:["DF"], preferredDetail:["CB","RB"], preferredPosition:"DF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m4", no:4, name:"박찬해", memberType:"정회원", feeAmount:180000, feePeriod:"6개월", positions:["FW","DF"], preferredDetail:["ST","LB"], preferredPosition:"FW", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m5", no:5, name:"황민성", memberType:"스텝", feeAmount:160000, feePeriod:"6개월", positions:["MF","FW"], preferredDetail:["MF","ST"], preferredPosition:"MF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m6", no:6, name:"황동건", memberType:"스텝", feeAmount:160000, feePeriod:"6개월", positions:["FW","DF"], preferredDetail:["RW","LB"], preferredPosition:"FW", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m7", no:7, name:"김민수", memberType:"스텝", feeAmount:160000, feePeriod:"6개월", positions:["DF","FW"], preferredDetail:["RB","RW"], preferredPosition:"DF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m8", no:8, name:"황인태", memberType:"회장", feeAmount:160000, feePeriod:"6개월", positions:["DF","FW"], preferredDetail:["CB","ST"], preferredPosition:"DF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m9", no:9, name:"강혁준", memberType:"정회원", feeAmount:180000, feePeriod:"6개월", positions:["MF","DF"], preferredDetail:["MF","RB"], preferredPosition:"MF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m11", no:11, name:"정영빈", memberType:"정회원(월2회)", feeAmount:90000, feePeriod:"6개월", positions:["DF"], preferredDetail:["CB","RB"], preferredPosition:"DF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m12", no:12, name:"이우섭", memberType:"정회원", feeAmount:180000, feePeriod:"6개월", positions:["FW","MF"], preferredDetail:["RW","MF"], preferredPosition:"FW", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m13", no:13, name:"권태진", memberType:"스텝", feeAmount:90000, feePeriod:"6개월", positions:["MF","DF"], preferredDetail:["MF","RB"], preferredPosition:"MF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m16", no:16, name:"오한샘", memberType:"준회원", feeAmount:0, feePeriod:"6개월", positions:["ANY"], preferredDetail:undefined, preferredPosition:undefined, canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m17", no:17, name:"윤종현", memberType:"준회원", feeAmount:0, feePeriod:"6개월", positions:["MF"], preferredDetail:["MF"], preferredPosition:"MF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m18", no:18, name:"이양호", memberType:"정회원", feeAmount:0, feePeriod:"6개월", positions:["MF","DF"], preferredDetail:["MF","CB"], preferredPosition:"MF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m19", no:19, name:"이중한", memberType:"정회원", feeAmount:0, feePeriod:"6개월", positions:["ANY"], preferredDetail:undefined, preferredPosition:undefined, canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m20", no:20, name:"최우람", memberType:"정회원(월2회)", feeAmount:90000, feePeriod:"6개월", positions:["DF","FW"], preferredDetail:["CB","ST"], preferredPosition:"DF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m21", no:21, name:"이창현", memberType:"준회원", feeAmount:0, feePeriod:"6개월", positions:["FW","MF"], preferredDetail:["ST","MF"], preferredPosition:"FW", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m22", no:22, name:"이장형", memberType:"정회원", feeAmount:180000, feePeriod:"6개월", positions:["MF"], preferredDetail:["MF"], preferredPosition:"MF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m23", no:23, name:"이수형", memberType:"정회원", feeAmount:0, feePeriod:"6개월", positions:["MF","DF"], preferredDetail:["MF","CB"], preferredPosition:"MF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m24", no:24, name:"이종창", memberType:"정회원", feeAmount:180000, feePeriod:"6개월", positions:["DF","MF"], preferredDetail:["CB","MF"], preferredPosition:"DF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m25", no:25, name:"이지섭", memberType:"정회원", feeAmount:180000, feePeriod:"6개월", positions:["FW","DF"], preferredDetail:["RW","RB"], preferredPosition:"FW", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m26", no:26, name:"정원형", memberType:"정회원", feeAmount:0, feePeriod:"6개월", positions:["ANY"], preferredDetail:undefined, preferredPosition:undefined, canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m27", no:27, name:"전승명", memberType:"휴식", feeAmount:0, feePeriod:"6개월", positions:["ANY"], preferredDetail:undefined, preferredPosition:undefined, canPlayGK:false, fixedGK:false, isActive:false, monthlyPaymentStatus:{} },
  { id:"m28", no:28, name:"송영오", memberType:"정회원(월2회)", feeAmount:90000, feePeriod:"6개월", positions:["DF"], preferredDetail:["RB","LB"], preferredPosition:"DF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m29", no:29, name:"임건", memberType:"정회원", feeAmount:180000, feePeriod:"6개월", positions:["DF","MF"], preferredDetail:["RB","MF"], preferredPosition:"DF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m30", no:30, name:"배현우", memberType:"정회원", feeAmount:180000, feePeriod:"6개월", positions:["FW","DF"], preferredDetail:["RW","CB"], preferredPosition:"FW", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m31", no:31, name:"봉진우", memberType:"학생", feeAmount:140000, feePeriod:"6개월", positions:["DF"], preferredDetail:["CB","RB"], preferredPosition:"DF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m32", no:32, name:"최성우", memberType:"정회원", feeAmount:180000, feePeriod:"6개월", positions:["FW"], preferredDetail:["ST","RW"], preferredPosition:"FW", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m33", no:33, name:"성태현", memberType:"정회원", feeAmount:180000, feePeriod:"6개월", positions:["DF"], preferredDetail:["RB","LB"], preferredPosition:"DF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m34", no:34, name:"이영기", memberType:"휴식", feeAmount:0, feePeriod:"6개월", positions:["ANY"], preferredDetail:undefined, preferredPosition:undefined, canPlayGK:false, fixedGK:false, isActive:false, monthlyPaymentStatus:{} },
  { id:"m35", no:35, name:"박건", memberType:"정회원", feeAmount:180000, feePeriod:"6개월", positions:["FW"], preferredDetail:["RW","LW"], preferredPosition:"FW", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
  { id:"m36", no:36, name:"정민영", memberType:"준회원", feeAmount:0, feePeriod:"6개월", positions:["MF"], preferredDetail:["MF"], preferredPosition:"MF", canPlayGK:false, fixedGK:false, isActive:true, monthlyPaymentStatus:{} },
];

export const SAMPLE_MATCHES: Match[] = [
  {
    id: "match1",
    date: `${YEAR}-06-08`,
    title: "정기전 (샘플)",
    location: "잠실 보조경기장",
    quarterCount: 4,
    attendance: [
      { memberId: "m1", status: "ATTEND" },
      { memberId: "m2", status: "ATTEND" },
      { memberId: "m3", status: "ATTEND" },
      { memberId: "m4", status: "ATTEND" },
      { memberId: "m5", status: "LATE" },
      { memberId: "m6", status: "ATTEND" },
      { memberId: "m7", status: "ATTEND" },
      { memberId: "m8", status: "ATTEND" },
      { memberId: "m9", status: "ATTEND" },
      { memberId: "m11", status: "ATTEND" },
      { memberId: "m12", status: "ATTEND" },
      { memberId: "m13", status: "ATTEND" },
      { memberId: "m16", status: "INJURED" },
    ],
    stats: [
      { memberId: "m2", goals: 2, assists: 1 },
      { memberId: "m4", goals: 1, assists: 0 },
      { memberId: "m7", goals: 1, assists: 2 },
      { memberId: "m1", goals: 0, assists: 1 },
    ],
  },
];

export const SAMPLE_PAYMENT_ENTRIES: PaymentEntry[] = [];
export const SAMPLE_EXTRA_EXPENSES: ExtraExpense[] = [
  { id: "e1", date: `${YEAR}-01-04`, item: "운영진 회의", amount: 36500 },
  { id: "e2", date: `${YEAR}-01-21`, item: "25년 MVP 시상", amount: 28200 },
  { id: "e3", date: `${YEAR}-01-21`, item: "공로상", amount: 96600 },
];
export const SAMPLE_REFUNDS: RefundRecord[] = [];
