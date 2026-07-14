// ─────────────────────────────────────────────────────────────
// ChatGPT(OpenAI) 연동 클라이언트 — 서버 전용
//
// ⚠️ 이 파일은 절대 클라이언트 컴포넌트에서 import 하지 마세요.
//    OPENAI_API_KEY 는 서버에서만 사용됩니다.
// ─────────────────────────────────────────────────────────────
import OpenAI from "openai";
import type { Member } from "@/types/member";
import type {
  ChatFormationRule,
  ParsedFormationChatResult,
  FormationChatRequest,
  ChatFormationRuleType,
} from "@/types/chat";

/** 모델명: 환경변수 우선, 없으면 기본값 */
const DEFAULT_MODEL = "gpt-5.5";
export function getModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

/** 시스템 프롬프트(요구사항 7번 그대로) */
const SYSTEM_PROMPT = `너는 아마추어 축구팀 포메이션 운영 보조 AI야.

관리자의 자연어 요청을 분석해서 포메이션 자동 배정 시스템이 이해할 수 있는 JSON 규칙으로 변환해야 한다.

반드시 아래 원칙을 따른다.

1. 실제 포메이션을 직접 확정하지 말고, 시스템에 적용할 규칙을 추출한다.
2. 선수 이름이 여러 명과 유사하거나 찾을 수 없으면 ASK_CLARIFICATION을 반환한다.
3. 선수 이름이 명확하면 memberId를 채운다.
4. 4쿼터 기준으로 해석한다.
5. GK는 별도 포지션으로 취급한다.
6. 고정 GK가 없으면 GK_ROTATION 규칙을 사용할 수 있다.
7. 준회원, 용병, 정회원 등 회원 구분 조건을 해석한다.
8. 나이, 부상, 지각, 체력 관련 요청은 최대 쿼터 제한 또는 연속 출전 제한으로 변환한다.
9. 응답은 반드시 정해진 JSON schema로만 반환한다.
10. 불확실한 내용은 억지로 추정하지 말고 warnings 또는 ASK_CLARIFICATION으로 반환한다.`;

/** 모델이 따라야 할 JSON 출력 스키마 설명(프롬프트에 포함) */
const OUTPUT_FORMAT_GUIDE = `반드시 아래 JSON 형식으로만 응답해.
{
  "assistantMessage": string,            // 사람에게 보여줄 한국어 요약
  "parsedRules": ChatFormationRule[],    // 아래 type 들 중 하나의 객체 배열
  "warnings": string[],
  "shouldRegenerate": boolean,
  "suggestedAction": "APPLY_RULES" | "ASK_CLARIFICATION" | "NO_CHANGE"
}

ChatFormationRule 의 type 종류:
- { "type": "FORCE_REST", "memberName": string, "quarter": number }
- { "type": "FORCE_POSITION", "memberName": string, "position": "GK"|"DF"|"MF"|"FW", "quarter"?: number }
- { "type": "BAN_POSITION", "memberName": string, "position": "GK"|"DF"|"MF"|"FW", "quarter"?: number }
- { "type": "MAX_QUARTERS", "memberName": string, "maxQuarters": number }
- { "type": "MIN_QUARTERS", "memberName": string, "minQuarters": number }
- { "type": "MAX_QUARTERS_BY_MEMBER_TYPE", "memberType": string, "maxQuarters": number }
- { "type": "PRIORITIZE_MEMBER_TYPE", "memberType": string, "priority": number }
- { "type": "AVOID_CONSECUTIVE_QUARTERS", "memberName": string, "maxConsecutiveQuarters": number }
- { "type": "GK_ROTATION", "enabled": boolean }
- { "type": "CUSTOM_NOTE", "note": string }

회원구분(memberType) 값: 스텝, 정회원, 정회원(월2회), 준회원, 학생, 용병, 회장.
각 규칙에는 가능하면 "reason" 에 한 줄 사유를 넣어줘.`;

const VALID_RULE_TYPES: ChatFormationRuleType[] = [
  "FORCE_REST",
  "FORCE_POSITION",
  "BAN_POSITION",
  "MAX_QUARTERS",
  "MIN_QUARTERS",
  "MAX_QUARTERS_BY_MEMBER_TYPE",
  "PRIORITIZE_MEMBER_TYPE",
  "AVOID_CONSECUTIVE_QUARTERS",
  "GK_ROTATION",
  "CUSTOM_NOTE",
];

/** JSON 파싱 실패 시 fallback 응답 */
export function fallbackResult(message?: string): ParsedFormationChatResult {
  return {
    assistantMessage: message ?? "요청을 해석하지 못했습니다. 조금 더 구체적으로 입력해주세요.",
    parsedRules: [],
    warnings: ["AI 응답을 규칙으로 변환하지 못했습니다."],
    shouldRegenerate: false,
    suggestedAction: "NO_CHANGE",
  };
}

