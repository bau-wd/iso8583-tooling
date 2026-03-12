import { FIELD_DEFINITIONS } from './fieldDefinitions.js';

/**
 * Reconstructs a hex-encoded ISO 8583 message from a parsed JSON object —
 * the same format produced by exportToJSON / downloadJSON.
 * rawHex is re-derived from each field's value + the canonical field definition,
 * so the JSON does not need to carry rawHex at all.
 *
 * @param {object} parsed
 * @returns {string} Uppercase hex string
 */
export function buildHexFromJSON(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid input: expected a JSON object.');
  }
  const { mti, primaryBitmap, secondaryBitmap, fields } = parsed;
  if (!mti || !primaryBitmap || !fields) {
    throw new Error('Invalid ISO 8583 JSON: missing required properties (mti, primaryBitmap, fields).');
  }

  let hex = '';

  // MTI (ASCII → hex)
  hex += asciiToHex(mti);

  // Primary Bitmap (already hex)
  hex += primaryBitmap.toUpperCase();

  // Secondary Bitmap (if present)
  if (secondaryBitmap) {
    hex += secondaryBitmap.toUpperCase();
  }

  // Data Elements, sorted by DE number
  const sortedDEs = Object.keys(fields).map(Number).sort((a, b) => a - b);

  for (const de of sortedDEs) {
    const field = fields[de];
    const def   = FIELD_DEFINITIONS[de];
    if (!def) {
      throw new Error(`DE${de}: No field definition found.`);
    }
    if (!field || field.value == null) {
      throw new Error(`DE${de}: missing value in JSON.`);
    }
    hex += buildFieldHex(field, def);
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

function asciiToHex(str) {
  return Array.from(str)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
    .join('');
}

/**
 * Encodes a single field's value into its wire-format hex representation.
 * rawHex is derived from the value:
 *   - binary fields (format 'b'): value IS the hex string
 *   - all other fields:           value is ASCII text → encoded as hex pairs
 */
function buildFieldHex(field, def) {
  const isBinary = def.format === 'b';
  const rawHex   = isBinary ? field.value.toUpperCase() : asciiToHex(field.value);
  const length   = isBinary ? rawHex.length / 2 : field.value.length;

  if (def.lengthType === 'LLVAR') {
    // 2-digit ASCII length prefix, ASCII-encoded as hex
    return asciiToHex(String(length).padStart(2, '0')) + rawHex;
  }
  if (def.lengthType === 'LLLVAR') {
    // 3-digit ASCII length prefix, ASCII-encoded as hex
    return asciiToHex(String(length).padStart(3, '0')) + rawHex;
  }
  // fixed
  return rawHex;
}
