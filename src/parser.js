import { FIELD_DEFINITIONS } from './fieldDefinitions.js';
import { hexToText, normalizeEncoding } from './encoding.js';

/**
 * Parses bits from an 8-byte (16 hex char) bitmap string.
 * Returns an array of bit positions (1-based) that are set.
 */
function parseBitmap(hexBitmap, offset = 0) {
  const setBits = [];
  for (let i = 0; i < 16; i++) {
    const nibble = parseInt(hexBitmap[i], 16);
    for (let bit = 3; bit >= 0; bit--) {
      if (nibble & (1 << bit)) {
        setBits.push(offset + (i * 4) + (4 - bit));
      }
    }
  }
  return setBits;
}

/**
 * Reads characters from the hex string cursor position.
 * For text fields: decoding respects the selected encoding (default ASCII).
 * For binary fields: maxLength bytes = maxLength*2 hex chars.
 */
function readField(hex, cursor, def, encoding) {
  const isBinary = def.format === 'b';
  let length;
  let prefixLen = 0;

  if (def.lengthType === 'fixed') {
    length = isBinary ? def.maxLength * 2 : def.maxLength * 2; // always hex pairs
  } else if (def.lengthType === 'LLVAR') {
    prefixLen = 4; // 2 ASCII chars = 4 hex chars
    const lenStr = hexToText(hex.slice(cursor, cursor + 4), encoding);
    length = parseInt(lenStr, 10) * 2;
  } else if (def.lengthType === 'LLLVAR') {
    prefixLen = 6; // 3 ASCII chars = 6 hex chars
    const lenStr = hexToText(hex.slice(cursor, cursor + 6), encoding);
    length = parseInt(lenStr, 10) * 2;
  }

  const rawHex = hex.slice(cursor + prefixLen, cursor + prefixLen + length);
  const value = isBinary ? rawHex : hexToText(rawHex, encoding);
  const charLength = length / 2;

  return {
    value,
    rawHex,
    length: charLength,
    consumed: prefixLen + length,
  };
}

/**
 * Main ISO 8583:1993 parser.
 *
 * @param {string} rawHex   - Hex-encoded ISO 8583 message (spaces ignored).
 * @param {object} options
 *   @param {number} options.skipBytes - Number of leading bytes (not hex chars) to skip (e.g. length header).
 * @returns {{ mti, primaryBitmap, secondaryBitmap, fields, errors }}
 */
export function parseISO8583(rawHex, options = {}) {
  const errors = [];
  const fields = {};
  const encoding = normalizeEncoding(options.encoding);

  // Normalize: strip spaces, uppercase
  const hex = rawHex.replace(/\s+/g, '').toUpperCase();

  // Skip leading bytes (e.g. length header)
  const skipChars = (options.skipBytes || 0) * 2;
  let cursor = skipChars;

  // ── MTI ──────────────────────────────────────────────────────
  if (hex.length < cursor + 8) {
    return { mti: null, primaryBitmap: null, secondaryBitmap: null, fields, errors: ['Message too short to contain MTI'] };
  }
  const mtiHex = hex.slice(cursor, cursor + 8);
  const mti = hexToText(mtiHex, encoding);
  cursor += 8;

  // ── Primary Bitmap ───────────────────────────────���───────────
  if (hex.length < cursor + 16) {
    return { mti, primaryBitmap: null, secondaryBitmap: null, fields, errors: ['Message too short to contain primary bitmap'] };
  }
  const primaryBitmapHex = hex.slice(cursor, cursor + 16);
  cursor += 16;
  const primaryBits = parseBitmap(primaryBitmapHex, 0);

  // ── Secondary Bitmap (if bit 1 is set) ───────────────────────
  let secondaryBitmapHex = null;
  let allBits = primaryBits.filter(b => b !== 1); // DE1 = secondary bitmap indicator

  if (primaryBits.includes(1)) {
    if (hex.length < cursor + 16) {
      errors.push('Bit 1 set but message too short for secondary bitmap');
    } else {
      secondaryBitmapHex = hex.slice(cursor, cursor + 16);
      cursor += 16;
      const secondaryBits = parseBitmap(secondaryBitmapHex, 64);
      allBits = [...allBits, ...secondaryBits];
    }
  }

  // ── Data Elements ────────────────────────────────────────────
  for (const de of allBits) {
    if (de === 1 || de === 65) continue; // bitmap indicators, not real DEs

    const def = FIELD_DEFINITIONS[de];
    if (!def) {
      errors.push(`DE${de}: No field definition found – skipping`);
      continue;
    }

    try {
      const result = readField(hex, cursor, def, encoding);
      fields[de] = {
        de,
        name: def.name,
        format: def.format,
        lengthType: def.lengthType,
        length: result.length,
        value: result.value,
        rawHex: result.rawHex,
      };
      cursor += result.consumed;
    } catch (err) {
      errors.push(`DE${de} (${def.name}): ${err.message}`);
    }
  }

  return {
    mti,
    primaryBitmap: primaryBitmapHex,
    secondaryBitmap: secondaryBitmapHex,
    fields,
    errors,
  };
}