let ruleSeq = 0;
function genRuleId(): string {
  ruleSeq += 1;
  return `rule-${Date.now().toString(36)}-${ruleSeq}`;
}

/** 이름 → memberId 매핑(서버 측에서도 보조적으로 채움) */
function attachMemberId(rule: Record<string, unknown>, members: Member[]): void {
  const name = rule.memberName as string | undefined;
  if (!name || rule.memberId) return;
  const norm = name.replace(/\s/g, "").toLowerCase();
  const match = members.filter((m) => m.name.replace(/\s/g, "").toLowerCase() === norm);
  if (match.length === 1) rule.memberId = match[0].id;
}

/**
 * 모델이 돌려준 객체를 ParsedFormationChatResult 로 검증/정규화한다.
 * 형식이 어긋난 규칙은 버리되, 전체가 깨지지 않게 방어적으로 처리.
 */
export function validateAndNormalize(parsed: unknown, members: Member[]): ParsedFormationChatResult {
  if (typeof parsed !== "object" || parsed === null) return fallbackResult();
  const obj = parsed as Record<string, unknown>;

  const rawRules = Array.isArray(obj.parsedRules) ? obj.parsedRules : [];
  const parsedRules: ChatFormationRule[] = [];
  for (const r of rawRules) {
    if (typeof r !== "object" || r === null) continue;
    const rule = { ...(r as Record<string, unknown>) };
    if (!VALID_RULE_TYPES.includes(rule.type as ChatFormationRuleType)) continue;
    attachMemberId(rule, members);
    if (!rule.id) rule.id = genRuleId();
    parsedRules.push(rule as unknown as ChatFormationRule);
  }

  const suggested = obj.suggestedAction;
  const suggestedAction: ParsedFormationChatResult["suggestedAction"] =
    suggested === "APPLY_RULES" || suggested === "ASK_CLARIFICATION" || suggested === "NO_CHANGE"
      ? suggested
      : parsedRules.length > 0
        ? "APPLY_RULES"
        : "NO_CHANGE";

  return {
    assistantMessage:
      typeof obj.assistantMessage === "string" && obj.assistantMessage.trim()
        ? obj.assistantMessage
        : "요청을 해석했습니다.",
    parsedRules,
    warnings: Array.isArray(obj.warnings) ? obj.warnings.filter((w): w is string => typeof w === "string") : [],
    shouldRegenerate: Boolean(obj.shouldRegenerate) || parsedRules.length > 0,
    suggestedAction,
  };
}

/**
 * 실제 OpenAI 호출. 실패하면 throw 하지 않고 fallback 을 반환한다.
 * (포메이션 기능 전체가 멈추지 않도록)
 */
export async function callFormationChat(req: FormationChatRequest): Promise<ParsedFormationChatResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackResult(
      "OPENAI_API_KEY 가 설정되지 않았습니다. .env.local 에 키를 넣으면 채팅 기능이 동작합니다. (현재는 데모 모드)",
    );
  }

  const client = new OpenAI({ apiKey });

  // 선수 명단을 모델이 이름→id 매칭에 쓸 수 있도록 간략 컨텍스트로 전달
  const roster = req.members.map((m) => ({
    id: m.id,
    name: m.name,
    memberType: m.memberType,
    canPlayGK: m.canPlayGK,
    fixedGK: m.fixedGK,
    age: m.age,
  }));
  const fixedGKExists = req.members.some((m) => m.fixedGK);

  const userContent = `# 관리자 요청
${req.message}

# 포메이션 템플릿
${req.formationTemplate.name} (정원 ${req.formationTemplate.playerCount}명)

# 고정 GK 존재 여부
${fixedGKExists ? "있음" : "없음"}

# 참석 선수 명단(JSON)
${JSON.stringify(roster)}

# 이미 적용 중인 규칙(JSON)
${JSON.stringify(req.existingChatRules ?? [])}

${OUTPUT_FORMAT_GUIDE}`;

  try {
    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // 원본 응답 로그(민감정보 없음). API Key 는 로깅하지 않음.
      console.error("[formation-chat] JSON 파싱 실패. 원본 응답:", text);
      return fallbackResult();
    }
    return validateAndNormalize(parsed, req.members);
  } catch (e) {
    // 네트워크/모델 오류 — API Key 등 민감정보는 로그에 남기지 않음
    console.error("[formation-chat] OpenAI 호출 실패:", e instanceof Error ? e.message : "unknown error");
    return fallbackResult("AI 서버 호출에 실패했습니다. 잠시 후 다시 시도하거나 규칙을 직접 추가해주세요.");
  }
}
