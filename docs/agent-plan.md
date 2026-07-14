# Agent 팀 구성 및 협업 기록 (agent-plan)

이 프로젝트는 단일 개발자가 아니라 **가상의 Agent 팀**이 역할을 나눠 설계·구현·검토한 결과물입니다.
각 Agent 가 어떤 판단을 했는지 아래에 정리합니다. (실제 산출물은 코드 + docs 로 통합)

작업 순서: PM → UX/UI → Data/Excel → Formation Algorithm → Backend/API → Frontend → QA → 통합 리뷰

---

## 1) Product Manager Agent

- **판단**: 첨부 엑셀의 회비 중심 구조를 그대로 두되, 포메이션 자동 배정을 "핵심 차별 기능"으로 보고
  MVP 우선순위를 `포메이션 + 회비 + 회원`에 두었다. 모바일 앱은 추후로 미루고 반응형 웹앱으로 시작.
- **산출물**: [`docs/requirements.md`](./requirements.md) — MVP 범위, 메뉴 구조, 의존성, 운영규칙→기능 매핑.
- **핵심 결정**: 데이터는 초기엔 localStorage. 단, repository/service layer 를 분리해 DB 교체 비용을 최소화.

## 2) UX/UI Designer Agent

- **판단**: 운영자가 PC/모바일 양쪽에서 쓰므로 **테이블 중심 + 카드형 대시보드 + 색상 배지**.
  포메이션 결과는 쿼터별 카드, AI 채팅은 우측 사이드 패널(모바일에선 하단으로 흐름).
- **상태 배지 색**: 납부완료=초록, 미납=빨강, 일부=노랑, 휴식/탈퇴=회색 (요구사항 8 준수).
- **산출물**: 공통 컴포넌트 `components/ui/*` (Card/StatCard/Badge/Button/Table/Modal/Field),
  화면별 페이지 컴포넌트, 사용자 플로우(아래 'Formation 플로우').

## 3) Data/Excel Agent

- **판단**: 엑셀 헤더 표기가 제각각일 수 있어 **alias 매핑**으로 유연 파싱. 시트명에서 연도를 추출해
  최신 시트를 기본 선택. 월별 셀(O/X/면제/숫자)을 `PaymentStatus` 로 정규화.
- **결정**: 엑셀에 없는 나이/포지션/GK 는 기본값으로 채우고 웹에서 보완 입력하도록 안내.
- **산출물**: `lib/excel/excelParser.ts`, `lib/excel/excelExporter.ts`, 컬럼 매핑 표(아래 'Excel 매핑').

## 4) Formation Algorithm Agent

- **판단**: 완벽 최적화 대신 **그리디 + 우선순위 점수** 방식. 공정성(적게 뛴 사람 우선)을 1차 기준,
  회원 구분 우선순위를 2차 기준으로 결합. 채팅 규칙은 명시 조건으로 우선 적용.
- **결정**: "출전 쿼터"는 필드+GK 합산으로 계산(요구사항의 44슬롯 예시와 일치). GK 쿼터는 필드로 카운트하지 않음.
- **산출물**: `lib/formation/generateFormationPlan.ts`, `applyChatFormationRules.ts`, `formationRules.ts`,
  단위 테스트 `__tests__/generateFormationPlan.test.ts`.
- 상세: [`docs/formation-chat.md`](./formation-chat.md).

## 5) Backend/API Agent

- **판단**: API Key 노출 방지를 위해 ChatGPT 호출은 **서버 라우트(`/api/formation-chat`)** 에서만.
  모델명은 `process.env.OPENAI_MODEL` 우선, 없으면 기본값(`gpt-5.5`).
- **결정**: 호출 실패/JSON 파싱 실패 시 **fallback** 을 반환해 포메이션 기능이 멈추지 않도록.
  민감정보(API Key)는 절대 로깅하지 않음. `members/matches/payments` 라우트는 DB 연동용 스캐폴드로 제공.
- **산출물**: `app/api/formation-chat/route.ts`, `lib/openai/formationChatClient.ts`, `.env.example`.

## 6) Frontend Agent

- **판단**: App Router + 클라이언트 상태(localStorage) 조합. 라우팅 대신 단일 페이지 탭 SPA 로
  상태 유지를 단순화(`AppShell`). 모든 데이터 접근은 `useAppStore()` 훅 경유.
- **산출물**: `components/{dashboard,members,payments,matches,formation,stats}/*`, `lib/store/AppStore.tsx`.

## 7) QA/Test Agent

- **판단**: 알고리즘이 UI 와 분리되어 있어 순수 함수 테스트가 가능. 핵심 케이스를 자동화하고
  나머지는 수동 체크리스트로 커버.
- **산출물**: vitest 9개 케이스(고정 GK / GK 순환 / 13명 초과 / 우선순위 / 준회원 max / FORCE_REST / BAN_POSITION 등)
  + 수동 테스트 체크리스트(아래).

---

## Formation 사용자 플로우

1. Formation 메뉴 → 경기 선택 → 템플릿 선택 → **자동 배정 생성**
2. 결과(쿼터 카드 + 출전 요약 + 경고) 확인
3. 채팅창에 자연어 입력 → AI 해석 결과(ChatRulePreview) 확인
4. **조건 적용** → 적용 규칙(AppliedChatRules)에 누적
5. **자동 배정 다시 실행** → 규칙 반영된 새 결과
6. 셀렉트박스로 미세 수정 → **경기에 저장**

## Excel 매핑 (요약)

| 엑셀 컬럼 | 내부 필드 | 비고 |
| --- | --- | --- |
| 번호 | `no` | 숫자 |
| 이름 | `name` | 필수(없으면 행 스킵) |
| 구분 | `memberType` | 문자열 정규화 |
| 회비 금액 | `feeAmount` | 비면 정책 기본값 |
| 회비 납부 구분 | `feePeriod` | 1/3/6개월·참석시 |
| 1~12 | `monthlyPaymentStatus` | O/X/면제/숫자 → 상태 |
| 납부 필요 목록 | `note` | 비고 |
| (없음) 나이/포지션/GK | 기본값 | 웹에서 입력 |

## 수동 테스트 체크리스트

- [ ] 첫 실행 시 샘플 데이터가 보인다 (모든 회원 구분 + GK/DF/MF/FW 포함)
- [ ] 회원 추가/수정/삭제, 엑셀 import(시트 선택)/export 동작
- [ ] 회비 월별 셀 클릭 시 O→X→면 순환, 미납/납부율 갱신
- [ ] 환불 추가 시 1개월 2만원으로 금액 자동계산, 2개월 미만 차단
- [ ] 경기 생성 후 출석/득점/어시 입력이 통계/대시보드에 반영
- [ ] 포메이션: 고정 GK 있을 때 매 쿼터 동일 GK / 없을 때 순환
- [ ] 13명 초과 시 보장 불가 경고 표시
- [ ] 채팅: "준회원 2쿼터만" 입력 → 규칙 미리보기 → 적용 → 다시 실행 시 반영
- [ ] OPENAI_API_KEY 미설정 시에도 데모 안내만 뜨고 앱이 멈추지 않음
