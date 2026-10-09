# FINOVA — Portfolio Accounting & Reconciliation Strategy

This document defines the authoritative financial accounting relationship between **Holdings** (Position Balance Sheet) and **Investment Transactions** (Audit Ledger) for Finova. It specifies reconciliation protocols to prevent double-counting, handle partial transaction histories, and prepare for Prompt 6 (Manual holdings & CSV imports).

---

## 1. Dual-Model Architecture Overview

In retail investing across Indian brokers (Zerodha, Groww, Angel One, ICICI Direct, CDSL/NSDL):
* **Holdings statements** provide point-in-time position snapshots (`quantity`, `average_buy_price`).
* **Tradebooks / Order ledgers** provide timestamped execution activity (`BUY`, `SELL`, `DIVIDEND`, `TAXES`, etc.).

Retail users frequently possess current holdings without having access to their 5-year tradebook history. Forcing a ledger-only recalculation would break the portfolio view for ordinary users.

Therefore, Finova establishes two complementary records:

| Record Type | Database Table | Purpose | Source of Truth For |
| :--- | :--- | :--- | :--- |
| **Position State** | `public.holdings` | Current aggregated balance per `(broker_account_id, instrument_id)` | Unified portfolio valuation, allocation charts, current net worth |
| **Activity Ledger** | `public.investment_transactions` | Granular trade audit trail & corporate actions | Performance timeline, trade journal, dividend yield, tax analysis |

---

## 2. Preventing Double-Counting

> **Core Principle:** Portfolio valuation is computed **EXCLUSIVELY from `public.holdings`**, never by summing holdings + transaction amounts.

* `public.holdings` is the **authoritative balance sheet**.
* `public.investment_transactions` is the **authoritative journal**.
* A transaction does **not** create a separate portfolio position. Instead, transactions either *update* holdings or exist as audit history.

---

## 3. Ingestion Modes & Reconciliation Protocol

### Mode A: Direct / Manual Holding Entry
* User adds: `100 shares of ICICI Bank @ ₹1,200` in Groww.
* Action:
  1. Creates or updates row in `public.holdings` with `data_source = 'MANUAL'`.
  2. Creates an audit transaction in `public.investment_transactions` tagged with `transaction_type = 'BUY'`, `source = 'MANUAL'`, `notes = 'Manual position entry'`.
* Result: Holdings table reflects 100 shares; ledger records the transaction. Portfolio value reflects 100 shares. Zero double counting.

### Mode B: Holdings Statement CSV Import (e.g. Zerodha Holdings / Groww Holdings)
* File contains: List of positions (`symbol`, `isin`, `quantity`, `avg_buy_price`).
* Action:
  1. Upserts positions into `public.holdings` for the target `broker_account_id`.
  2. Positions with `quantity = 0` are archived or removed.
* Ledger impact: Does **not** fabricate synthetic trade executions if trade dates are unknown. The holding `as_of` timestamp is set to the statement date.

### Mode C: Tradebook / Order History CSV Import (e.g. Zerodha Tradebook)
* File contains: List of historical buy/sell trades with Trade IDs and timestamps.
* Action:
  1. Deduplicates trades using `external_reference` (e.g. Zerodha Trade ID or deterministic hash: `SHA256(broker_account_id + symbol + date + qty + price)`).
  2. Upserts into `public.investment_transactions`.
  3. Reconciles into `public.holdings`:
     $$\text{Current Quantity} = \sum \text{BUY} + \text{BONUS} + \text{SPLIT} - \sum \text{SELL}$$
     $$\text{Average Buy Price} = \text{Weighted Average Cost of open Buy Lots (FIFO / Moving Average)}$$

### Mode D: Mixed State (User imports Holdings Statement AND later imports Tradebook)
* Protocol:
  * When a tradebook covers the complete history of an instrument, ledger-calculated positions replace the manual snapshot.
  * When a tradebook only covers recent trades (e.g. last 30 days) while holdings were established 2 years ago, the opening balance from the holding statement is preserved as the base lot, and subsequent trades are applied incrementally.

---

## 4. Realized vs Unrealized P&L Accounting

* **Unrealized P&L**:
  $$\text{Unrealized P\&L} = (\text{Current Market Price} - \text{Average Buy Price}) \times \text{Quantity}$$
  Calculated directly from `holdings` joined with `instrument_prices`.
* **Realized P&L**:
  * Calculated **only** when matched buy and sell transactions exist in `investment_transactions`.
  * If a user imports a SELL transaction without historical BUY lots, realized P&L is flagged as `UNVERIFIED_COST_BASIS` rather than inventing false returns.

---

## 5. Deduplication & Idempotency Rules

* Every imported transaction must provide or generate an `external_reference`.
* Database constraint:
  ```sql
  CREATE UNIQUE INDEX idx_investment_tx_dedup
    ON public.investment_transactions(broker_account_id, external_reference)
    WHERE external_reference IS NOT NULL;
  ```
* Re-uploading the same CSV tradebook file will result in zero duplicated transactions (`ON CONFLICT DO NOTHING`).
