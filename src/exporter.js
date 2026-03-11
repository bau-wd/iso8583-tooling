/**
 * Serializes a parsed ISO 8583 message to a pretty-printed JSON string.
 *
 * @param {object} parsedMessage
 * @returns {string}
 */
export function exportToJSON(parsedMessage) {
  return JSON.stringify(parsedMessage, null, 2);
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