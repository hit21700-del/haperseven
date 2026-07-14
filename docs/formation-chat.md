# 포메이션 자동 배정 & AI 채팅 설계

## 1. 자동 배정 알고리즘 (`generateFormationPlan`)

```ts
generateFormationPlan({
  members,            // 전체 회원
  attendance,         // 출석 기록
  formationTemplate,  // 포지션별 슬롯
  quarterCount: 4,
  rules,              // 기본 운영 규칙(선택)
  chatRules,          // 채팅으로 만든 규칙(선택)
}): FormationPlan
```

### 처리 순서

1. **참석자 필터** — `ATTEND`/`LATE` 만, 탈퇴/휴식(`isActive=false`)·부상·불참 제외
2. **채팅 규칙 정규화** — `applyChatFormationRules()` 로 이름→id 매핑, 충돌 감지
3. **우선순위 점수** — 회원 구분(`memberPriority.ts`), 채팅 `PRIORITIZE_MEMBER_TYPE` 로 override
4. **고정 GK 확인** — `fixedGK` 선수 우선, 없으면 GK 순환 여부 결정
5. **용량 검사** — `참석수 × 3 > 정원 × 4` 이면 "전원 3쿼터 보장 불가" 경고
6. **쿼터별 배정 루프**
   - 강제 휴식/최대 쿼터 도달자 제외 → 출전 후보
   - 포함 점수(`inclusionScore`): 적게 뛴 사람 우선 + 최소보장 미달 강제 + 강제포지션/고정GK 포함 + 회원 우선순위 + 연속출전 억제 + 고연령 체력 배려
   - 상위 N명을 출전, 나머지 휴식
   - GK 배정: 강제GK → 고정GK → 순환(가능자 중 GK 적게 본 순) → 최후 임시배정(경고)
   - 필드 배정: 강제 포지션 우선 → 선호 포지션 → 남은 슬롯(금지 회피)
7. **요약/위반 생성** — 선수별 출전·필드·GK·휴식 쿼터, 최소보장 미달·GK 부족·충돌 보고

### 핵심 운영 규칙 반영

| 규칙 | 구현 |
| --- | --- |
| 규칙1 최소 3쿼터 | `minGuaranteedQuarters=3`, 미달 시 위반 보고. 불가 시 경고 메시지 |
| 규칙2 고정 GK | `fixedGK` 우선 + 쿼터별 휴식 지정은 `FORCE_REST` 로 가능 |
| 규칙3 GK 순환 | 고정 GK 없으면 `canPlayGK` 가능자 순환, 부족 시 경고 |
| 규칙4 13명 초과 | `priorityThreshold=13` 초과 시 우선순위 가중치↑ (스텝>정회원>학생>월2회>준회원>용병) |
| 규칙5 포지션 밸런스 | 템플릿 슬롯대로 채우고 과부족 표시, 커스텀 템플릿 지원 |

## 2. AI 채팅 → 규칙 변환

### 흐름

```
관리자 입력 → POST /api/formation-chat → ChatGPT(JSON) → ParsedFormationChatResult
  → ChatRulePreview 표시 → "조건 적용" → existingChatRules 누적
  → "자동 배정 다시 실행" → generateFormationPlan(chatRules) → 새 결과
```

### 규칙 적용 우선순위 (충돌 시 자동 덮어쓰기 금지, 경고 표시)

1. 안전/불가능 조건
2. 관리자 수동 수정
3. 채팅 명시 조건
4. 고정 GK 조건
5. 회원 구분 우선순위
6. 기본 3쿼터 보장
7. 포지션 밸런스
8. 나이/체력 균형

충돌 예시:
- "민수 1쿼터 휴식" + "민수 1쿼터 FW 고정" → 휴식 우선(경고)
- "준회원 최대 2쿼터" + "전원 최소 3쿼터" → 준회원 상한 우선
- "철수 GK 금지"인데 GK 가능자가 철수뿐 → 경고

### ChatFormationRule 타입

`FORCE_REST`, `FORCE_POSITION`, `BAN_POSITION`, `MAX_QUARTERS`, `MIN_QUARTERS`,
`MAX_QUARTERS_BY_MEMBER_TYPE`, `PRIORITIZE_MEMBER_TYPE`, `AVOID_CONSECUTIVE_QUARTERS`,
`GK_ROTATION`, `CUSTOM_NOTE` — 정의는 `src/types/chat.ts`.

### 시나리오 → 규칙

| 입력 | parsedRules |
| --- | --- |
| "민수 1쿼터 쉬게" | `FORCE_REST {memberName:"민수", quarter:1}` |
| "준회원 최대 2쿼터" | `MAX_QUARTERS_BY_MEMBER_TYPE {memberType:"준회원", maxQuarters:2}` |
| "고정 GK 없으니 GK 가능자로 돌려" | `GK_ROTATION {enabled:true}` |
| "철수 GK 시키지 마" | `BAN_POSITION {memberName:"철수", position:"GK"}` |

### Fallback (요구사항 8·14)

- JSON 파싱 실패 → "요청을 해석하지 못했습니다..." 안내, 기존 포메이션 유지
- 원본 응답은 콘솔 로그(서버), **API Key 등 민감정보는 로그 금지**
- API Key 미설정/네트워크 오류 → 데모 안내 메시지, 앱은 정상 동작

## 3. ChatGPT 채팅방(프로젝트) 연동에 대한 안내

요구사항 14의 "채팅방을 고정으로 [프로젝트 URL]에 저장" 은 **링크 연결** 방식으로 구현했습니다.

- 환경변수 `NEXT_PUBLIC_OPENAI_PROJECT_URL` 에 해당 프로젝트 URL 을 두고,
  채팅 패널 상단에 "🔗 채팅방 연결됨" 링크로 항상 그 채팅방을 가리킵니다.
- **이유**: OpenAI 공개 API 는 `chatgpt.com` 의 특정 프로젝트(워크스페이스) 대화 스레드에
  서버에서 직접 메시지를 저장/append 하는 기능을 제공하지 않습니다. 따라서 API 호출은
  동일한 system prompt(프로젝트와 같은 역할 지침)로 수행하고, 사람이 그 채팅방을 열어
  맥락을 이어볼 수 있도록 링크를 고정했습니다.
- 추후 OpenAI 가 프로젝트 스레드 쓰기 API 를 제공하면 `formationChatClient.ts` 에서
  thread/project id 를 사용해 실제 동기화로 교체할 수 있습니다.
