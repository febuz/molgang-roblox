# Features as immateriële vaste activa — and how it fixes the token problem

**Owner:** MoneyGod + Croesus (economy) · PO oversight · 2026-06-03
**Code:** `src/finance/feature-capitalization.ts` · **Tests:** `tests/unit/featureCapitalization.test.ts`

## 1. The accounting (summary)

A delivered feature is not just a cost — it is a **durable, identifiable
intangible asset**. We account for it as **immateriële vaste activa** (IAS 38 /
Dutch RJ 210; cost side per Horngren/Bhimani, verslaggeving per Klaassen &
Hoogendoorn):

```
effort (hours · commits · story points · TOKENS)
   └─▶ labor hours ──×blended rate──▶ labor cost
          ├─ research phase        → expensed to P&L
          └─ development phase      → capitalised × recognition-rate
                                      → intangible asset (immateriële activa)
                                      → amortised straight-line over useful life
                                      → net book value on the balance sheet
```

Every feature's effort — **including the tokens the agents spend** — is booked.
The roll-up (`balanceSheet()`) gives net immateriële activa, accumulated
amortisation, and the cost expensed to the P&L.

## 2. Why this solves the token problem

Agents can burn tokens with nothing durable to show for it (endless review
loops, two-model debates, re-deriving the same answer). Capitalisation turns
tokens into a **booked economic input**, which forces three behaviours:

### a. Token awareness
Tokens enter the effort model directly (`tokensPerHour` → equivalent labor
hours → cost). A token spent is a euro booked. The agent can no longer treat
tokens as free; they show up in the feature's cost and on the balance sheet.

### b. Economic reasoning (ROI)
A feature is only worth building when the **asset it creates is worth more than
the effort (incl. tokens) to create it**:

```
ROI = capitalised asset value ÷ total cost (labor incl. tokens)
```

`featureROI()` makes this explicit. Agents prioritise **high-ROI** work and
abandon token-hungry paths whose asset value can't justify the spend. A research
spike that stays expensed (no asset) is a red flag if it keeps consuming tokens.

### c. Efficiency built into the incentive
Only **durable, identifiable** development output capitalises; throwaway
research is expensed. So the cheapest way to grow the balance sheet is to ship
**real, finished features with the fewest tokens** — exactly the behaviour we
want. Token-efficiency stops being a nag and becomes the dominant strategy.

## 3. Business-wise: the loop closes

Adding the business/accounting layer makes token-efficiency a **first-class
objective**, not an afterthought:

- The PO prioritises by ROI; MoneyGod books effort; Croesus reports the
  intangible-asset balance sheet.
- The **development pipeline is kept cheap on purpose** (see
  [ATHENA-REVIEW-GATE.md](ATHENA-REVIEW-GATE.md) §"token-efficient review"):
  a Codex review catches most issues, the developer fixes in **one** pass, and
  Opus does a **light** big-picture/follow-up review — instead of expensive
  multi-model debate loops. That keeps build-cost (tokens) low, so ROI — and
  the capitalised asset value per token — stays high.
- The token-hungry **dialogue-consensus** pattern (two models debating to a
  conclusion) is reserved for **trading decisions**, where the stakes justify
  the spend — never for development loops.

> Bottom line: account for tokens as effort, capitalise the durable result as an
> asset, and reason by ROI. Token-efficiency then falls out of the economics —
> the company spends tokens like money, because on the books, it is.
