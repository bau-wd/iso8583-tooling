/**
 * Serializes a parsed ISO 8583 message to a pretty-printed JSON string.
 *
 * @param {object} parsedMessage
 * @returns {string}
 */
export function exportToJSON(parsedMessage) {
  // Minimal LLM-friendly format: only mti + a flat { deNumber: value } map.
  // Bitmaps are computed from the field keys on import; format/lengthType/name
  // come from FIELD_DEFINITIONS. No rawHex or metadata needed.
  const clean = {
    mti: parsedMessage.mti,
    fields: Object.fromEntries(
      Object.entries(parsedMessage.fields).map(([k, f]) => [k, f.value])
    ),
  };
  return JSON.stringify(clean, null, 2);
}

/**
 * Copies the parsed message as pretty-printed JSON to the clipboard.
 * Returns a Promise that resolves to true on success, false on failure.
 *
 * @param {object} parsedMessage
 * @returns {Promise<boolean>}
 */
export async function copyJSONToClipboard(parsedMessage) {
  const json = exportToJSON(parsedMessage);
  try {
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    return false;
  }
}

/**
 * Triggers a browser download of the parsed message as a .json file.
 *
 * @param {object} parsedMessage
 * @param {string} [filename='iso8583-message.json']
 */
export function downloadJSON(parsedMessage, filename = 'iso8583-message.json') {
  const json = exportToJSON(parsedMessage);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}