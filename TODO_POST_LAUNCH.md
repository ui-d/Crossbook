# Post-launch backlog

Deferred during the fixture-09 dedup fix (2026-05-19). Not launch blockers.

## 1. Claude prompt rule: equal-amount / different-currency

**Context:** `lib/claude.ts` `dedupeCurrencyAmountConflict` deterministically
drops the spurious `AMOUNT` conflict when normalized `amount_cents` are equal
and a `CURRENCY` conflict is present (fixture 09 class of bug). The dedup pass
is the guarantee; it does not stop the model emitting the spurious conflict in
the first place.

**Do:** Add a `SYSTEM_PROMPT` rule — "When numeric amounts are equal but
currencies differ, emit a single `CURRENCY` conflict, never also an `AMOUNT`
conflict. Never compute `amount_at_risk_cents` across different currencies; set
it null and use `MANUAL_REVIEW`." Add fixture 09 as a one-shot example.

**Why deferred:** Optimization (fewer output tokens, cleaner explanations), not
correctness — the deterministic pass already protects the output.

**Open nuance:** the dedup pass drops the `AMOUNT` conflict only. If a future
model attaches a cross-currency `amount_at_risk_cents` to the *surviving*
`CURRENCY` conflict, that risk number is still meaningless (brief: never
auto-convert). This prompt rule should also forbid that; alternatively extend
the dedup pass to null `amount_at_risk_cents` on `CURRENCY` conflicts where the
two records' currencies differ.

## 2. EMAIL conflict recall investigation

**Context:** `data/test-fixtures/09_expected.json` expects conflict types
`["CURRENCY", "EMAIL"]`. The `EMAIL` conflict (`sales@techco.de` vs
`ap@techco.de`) was observed missing in a real run. Separate root cause from
the dedup bug (recall, not a false positive).

**Do:** Investigate why the email difference is not surfaced — likely
`SYSTEM_PROMPT` de-emphasizes email vs. money, or the model collapses focus
onto the currency conflict. Confirm against fixtures 09 and any other pair with
differing emails.

**Why deferred:** Independent ticket; not the dedup scope.
