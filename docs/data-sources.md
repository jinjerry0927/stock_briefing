# Data Sources

## Policy
Use free, documented, or official sources. Do not scrape Investing.com, TradingView, or other sites as the core data pipeline.

## Current Sources
- Korean quotes: Naver mobile stock endpoint currently used by the prototype.
- US quotes: Yahoo Finance chart endpoint currently used by the prototype.
- News: Google News RSS and Yahoo Finance RSS, with optional NewsAPI.

## Candidate Sources
- Alpha Vantage: official API key, daily time series, quote, search, and technical indicators. Candidate for US/global daily data.
- Financial Modeling Prep: official API key, profiles, quotes, statements, and market data. Candidate for US profile/fundamental data.
- OpenDART: official Korean disclosure API. Candidate for Korean filings and financial statement context.
- KRX Data Marketplace: candidate for Korean market statistics and delayed market data.
- Naver Search News API: official Korean news search API with client id/secret.
- NewsAPI: development/testing free plan only; use cautiously for local personal experiments.
- TradingView widgets: useful for official chart widgets or external visual reference.
- Investing.com webmaster tools: useful for official widgets or external reference links only.

## V1 Decision
Keep the existing quote/news pipeline working, add local cache and fallback states, and document optional API keys. Do not block the app on any single external provider.
