# Stock Briefing

한국/미국 주식 관심종목, 보유 포트폴리오, 뉴스, 환율, 간단 차트를 한 화면에서 보는 개인용 주식 브리핑 웹앱입니다.

매수/매도 추천 도구가 아니라 개인 관찰과 정리를 위한 로컬 우선 대시보드입니다.

## 주요 기능
- 관심종목 관리: 시장, 티커, 종목명, 태그, 메모
- 보유 포트폴리오 관리: 수량, 평균단가, 통화, 메모, 평가손익
- 종목 검색: 이름 또는 코드로 한국/미국 종목 후보 조회
- 자동 브리핑: 큰 등락, 보유 손익, 뉴스량, 데이터 실패 상태 요약
- 차트: 보유/관심 종목별 1개월, 3개월, 6개월, 1년 캔들 및 거래량
- 환율: USD/KRW 기준 환율과 원화 환산 요약
- 뉴스: 종목별 관련 뉴스 링크와 요약

## 기술 스택
- Next.js 16 App Router
- React 19
- TypeScript
- SQLite + `better-sqlite3`
- Zod
- Yahoo Finance/Naver/Google News RSS 기반 무료 데이터 파이프라인

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 환경 변수

`.env.local.example`을 `.env.local`로 복사한 뒤 필요한 키만 입력합니다.

```bash
NEWSAPI_KEY=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
ALPHA_VANTAGE_API_KEY=
FMP_API_KEY=
OPENDART_API_KEY=
```

현재 앱은 키가 없어도 실행되도록 설계되어 있습니다. 선택 API가 실패하면 캐시나 fallback 상태를 보여주는 방향을 유지합니다.

## 로컬 데이터와 보안

- `.env.local`은 절대 커밋하지 않습니다.
- `data/*.db*`에는 관심종목, 보유종목, 메모, 뉴스/시세 캐시가 들어갈 수 있으므로 커밋하지 않습니다.
- API 키, 계좌 정보, 실제 매매 내역, 개인 메모가 포함된 파일은 공개 저장소에 올리지 않습니다.
- 공개 전 체크리스트는 `docs/security.md`와 `docs/release-checklist.md`를 확인합니다.

## 데이터 정책

- 무료, 공식, 문서화된 데이터 소스를 우선합니다.
- 법적 안정성이 불명확한 비공식 스크래핑은 핵심 파이프라인으로 쓰지 않습니다.
- TradingView/Investing.com은 공식 위젯 또는 외부 참고 링크 후보로만 둡니다.
- 데이터는 지연되거나 실패할 수 있으므로 투자 판단의 단독 근거로 사용하지 않습니다.

## 검증

```bash
npm run lint
npm run build
git diff --check
```

## 문서
- `docs/plan.md`: 제품 방향과 구현 계획
- `docs/data-sources.md`: 데이터 소스 후보와 제약
- `docs/portfolio.md`: 포트폴리오 모델과 계산 기준
- `docs/security.md`: 공개 저장소 보안 기준
- `docs/release-checklist.md`: 마감/배포 전 점검 목록
