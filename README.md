# ⚽ 하퍼세븐 (HaperSeven) — 축구팀 관리 웹앱

축구팀 **하퍼세븐** 운영자가 회원 · 회비 · 출석 · 경기 스탯 · **쿼터별 포메이션 자동 배정**을
한 곳에서 관리하는 웹앱(MVP). 포메이션 화면에는 **자연어 → 포메이션 규칙**으로 변환하는
ChatGPT 채팅 기능이 포함되어 있습니다.

- **스택**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · xlsx · OpenAI
- **데이터**: 초기에는 브라우저 `localStorage` (repository/service layer 분리로 DB 교체 용이)
- **상태관리**: React Context 기반 경량 store (`AppStore`)

---

## 🚀 설치 / 실행

```bash
npm install
npm run dev
```

→ 브라우저에서 http://localhost:3000 접속. 첫 실행 시 **샘플 데이터**가 자동 시드됩니다.

```bash
npm run build && npm start   # 프로덕션 빌드/실행
npm test                     # 포메이션 알고리즘 단위 테스트(vitest)
```

> AI 채팅 기능은 OpenAI 키 없이도 앱이 멈추지 않습니다(데모 안내 표시). 실제 동작은 아래 환경변수 설정 필요.

---

## 🐳 Docker 배포

Next.js standalone 모드로 경량 이미지(약 225MB)를 만듭니다.

```bash
# 빌드 + 실행 (compose)
docker compose up -d --build      # → http://localhost:3000
docker compose down               # 중지

# 또는 docker 단독
docker build -t haperseven:latest .
docker run -d -p 3000:3000 --name haperseven haperseven:latest
```

### AI 채팅 키 주입 (선택)

AI 채팅을 쓰려면 `OPENAI_API_KEY` 를 컨테이너에 전달해야 합니다. (없으면 채팅만 데모 모드, 나머지 정상)

```bash
# 방법 A) 프로젝트 루트에 .env 파일 생성 → compose 가 자동으로 읽음
#   OPENAI_API_KEY=sk-...
#   OPENAI_MODEL=gpt-5.5
docker compose up -d --build

# 방법 B) 셸에서 직접 전달
docker run -d -p 3000:3000 -e OPENAI_API_KEY=sk-... -e OPENAI_MODEL=gpt-5.5 haperseven:latest
```

> 회원/회비/경기 데이터는 **브라우저 localStorage** 에 저장되므로 컨테이너를 재시작해도 데이터는
> 사용자 브라우저에 그대로 남습니다(서버 볼륨 불필요). 멀티 사용자 공유가 필요하면 DB 연동으로 확장하세요.

---

## 🔑 ChatGPT API 연동

