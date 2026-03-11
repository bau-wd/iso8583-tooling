/**
 * Returns a CSS class for row color-coding by DE range.
 */
function rowClass(de) {
  if (de >= 2  && de <= 14) return 'row-card';
  if (de >= 35 && de <= 45) return 'row-auth';
  if (de >= 48 && de <= 63) return 'row-private';
  return '';
}

/**
 * Escapes HTML special characters for safe insertion.
 */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renders a parsed ISO 8583 message into a container element.
 *
 * @param {HTMLElement} container
 * @param {{ mti, primaryBitmap, secondaryBitmap, fields, errors }} parsedMessage
 */
export function renderMessage(container, parsedMessage) {
  container.innerHTML = '';

  const { mti, primaryBitmap, secondaryBitmap, fields, errors } = parsedMessage;

  // ── Error banner ─────────────────────────────────────────────
  const errorBanner = document.getElementById('errorBanner');
  if (errors && errors.length > 0) {
    errorBanner.classList.remove('hidden');
    errorBanner.innerHTML =
      `<strong>⚠ ${errors.length} parse warning(s):</strong><ul>` +
      errors.map(e => `<li>${esc(e)}</li>`).join('') +
      '</ul>';
  } else {
    errorBanner.classList.add('hidden');
  }

  // ── Build table ──────────────────────────────────────────────
  const table = document.createElement('table');
  table.className = 'field-table';

  // Header
  table.innerHTML = `
    <thead>
      <tr>
        <th>DE #</th>
        <th>Field Name</th>
        <th>Format</th>
        <th>Length Type</th>
        <th>Length</th>
        <th>Value</th>
        <th>Raw Hex</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');

  // MTI row
  const mtiRow = document.createElement('tr');
  mtiRow.className = 'row-mti';
  mtiRow.innerHTML = `
    <td><span class="de-badge">MTI</span></td>
    <td>Message Type Indicator</td>
    <td>n</td>
    <td>fixed</td>
    <td>4</td>
    <td><code>${esc(mti)}</code></td>
    <td><code class="hex">${esc(mtiHexFromMti(mti))}</code></td>
  `;
  tbody.appendChild(mtiRow);

  // Primary Bitmap row
  const pbRow = document.createElement('tr');
  pbRow.className = 'row-bitmap';
  pbRow.innerHTML = `
    <td><span class="de-badge">BMP1</span></td>
    <td>Primary Bitmap</td>
    <td>b</td>
    <td>fixed</td>
    <td>8</td>
    <td><code>${esc(primaryBitmap)}</code></td>
    <td><code class="hex">${esc(primaryBitmap)}</code></td>
  `;
  tbody.appendChild(pbRow);

  // Secondary Bitmap row (if present)
  if (secondaryBitmap) {
    const sbRow = document.createElement('tr');
    sbRow.className = 'row-bitmap';
    sbRow.innerHTML = `
      <td><span class="de-badge">BMP2</span></td>
      <td>Secondary Bitmap (DE1)</td>
      <td>b</td>
      <td>fixed</td>
      <td>8</td>
      <td><code>${esc(secondaryBitmap)}</code></td>
      <td><code class="hex">${esc(secondaryBitmap)}</code></td>
    `;
    tbody.appendChild(sbRow);
  }

  // Data element rows (sorted by DE number)
  const sortedDEs = Object.keys(fields).map(Number).sort((a, b) => a - b);

  for (const de of sortedDEs) {
    const f = fields[de];
    const tr = document.createElement('tr');
    tr.className = rowClass(de);
    tr.innerHTML = `
      <td><span class="de-badge">${esc(de)}</span></td>
      <td>${esc(f.name)}</td>
      <td><code>${esc(f.format)}</code></td>
      <td>${esc(f.lengthType)}</td>
      <td>${esc(f.length)}</td>
      <td><code>${esc(f.value)}</code></td>
      <td><code class="hex">${esc(f.rawHex)}</code></td>
    `;
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

/**
 * Converts an ASCII MTI string back to its hex representation for display.
 */
function mtiHexFromMti(mti) {
  return Array.from(mti)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
    .join('');
}