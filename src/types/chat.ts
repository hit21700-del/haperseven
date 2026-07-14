// ─────────────────────────────────────────────────────────────
// 포메이션 채팅(ChatGPT 연동) 관련 타입 정의
// ─────────────────────────────────────────────────────────────
import type { Member, Position } from "./member";
import type { FormationTemplate, FormationPlan } from "./formation";
import type { AttendanceRecord } from "./match";

/** 채팅으로 해석된 포메이션 규칙 */
export type ChatFormationRule =
  | {
      id: string;
      type: "FORCE_REST";
      memberId?: string;
      memberName?: string;
      quarter: number;
      reason?: string;
    }
  | {
      id: string;
      type: "FORCE_POSITION";
      memberId?: string;
      memberName?: string;
      position: Position;
      quarter?: number;
      reason?: string;
    }
  | {
      id: string;
      type: "BAN_POSITION";
      memberId?: string;
      memberName?: string;
      position: Position;
      quarter?: number;
      reason?: string;
    }
  | {
      id: string;
      type: "MAX_QUARTERS";
      memberId?: string;
      memberName?: string;
      maxQuarters: number;
      reason?: string;
    }
  | {
      id: string;
      type: "MIN_QUARTERS";
      memberId?: string;
      memberName?: string;
      minQuarters: number;
      reason?: string;
    }
  | {
      id: string;
      type: "MAX_QUARTERS_BY_MEMBER_TYPE";
      memberType: Member["memberType"];
      maxQuarters: number;
      reason?: string;
    }
  | {
      id: string;
      type: "PRIORITIZE_MEMBER_TYPE";
      memberType: Member["memberType"];
      priority: number;
      reason?: string;
    }
  | {
      id: string;
      type: "AVOID_CONSECUTIVE_QUARTERS";
      memberId?: string;
      memberName?: string;
      maxConsecutiveQuarters: number;
      reason?: string;
    }
  | {
      id: string;
      type: "GK_ROTATION";
      enabled: boolean;
      reason?: string;
    }
  | {
      id: string;
      type: "CUSTOM_NOTE";
      note: string;
    };

export type ChatFormationRuleType = ChatFormationRule["type"];

/** 서버 API 응답을 파싱한 구조화 결과 */
export type ParsedFormationChatResult = {
  assistantMessage: string;
  parsedRules: ChatFormationRule[];
  warnings: string[];
  shouldRegenerate: boolean;
  suggestedAction: "APPLY_RULES" | "ASK_CLARIFICATION" | "NO_CHANGE";
};

/** /api/formation-chat 요청 본문 */
export type FormationChatRequest = {
  message: string;
  members: Member[];
  attendance: AttendanceRecord[];
  currentPlan?: FormationPlan;
  formationTemplate: FormationTemplate;
  existingChatRules?: ChatFormationRule[];
};

/** /api/formation-chat 응답 본문 */
export type FormationChatResponse = ParsedFormationChatResult;

/** 채팅 UI 의 한 메시지 */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** assistant 메시지에 동봉된 해석 결과 */
  parsed?: ParsedFormationChatResult;
  /** 시각 표시용 ISO 문자열 */
  at: string;
};
