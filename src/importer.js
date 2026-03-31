import { FIELD_DEFINITIONS } from './fieldDefinitions.js';
import { byteLength, normalizeEncoding, textToHex } from './encoding.js';

/**
 * Reconstructs a hex-encoded ISO 8583 message from the minimal JSON format:
 *   { mti: "0200", fields: { "2": "4111111111111111", "3": "000000", ... } }
 *
 * Bitmaps are computed from the DE keys present.
 * Field encoding (format, lengthType) comes from FIELD_DEFINITIONS.
 *
 * @param {object} parsed
 * @returns {string} Uppercase hex string
 */
export function buildHexFromJSON(parsed, options = {}) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid input: expected a JSON object.');
  }
  const { mti, fields } = parsed;
  if (!mti || !fields) {
    throw new Error('Invalid ISO 8583 JSON: missing required properties (mti, fields).');
  }
  const encoding = normalizeEncoding(options.encoding);

  const sortedDEs = Object.keys(fields).map(Number).sort((a, b) => a - b);
  const { primaryBitmap, secondaryBitmap } = computeBitmaps(sortedDEs);

  let hex = textToHex(mti, encoding);
  hex += primaryBitmap;
  if (secondaryBitmap) hex += secondaryBitmap;

  for (const de of sortedDEs) {
    const value = fields[de];
    const def   = FIELD_DEFINITIONS[de];
    if (!def)        throw new Error(`DE${de}: No field definition found.`);
    if (value == null) throw new Error(`DE${de}: missing value in JSON.`);
    hex += buildFieldHex(String(value), def, encoding);
  }

  return hex;
}

/**
 * Reads a File object and returns the parsed JSON content as an object.
 *
 * @param {File} file
 * @returns {Promise<object>}
 */
export function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target.result));
      } catch {
        reject(new Error('File is not valid JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Computes primary (and optional secondary) bitmap hex from a sorted list of
 * DE numbers. Sets bit 1 in the primary bitmap automatically when any DE > 64
 * is present.
 */
export function computeBitmaps(deNumbers) {
  const bytes = new Uint8Array(16);

  const hasSec = deNumbers.some(de => de > 64);
  if (hasSec) bytes[0] |= 0x80; // bit 1 → secondary bitmap present

  for (const de of deNumbers) {
    const bitIndex  = de - 1;             // 0-based
    const byteIndex = Math.floor(bitIndex / 8);
    const bitPos    = 7 - (bitIndex % 8); // MSB-first
    bytes[byteIndex] |= (1 << bitPos);
  }

  const fullHex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');

  return {
    primaryBitmap:   fullHex.slice(0, 16),
    secondaryBitmap: hasSec ? fullHex.slice(16, 32) : null,
  };
}

/**
 * Encodes a field value string into its wire-format hex:
 *   - binary fields (format 'b'): value is already hex
 *   - all other fields: text → hex pairs using the selected encoding
 * Prepends LLVAR/LLLVAR length prefix where required.
 */
function buildFieldHex(value, def, encoding) {
  const isBinary = def.format === 'b';

  // Fixed-length fields must be padded to exactly maxLength on the wire.
  // Numeric / amount fields are zero-padded on the left;
  // all text fields (a, an, ans, z, …) are space-padded on the right.
  let encodedValue = value;
  if (!isBinary && def.lengthType === 'fixed') {
    if (def.format === 'n' || def.format === 'x+n') {
      encodedValue = value.padStart(def.maxLength, '0');
    } else {
      encodedValue = value.padEnd(def.maxLength, ' ');
    }
  }

  const rawHex = isBinary ? value.toUpperCase() : textToHex(encodedValue, encoding);
  const byteLen = isBinary ? rawHex.length / 2 : byteLength(encodedValue, encoding);

  if (def.lengthType === 'LLVAR') {
    return textToHex(String(byteLen).padStart(2, '0'), encoding) + rawHex;
  }
  if (def.lengthType === 'LLLVAR') {
    return textToHex(String(byteLen).padStart(3, '0'), encoding) + rawHex;
  }
  return rawHex;
}
