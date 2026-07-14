# AGENTS.md

이 저장소는 가상의 **Agent 팀**이 역할을 나눠 구현했습니다. 상세 협업 기록은
[`docs/agent-plan.md`](./docs/agent-plan.md) 를 보세요.

| Agent | 담당 범위 | 주요 산출물 |
| --- | --- | --- |
| Product Manager | 요구사항 정리, MVP 범위, 의존성 | `docs/requirements.md` |
| UX/UI Designer | 화면/컴포넌트/플로우 설계 | `components/ui/*`, 페이지 레이아웃 |
| Data/Excel | 엑셀 파싱/매핑/내보내기 | `lib/excel/*` |
| Formation Algorithm | 자동 배정 + 채팅 규칙 적용 | `lib/formation/*` + 테스트 |
| Backend/API | ChatGPT 서버 라우트, env 보안 | `app/api/*`, `lib/openai/*`, `.env.example` |
| Frontend | 화면 구현, 상태/저장소 연동 | `components/*`, `lib/store/*` |
| QA/Test | 단위 테스트 + 수동 체크리스트 | `__tests__/*`, `docs/agent-plan.md` |

## 코드 컨벤션

- 타입은 `src/types/*`, 비즈니스 로직은 `src/lib/*`, UI 는 `src/components/*` 로 분리.
- 포메이션 알고리즘과 회비 계산은 **순수 함수**로 UI 와 분리(테스트 가능).
- 정책 값(회비/우선순위/포메이션 템플릿)은 상수 파일로 분리.
- 한국어 주석을 적절히 유지.
