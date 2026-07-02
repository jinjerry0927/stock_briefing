# Stock Briefing Plan

## Goal
Build a private, local-first dashboard for Korean and US stocks. The first complete version focuses on daily review quality: watchlist movement, current holdings, related news, and simple observation summaries.

## Product Shape
- Desktop-first dashboard with responsive mobile support.
- Home screen combines dashboard summary, portfolio, watchlist, and selected stock detail.
- Observations are descriptive, not investment recommendations.
- Advanced trading signals, backtesting, RSI/MACD, and full transaction history are future work.

## V1 Features
- Watchlist with market, ticker, name, tags, memo, and display order.
- Portfolio holdings with quantity, average cost, currency, and memo.
- Current valuation, unrealized P/L, and return rate from quote data.
- Rule-based briefing covering biggest moves, portfolio status, news volume, and data failures.
- Stock detail panel with quote, basic metrics, related news, memo, and external reference links.

## Implementation Notes
- Keep Next.js app router and local SQLite.
- Keep API endpoints small and typed.
- Cache upstream quote/news responses to reduce repeated calls and allow graceful fallback.
- Use free or documented data sources only.

## Future Work
- PWA install polish.
- Target price/watch price alerts.
- Transaction history and realized P/L.
- Technical analysis indicators.
- Backtesting and strategy review.
- Native desktop or mobile packaging.
