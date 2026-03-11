/**
 * Reconstructs a hex-encoded ISO 8583 message from a parsed JSON object —
 * the same format produced by exportToJSON / downloadJSON.
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
    if (!field || field.rawHex == null) {
      throw new Error(`DE${de}: missing rawHex in JSON.`);
    }
    hex += buildFieldHex(field);
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

function buildFieldHex(field) {
  const { lengthType, length, rawHex } = field;
  const raw = rawHex.toUpperCase();

  if (lengthType === 'LLVAR') {
    // 2-digit ASCII length prefix, ASCII-encoded as hex
    return asciiToHex(String(length).padStart(2, '0')) + raw;
  }
  if (lengthType === 'LLLVAR') {
    // 3-digit ASCII length prefix, ASCII-encoded as hex
    return asciiToHex(String(length).padStart(3, '0')) + raw;
  }
  // fixed
  return raw;
}
