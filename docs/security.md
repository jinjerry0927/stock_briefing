# Security Notes

## 공개 저장소에 올리면 안 되는 것
- `.env.local`, `.env`, API 키, 토큰, 비밀번호
- `data/*.db`, `data/*.db-wal`, `data/*.db-shm`
- 실제 계좌번호, 증권사 로그인 정보, 거래 비밀번호
- 개인 보유 종목 메모, 실제 매매 내역이 담긴 백업 파일
- `.next/`, `node_modules/`, 빌드 산출물, 로컬 캐시

## 현재 보호 기준
- `.gitignore`에서 `.env*`, `data/`, SQLite 파일, `.next/`, `node_modules/`를 제외한다.
- `.env.local.example`만 예시 파일로 커밋한다.
- SQLite DB는 로컬 실행 중 자동 생성되며 공개 저장소에는 포함하지 않는다.
- API 라우트는 입력값을 `zod` 또는 명시적 allowlist로 제한한다.
- 외부 데이터 소스 실패는 UI fallback으로 처리하고, 앱 빌드를 막지 않는다.

## 공개 전 수동 점검 명령

```bash
git status --short
git ls-files .env.local .env data .next node_modules
git check-ignore -v .env.local data/stocks.db data/stocks.db-wal data/stocks.db-shm .next node_modules
rg -n --hidden -g '!node_modules' -g '!.next' -g '!.git' -g '!.env.local' -g '!data/**' "(api[_-]?key|secret|token|password|private[_-]?key|BEGIN .*PRIVATE)"
npm run lint
npm run build
git diff --check
```

## 운영 주의
- 현재 프로젝트는 개인용 로컬 앱 기준이다. 외부 사용자에게 배포할 경우 인증, 권한, rate limit, CSRF 정책을 별도로 설계해야 한다.
- 현재 데이터는 무료/비공식 공개 엔드포인트가 섞여 있으므로 안정성과 지연 시간이 보장되지 않는다.
- 이 앱의 요약과 차트는 투자 조언이 아니라 관찰 보조 정보다.
