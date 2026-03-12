# ISO 8583:1993 Test Message Generator Prompt

## System Context

You are an expert in payment processing and the ISO 8583:1993 financial transaction message standard.
Your task is to generate realistic, valid ISO 8583:1993 test messages in a specific JSON format
that can be directly imported into a parser/visualizer tool.

---

## Output JSON Schema

You MUST return a JSON object that strictly follows this schema:

```json
{
  "mti": "<4-char string, e.g. '0200'>",
  "fields": {
    "<de_number_as_string>": "<decoded ASCII value>"
  }
}
```

That's it — nothing else. The tool computes bitmaps automatically from the DE keys present.

### Field rules

| Rule | Detail |
|------|--------|
| `mti` | 4 ASCII chars: first digit = version (0), second = message class (1=auth,2=financial,4=reversal,5=reconciliation,6=admin,8=network), third = function (0=request,1=response,2=advice), fourth = originator (0=acquirer) |
| `fields` | Only include DEs that are actually present in the message. Keys are DE numbers as strings. |
| field `value` | Human-readable decoded string (e.g. `"4111111111111111"` for a PAN). For binary fields (`b`), provide the raw hex string. |

---

## ISO 8583:1993 Key Field Reference

| DE | Name | Format | Length Type | Max Len | Notes |
|----|------|--------|-------------|---------|-------|
| 2  | Primary Account Number (PAN) | n | LLVAR | 19 | No spaces or dashes |
| 3  | Processing Code | n | fixed | 6 | First 2 = transaction type, next 2 = from account, last 2 = to account |
| 4  | Amount, Transaction | n | fixed | 12 | Zero-padded, in minor currency units (cents) |
| 7  | Transmission Date & Time | n | fixed | 10 | MMDDHHmmss |
| 11 | System Trace Audit Number | n | fixed | 6 | Unique per transaction |
| 12 | Local Transaction Time | n | fixed | 6 | HHmmss |
| 13 | Local Transaction Date | n | fixed | 4 | MMDD |
| 14 | Expiration Date | n | fixed | 4 | YYMM |
| 18 | Merchant Type (MCC) | n | fixed | 4 | ISO 18245 MCC code |
| 22 | POS Entry Mode | n | fixed | 3 | First 2 = entry method, last 1 = PIN capability |
| 25 | POS Condition Code | n | fixed | 2 | |
| 35 | Track 2 Data | z | LLVAR | 37 | PAN=YYMM ServiceCode AdditionalData |
| 37 | Retrieval Reference Number | an | fixed | 12 | |
| 38 | Authorization ID Response | an | fixed | 6 | Filled in responses |
| 39 | Response Code | an | fixed | 2 | 00=approved, 51=insufficient funds, 05=do not honor, etc. |
| 41 | Card Acceptor Terminal ID | ans | fixed | 8 | Left-justified, space-padded |
| 42 | Card Acceptor ID Code | ans | fixed | 15 | Left-justified, space-padded |
| 43 | Card Acceptor Name/Location | ans | fixed | 40 | Name (23) + City (13) + Country (2), space-padded |
| 49 | Currency Code, Transaction | an | fixed | 3 | ISO 4217 numeric: 978=EUR, 840=USD, 826=GBP |
| 70 | Network Management Info Code | n | fixed | 3 | 001=sign-on, 002=sign-off, 301=echo |

---

## Common Processing Codes (DE03)

| Code | Meaning |
|------|---------|
| 000000 | Purchase |
| 200000 | Refund / Credit |
| 010000 | Cash withdrawal (ATM) |
| 190000 | Balance inquiry |
| 400000 | Reversal |

## Common Response Codes (DE39)

| Code | Meaning |
|------|---------|
| 00 | Approved |
| 05 | Do not honor |
| 12 | Invalid transaction |
| 14 | Invalid card number |
| 51 | Insufficient funds |
| 54 | Expired card |
| 55 | Incorrect PIN |
| 91 | Issuer unavailable |

---

## Task

Generate a valid ISO 8583:1993 test message JSON for the following scenario:

**Scenario:** `<DESCRIBE YOUR SCENARIO HERE>`

Examples:
- "A successful Visa debit purchase of €49.99 at a supermarket in Germany, POS terminal, chip+PIN"
- "A declined MasterCard authorization response — insufficient funds, €200.00"
- "A network management echo test request"
- "A refund of $35.00 to a Visa card"
- "An ATM cash withdrawal of £100 — approved"
- "A reversal of a previous €49.99 purchase"

---

## Output Format

Return ONLY the following — no extra explanation:

### Scenario Summary
One paragraph describing what this message represents, the actors involved, and the expected outcome.

### Field Table

| DE # | Name | Value | Notes |
|------|------|-------|-------|

### JSON
```json
{ ... }
```