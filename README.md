# ISO 8583 Tooling

A web-based DX tool for **parsing and visualizing ISO 8583:1993 messages** — built with Vanilla JavaScript and [Vite](https://vitejs.dev/).

---

## Features

- 🔍 **Parse** hex-encoded ISO 8583:1993 messages in the browser
- 🗂 **Visualize** all data elements (DE1–DE128) in a structured, color-coded table
- 🗺 **Bitmap decoding** — primary and secondary bitmaps parsed automatically
- 📤 **Export to JSON** — download the parsed message as a `.json` file
- ⚙️ **Skip length headers** — optionally skip N leading bytes (e.g. 2-byte or 4-byte length headers)
- 🧭 **Field helper** — per-DE dropdown with format hints and live hex previews
- 🌐 **Alternate encodings** — parse/build text fields as ASCII or EBCDIC (CP037)
- 📦 **Zero backend** — runs entirely in the browser
- 🎨 **Color-coded fields** by category (card data, auth data, private data)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18

### Install & Run

```bash
git clone https://github.com/bau-wd/iso8583-tooling.git
cd iso8583-tooling
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
# output in dist/
npm run preview
```

---

## How to Use

1. **Paste** your hex-encoded ISO 8583 message into the textarea.  
   *(Or click **Load Sample** to use the built-in demo message.)*
2. Choose the **text encoding** for MTI and text fields (ASCII by default; EBCDIC CP037 supported) and optionally check **Skip length header** to skip leading bytes (e.g. `2` for a 2-byte TPDU header).
3. Click **Parse Message**.
4. The tool displays:
   - MTI badge
   - Primary (and secondary) bitmap hex values
   - Full field table with DE number, name, format, length type, length, decoded value, and raw hex
5. Use the **Field Helper** panel to inspect any DE’s format/length rules and see a hex preview for the selected encoding.
6. Click **Export JSON** to download the parsed result as a `.json` file.

---

## Sample ISO 8583:1993 Message

The following is a hand-crafted ISO 8583:1993 0200 Authorization Request. Click **Load Sample** in the app to use it directly; it will be encoded with your currently selected character set (ASCII by default).

Fields present: DE02 (PAN), DE03 (Processing Code), DE04 (Amount), DE07 (Transmission Date & Time), DE11 (STAN), DE12 (Local Time), DE13 (Local Date), DE22 (POS Entry Mode), DE25 (POS Condition Code), DE35 (Track 2), DE41 (Terminal ID), DE42 (Card Acceptor ID), DE49 (Currency Code).

---

## JSON Export Format

```json
{
  "mti": "0200",
  "primaryBitmap": "7238000102C08000",
  "secondaryBitmap": null,
  "fields": {
    "2": {
      "de": 2,
      "name": "Primary Account Number (PAN)",
      "format": "n",
      "lengthType": "LLVAR",
      "length": 16,
      "value": "4111111111111111",
      "rawHex": "34313131313131313131313131313131"
    },
    "3": {
      "de": 3,
      "name": "Processing Code",
      "format": "n",
      "lengthType": "fixed",
      "length": 6,
      "value": "000000",
      "rawHex": "303030303030"
    }
  },
  "errors": []
}
```

---

## ISO 8583:1993 Field Reference (Summary)

| DE  | Name | Format | Length Type | Max Length |
|-----|------|--------|-------------|------------|
| 2   | Primary Account Number (PAN) | n | LLVAR | 19 |
| 3   | Processing Code | n | fixed | 6 |
| 4   | Amount, Transaction | n | fixed | 12 |
| 7   | Transmission Date & Time | n | fixed | 10 |
| 11  | System Trace Audit Number | n | fixed | 6 |
| 12  | Local Transaction Time | n | fixed | 6 |
| 13  | Local Transaction Date | n | fixed | 4 |
| 22  | Point of Service Entry Mode | n | fixed | 3 |
| 25  | Point of Service Condition Code | n | fixed | 2 |
| 35  | Track 2 Data | z | LLVAR | 37 |
| 37  | Retrieval Reference Number | an | fixed | 12 |
| 38  | Authorization Identification Response | an | fixed | 6 |
| 39  | Response Code | an | fixed | 2 |
| 41  | Card Acceptor Terminal ID | ans | fixed | 8 |
| 42  | Card Acceptor ID Code | ans | fixed | 15 |
| 48  | Additional Data - Private | ans | LLLVAR | 999 |
| 49  | Currency Code, Transaction | an | fixed | 3 |
| 52  | PIN Data | b | fixed | 8 |
| 55  | ICC (EMV) Data | b | LLLVAR | 999 |
| 64  | MAC | b | fixed | 8 |

*(Full DE1–DE128 definitions are in `src/fieldDefinitions.js`.)*

---

## License

MIT
