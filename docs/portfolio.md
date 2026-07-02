# Portfolio Model

## Purpose
The portfolio feature tracks current holdings for personal review. It is not a broker ledger and does not replace tax or trading records.

## V1 Fields
- `market`: `KR` or `US`
- `ticker`: stock symbol
- `name`: display name
- `quantity`: current held quantity
- `averageCost`: average purchase price per share
- `currency`: `KRW` or `USD`
- `note`: personal memo

## Calculations
- `marketValue = currentPrice * quantity`
- `costBasis = averageCost * quantity`
- `unrealizedGain = marketValue - costBasis`
- `returnPercent = costBasis > 0 ? unrealizedGain / costBasis * 100 : 0`

## Constraints
- V1 does not store full buy/sell transaction history.
- V1 does not calculate realized gains.
- V1 does not generate buy/sell recommendations.

## Future Additions
- Transaction ledger
- Target price and watch price
- Realized gains
- Asset allocation by market/currency/tag
