// ─────────────────────────────────────────────────────────────
// POST /api/formation-chat
// 관리자의 자연어 요청을 받아 ChatGPT 로 포메이션 규칙(JSON)을 추출한다.
// API Key 는 서버에서만 사용되며 프론트로 노출되지 않는다.
// ─────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import type { FormationChatRequest } from "@/types/chat";
import { callFormationChat, fallbackResult } from "@/lib/openai/formationChatClient";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: FormationChatRequest;
  try {
    body = (await request.json()) as FormationChatRequest;
  } catch {
    return NextResponse.json(fallbackResult("요청 형식이 올바르지 않습니다."), { status: 400 });
  }

  if (!body?.message || typeof body.message !== "string") {
    return NextResponse.json(fallbackResult("메시지를 입력해주세요."), { status: 400 });
  }

  // callFormationChat 은 내부에서 실패를 fallback 으로 처리하므로 항상 200 으로 결과를 반환
  const result = await callFormationChat({
    message: body.message,
    members: body.members ?? [],
    attendance: body.attendance ?? [],
    currentPlan: body.currentPlan,
    formationTemplate: body.formationTemplate,
    existingChatRules: body.existingChatRules ?? [],
  });

  return NextResponse.json(result, { status: 200 });
}
