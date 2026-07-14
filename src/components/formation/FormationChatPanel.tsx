"use client";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { ChatRulePreview } from "./ChatRulePreview";
import { AppliedChatRules } from "./AppliedChatRules";
import type { Member } from "@/types/member";
import type { AttendanceRecord } from "@/types/match";
import type { FormationTemplate, FormationPlan } from "@/types/formation";
import type { ChatFormationRule, ChatMessage, ParsedFormationChatResult } from "@/types/chat";
import { todayISO } from "@/lib/utils/format";

const PROJECT_URL =
  process.env.NEXT_PUBLIC_OPENAI_PROJECT_URL ??
  "https://chatgpt.com/g/g-p-6a39d5a260d481918b5c48d28d40cc3d-hapeosebeun/project";

const EXAMPLES = [
  "민수는 오늘 1쿼터 쉬게 해줘",
  "준회원은 최대 2쿼터만 뛰게 해줘",
  "고정 GK 없으니까 GK 가능한 사람들로 돌려줘",
  "철수는 GK 시키지 마",
  "용병은 마지막 쿼터 위주로 넣어줘",
];

let msgSeq = 0;
const nextMsgId = () => `msg-${Date.now().toString(36)}-${msgSeq++}`;

/** 포메이션 채팅 패널 — 자연어 → 규칙 변환 */
export function FormationChatPanel({
  members,
  attendance,
  formationTemplate,
  currentPlan,
  appliedRules,
  onApplyRules,
  onRemoveRule,
  onClearRules,
  onRegenerate,
}: {
  members: Member[];
  attendance: AttendanceRecord[];
  formationTemplate: FormationTemplate;
  currentPlan?: FormationPlan;
  appliedRules: ChatFormationRule[];
  onApplyRules: (rules: ChatFormationRule[]) => void;
  onRemoveRule: (id: string) => void;
  onClearRules: () => void;
  onRegenerate: () => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [latest, setLatest] = useState<ParsedFormationChatResult | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { id: nextMsgId(), role: "user", content: message, at: todayISO() }]);
    setLoading(true);
    try {
      const res = await fetch("/api/formation-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          members,
          attendance,
          currentPlan,
          formationTemplate,
          existingChatRules: appliedRules,
        }),
      });
      const data: ParsedFormationChatResult = await res.json();
      setLatest(data);
      setMessages((prev) => [
        ...prev,
        { id: nextMsgId(), role: "assistant", content: data.assistantMessage, parsed: data, at: todayISO() },
      ]);
    } catch (e) {
      // 네트워크 실패 시에도 기능이 멈추지 않도록 fallback 표시
      setMessages((prev) => [
        ...prev,
        {
          id: nextMsgId(),
          role: "assistant",
          content: "요청을 해석하지 못했습니다. 조금 더 구체적으로 입력해주세요.",
          at: todayISO(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const applyLatest = () => {
    if (!latest) return;
    onApplyRules(latest.parsedRules);
    setLatest(null);
  };

  const resetChat = () => {
    setMessages([]);
    setLatest(null);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <h3 className="font-semibold text-gray-800">AI 포메이션 채팅</h3>
        <a
          href={PROJECT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-600 hover:underline"
          title="연결된 ChatGPT 프로젝트 채팅방 열기"
        >
          🔗 채팅방 연결됨
        </a>
      </div>

      {/* 적용 중인 규칙 */}
      <div className="border-b border-gray-100 px-4 py-2">
        <AppliedChatRules rules={appliedRules} members={members} onRemove={onRemoveRule} onClear={onClearRules} />
      </div>

      {/* 대화 내역 */}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3" style={{ minHeight: 200, maxHeight: 360 }}>
        {messages.length === 0 && (
          <div className="text-xs text-gray-400">
            <p className="mb-2">자연어로 요구사항을 입력하면 AI가 포메이션 규칙으로 변환합니다.</p>
            <div className="flex flex-wrap gap-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-800"
              }`}
            >
              {m.content}
              {m.parsed && (
                <div className="mt-2">
                  <ChatRulePreview result={m.parsed} members={members} onApply={applyLatest} />
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-gray-400">AI 가 해석 중...</div>}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div className="border-t border-gray-200 p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder="예) 오늘은 준회원 2쿼터만, 정회원 3쿼터 보장, GK 가능자로 순환해줘"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button onClick={() => send(input)} disabled={loading}>
            전송
          </Button>
          <Button variant="secondary" onClick={onRegenerate}>
            자동 배정 다시 실행
          </Button>
          <Button variant="ghost" onClick={resetChat}>
            초기화
          </Button>
        </div>
      </div>
    </div>
  );
}