`.env.example` 를 복사해 `.env.local` 을 만들고 값을 채우세요. (`.env.local` 은 git 에 커밋되지 않습니다.)

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.5
NEXT_PUBLIC_OPENAI_PROJECT_URL=https://chatgpt.com/g/g-p-6a39d5a260d481918b5c48d28d40cc3d-hapeosebeun/project
```

- `OPENAI_API_KEY` 는 **서버에서만** 사용되며 프론트엔드에 노출되지 않습니다(서버 라우트 `/api/formation-chat` 경유).
- 모델명은 코드에 하드코딩하지 않고 `process.env.OPENAI_MODEL` 우선, 없으면 기본값(`gpt-5.5`)을 사용합니다.
- `NEXT_PUBLIC_OPENAI_PROJECT_URL` 은 포메이션 채팅 패널의 "🔗 채팅방 연결됨" 링크가 가리키는 ChatGPT 프로젝트(채팅방)입니다.

### 채팅 기능 사용 방법

1. **포메이션** 메뉴로 이동
2. 경기와 참석자(출석 기록)를 선택
3. 템플릿 선택 후 **자동 배정 생성**
4. 채팅창에 자연어 요구사항 입력 (예: "준회원은 2쿼터만, 정회원은 3쿼터 보장, GK 가능자로 돌려줘")
5. **AI 해석 결과** 확인
6. **조건 적용** 클릭 → 적용 규칙 목록에 누적
7. **자동 배정 다시 실행** 클릭
8. 쿼터별 라인업 · 출전 요약 · 경고 확인 → 필요 시 셀렉트박스로 수정 후 **경기에 저장**

---

## 🧑‍🤝‍🧑 Agent 팀 구성

이 프로젝트는 가상의 Agent 팀이 분업해 구현했습니다(상세: [`docs/agent-plan.md`](./docs/agent-plan.md)).

| Agent | 담당 | 산출물 |
| --- | --- | --- |
| **Product Manager** | 요구사항/MVP 범위/의존성 | `docs/requirements.md` |
| **UX/UI Designer** | 화면·컴포넌트·플로우 | `components/ui/*`, 페이지 레이아웃 |
| **Frontend** | 화면 구현, 상태/저장소 | `components/*`, `lib/store/*` |
| **Backend/API** | ChatGPT 서버 라우트, env 보안 | `app/api/*`, `lib/openai/*` |
| **Formation Algorithm** | 자동 배정 + 채팅 규칙 | `lib/formation/*` + 테스트 |
| **Data/Excel** | 엑셀 import/export/매핑 | `lib/excel/*` |
| **QA/Test** | 단위 테스트 + 체크리스트 | `__tests__/*`, `docs/agent-plan.md` |

---

## 📋 회원 엑셀 import 방법

1. **회원** 메뉴 → **엑셀 가져오기**
2. `.xlsx` 파일 선택 (`2023년 명단` / `2024년 명단` / `2025` 같은 연도 시트 인식)
3. 기본으로 **최신 연도 시트**가 선택되며, 다른 시트로 변경 가능
4. **대체/추가** 방식 선택 후 미리보기 확인 → 가져오기

인식 컬럼: `번호, 이름, 구분, 회비 금액, 회비 납부 구분, 1~12(월별 납부), 납부 필요 목록`.
헤더 표기가 조금 달라도 alias 매핑으로 인식하며, **나이/포지션/GK 가능 여부는 엑셀에 없으므로**
가져온 뒤 회원 수정에서 입력합니다. 빈 값/잘못된 값은 정책 기본값으로 안전 처리됩니다.

내보내기: 각 화면의 **엑셀 내보내기** 버튼으로 회원/회비/경기 스탯/포메이션을 `.xlsx` 로 저장합니다.

---

## 💰 회원 구분별 회비 정책

| 회원 구분 | 회비 |
| --- | --- |
| 스텝 | 6개월 160,000원 |
| 정회원 | 6개월 170,000원 |
| 정회원(월2회) | 6개월 90,000원 |
| 준회원 | 6개월 20,000원 + 참석 시마다 5,000원 |
| 학생 | 3개월 70,000원 |
| 용병 | 회당 5,000원 |

- 환불: 최소 2개월부터, **1개월당 20,000원**. 개인사정/탈퇴/학생 동일, 장기부상은 스텝 협의.
- 하반기 회비는 7월 말까지 납부.
- 입금 계좌: **카카오뱅크 79422626899 황동건**
- 정책은 `src/lib/constants/feePolicy.ts` 상수로 분리 — 값만 바꾸면 전체 반영됩니다.

예상 회비는 회원 구분 정책을 **월 환산**해 기간 월수만큼 계산하고, 준회원·용병은 **참석비**를 더합니다.
미납 = 예상 − 실납부(납부 입력이 없으면 월별 'O' 표시로 추정).

---

## 🧩 포메이션 자동 배정 규칙

경기당 **4쿼터** 기준, 참석자만 대상으로 배정합니다. (상세: [`docs/formation-chat.md`](./docs/formation-chat.md))

- **인당 최소 3쿼터 보장**(필드+GK 합산). 물리적으로 불가하면 경고를 표시하고 우선순위로 배정.
- **포지션 밸런스**: 템플릿(`4-4-2`, `4-3-3`, `3-5-2`, `8인 3-3-1`, `7인 2-3-1`, `6인 2-2-1`)대로 채우고
  부족/과다를 표시. **커스텀 템플릿** 생성 가능.
- 같은 선수가 한 포지션만 계속 뛰지 않도록, 적게 뛴 선수 우선으로 균형 조정. 고연령자는 체력 배려.
- 셀렉트박스로 관리자가 직접 수정 가능, **자동 배정 사유**와 **규칙 위반 경고** 표시.

### 참석자 13명 초과 시 우선순위 배정

13명을 넘으면 전원 3쿼터가 불가능할 수 있어 **우선순위 가중치**를 높여 차등 배정합니다.

```
스텝 > 정회원 > 학생 > 정회원(월2회) > 준회원 > 용병
```

정회원 이상이 먼저 3쿼터를 확보하고, 이후 월2회·준회원, 마지막에 용병이 남는 슬롯에 배치됩니다.
밸런스가 크게 깨지면 사유를 표시하며, 관리자가 직접 override(셀렉트박스/채팅 규칙) 가능합니다.

### 고정 GK 가 없을 때 GK 순환 배정

- 고정 GK(`fixedGK`)가 있으면 매 쿼터 그 선수를 GK 우선 배치(쿼터별 휴식은 채팅 `FORCE_REST` 로 지정).
- 고정 GK 가 없으면 `canPlayGK=true` 선수들을 **GK 를 적게 본 순서로 순환** 배정합니다.
  GK 쿼터는 필드 출전으로 카운트하지 않아 "3쿼터 필드 + 1쿼터 GK/휴식" 구조에 가깝게 맞춥니다.
- GK 가능자가 부족하면 경고를 띄우고 관리자가 직접 지정하도록 합니다.

---

## 🗂️ 데이터 저장 구조 (localStorage)

모든 데이터는 `haperseven:` 접두사 키로 브라우저 `localStorage` 에 저장됩니다.

| 키 | 내용 |
| --- | --- |
| `haperseven:members` | 회원 목록 |
| `haperseven:matches` | 경기(출석/스탯/저장된 포메이션) |
| `haperseven:paymentEntries` | 실제 납부 입력 |
| `haperseven:extraExpenses` | 추가 지출 |
| `haperseven:refunds` | 환불 내역 |
| `haperseven:formationTemplates` | 포메이션 템플릿 |
| `haperseven:seeded` | 샘플 시드 여부 |

읽기/쓰기는 `src/lib/repository/storage.ts` 와 `*Repository.ts` 에 캡슐화되어 있습니다.

### 추후 DB 연동 시 교체할 부분

- `src/lib/repository/storage.ts` + `memberRepository.ts` / `matchRepository.ts` / `paymentRepository.ts`
  의 read/write 만 Supabase/Firebase 호출로 교체 (인터페이스 동일 유지).
- `src/app/api/{members,matches,payments}/route.ts` 스캐폴드에 서버 CRUD 구현.
- 나머지 UI/서비스/알고리즘은 **수정 불필요**.

---

## 📁 주요 파일 구조

```
src/
  app/
    layout.tsx, page.tsx, globals.css
    api/
      formation-chat/route.ts   # ChatGPT 서버 라우트(키 보호)
      members|matches|payments/route.ts  # DB 연동 스캐폴드
  components/
    layout/AppShell.tsx         # 탭형 네비게이션 셸
    ui/                         # 공통: Card/Badge/Button/Table/Modal/Field
    common/PeriodFilter.tsx     # 월/분기/연/기간 필터
    dashboard/ members/ payments/ matches/ stats/
    formation/
      FormationPage.tsx
      FormationChatPanel.tsx    # AI 채팅 입력/응답
      ChatRulePreview.tsx       # AI 해석 규칙 미리보기
      AppliedChatRules.tsx      # 적용 중인 규칙
      FormationWarnings.tsx     # 경고/위반/사유
      QuarterLineupCard.tsx     # 쿼터별 라인업(셀렉트박스 수정)
      PlayerQuarterSummaryTable.tsx
  lib/
    openai/formationChatClient.ts
    formation/
      generateFormationPlan.ts  # 자동 배정 핵심 알고리즘(순수 함수)
      applyChatFormationRules.ts # 채팅 규칙 → 제약 정규화
      formationRules.ts, recompute.ts, ruleDescription.ts
      __tests__/generateFormationPlan.test.ts
    excel/excelParser.ts, excelExporter.ts
    constants/feePolicy.ts, memberPriority.ts
    payments/paymentService.ts
    stats/period.ts, statsService.ts
    repository/storage.ts, memberRepository.ts, matchRepository.ts, paymentRepository.ts
    store/AppStore.tsx
    data/sampleData.ts
  types/
    member.ts, match.ts, payment.ts, formation.ts, chat.ts
docs/
  requirements.md, agent-plan.md, formation-chat.md
AGENTS.md
```

---

## 🧱 주요 타입 정의

핵심 타입은 `src/types/*` 에 있습니다.

- `Member` / `Position` / `PaymentStatus` — `types/member.ts`
- `Match` / `AttendanceRecord` / `MatchStat` — `types/match.ts`
- `FormationTemplate` / `FormationPlan` / `QuarterLineup` / `PlayerQuarterSummary` / `RuleViolation` — `types/formation.ts`
- `ChatFormationRule` / `ParsedFormationChatResult` / `FormationChatRequest` / `FormationChatResponse` — `types/chat.ts`

```ts
generateFormationPlan({ members, attendance, formationTemplate, quarterCount: 4, rules, chatRules });
// → { quarters, summary, warnings, ruleViolations, reasons }
```

---

## 🧪 샘플 데이터

첫 실행 시 모든 회원 구분(스텝·정회원·정회원(월2회)·준회원·학생·용병·회장·휴식·탈퇴)과
GK/DF/MF/FW 포지션, 고정 GK 1명, 샘플 경기 2건(출석·득점·어시), 환불 1건이 시드됩니다.
좌측 하단 **↺ 샘플 데이터로 초기화** 로 언제든 되돌릴 수 있습니다.

---

## ⚠️ 에러 처리 / 보안 요약

- 엑셀 파싱 실패·빈 값·헤더 누락을 방어적으로 처리(기본값/경고).
- ChatGPT 호출/JSON 파싱 실패 시 **fallback** 안내, 포메이션 기능은 정상 유지.
- API Key 는 서버 전용, `.env.local` 비커밋, 로그에 민감정보 미기록.
- AI 는 포메이션을 직접 저장하지 않고 **규칙 제안만** 하며, 최종 적용은 관리자 버튼 승인.
