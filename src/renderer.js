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
 * @param {{ profile, errors: string[], warnings: string[] }} [validation]
 */
export function renderMessage(container, parsedMessage, validation) {
  container.innerHTML = '';

  const { mti, primaryBitmap, secondaryBitmap, fields, errors } = parsedMessage;

  // ── Error banner ─────────────────────────────────────────────
  const errorBanner = document.getElementById('errorBanner');
  const parseWarnings = errors || [];
  const validationErrors = validation?.errors || [];
  const validationWarnings = validation?.warnings || [];
  const bannerMessages = [
    ...parseWarnings.map(e => `Parse: ${e}`),
    ...validationErrors,
    ...validationWarnings,
  ];

  if (bannerMessages.length > 0) {
    errorBanner.classList.remove('hidden');
    errorBanner.innerHTML =
      `<strong>⚠ ${bannerMessages.length} issue${bannerMessages.length === 1 ? '' : 's'}:</strong><ul>` +
      bannerMessages.map(e => `<li>${esc(e)}</li>`).join('') +
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

/**
 * Renders a side-by-side comparison of two parsed ISO 8583 messages.
 *
 * @param {HTMLElement} container
 * @param {object} messageA
 * @param {object} messageB
 */
export function renderComparison(container, messageA, messageB) {
  if (!container) return;
  container.innerHTML = '';

  const fieldsA = messageA?.fields || {};
  const fieldsB = messageB?.fields || {};
  const allDes = Array.from(
    new Set([...Object.keys(fieldsA), ...Object.keys(fieldsB)].map(Number))
  ).sort((a, b) => a - b);

  const onlyA   = allDes.filter(de => fieldsA[de] && !fieldsB[de]);
  const onlyB   = allDes.filter(de => !fieldsA[de] && fieldsB[de]);
  const changed = allDes.filter(de => fieldsA[de] && fieldsB[de] && !sameField(fieldsA[de], fieldsB[de]));

  const summaryGrid = document.createElement('div');
  summaryGrid.className = 'compare-summary-grid';
  summaryGrid.appendChild(summaryCard('Message A', messageA));
  summaryGrid.appendChild(summaryCard('Message B', messageB));
  summaryGrid.appendChild(deltaCard(onlyA, onlyB, changed));
  container.appendChild(summaryGrid);

  const note = document.createElement('div');
  note.className = 'compare-note';
  note.textContent = (changed.length + onlyA.length + onlyB.length) === 0
    ? 'Messages match across all present data elements.'
    : 'Differences highlighted below. Bitmaps show elements present only on one side.';
  container.appendChild(note);

  const table = document.createElement('table');
  table.className = 'field-table diff-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>DE #</th>
        <th>Field</th>
        <th>Message A</th>
        <th>Message B</th>
        <th>Status</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  if (allDes.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" class="empty">No data elements present in either message.</td>`;
    tbody.appendChild(tr);
  } else {
    for (const de of allDes) {
      const a = fieldsA[de];
      const b = fieldsB[de];
      const status = classifyDiff(a, b);
      const tr = document.createElement('tr');
      tr.className = `diff-${status} ${rowClass(de)}`;
      tr.innerHTML = `
        <td><span class="de-badge">${esc(de)}</span></td>
        <td>
          <div class="field-name">${esc(a?.name || b?.name || 'Unknown')}</div>
          <div class="field-meta"><code>${esc(a?.format || b?.format || '?')}</code> · ${esc(a?.lengthType || b?.lengthType || '?')}</div>
        </td>
        <td>${renderCell(a)}</td>
        <td>${renderCell(b)}</td>
        <td><span class="status-badge status-${status}">${statusLabel(status)}</span></td>
      `;
      tbody.appendChild(tr);
    }
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

function classifyDiff(fieldA, fieldB) {
  if (fieldA && fieldB) return sameField(fieldA, fieldB) ? 'same' : 'changed';
  if (fieldA) return 'only-a';
  return 'only-b';
}

function sameField(fieldA, fieldB) {
  return fieldA.value === fieldB.value && fieldA.rawHex === fieldB.rawHex && fieldA.length === fieldB.length;
}

function renderCell(field) {
  if (!field) return '<div class="muted">— not present —</div>';
  return `
    <div class="value-line"><code>${esc(field.value)}</code></div>
    <div class="value-meta">
      <span class="hex">${esc(field.rawHex)}</span>
      <span class="meta-chip">${esc(field.format)} • ${esc(field.lengthType)} • ${esc(field.length)}</span>
    </div>
  `;
}

function summaryCard(title, parsed) {
  const fieldCount = Object.keys(parsed?.fields || {}).length;
  const errors = parsed?.errors || [];
  const card = document.createElement('div');
  card.className = 'compare-card';
  card.innerHTML = `
    <div class="compare-card-title">${esc(title)}</div>
    <div class="compare-card-grid">
      <div>
        <div class="label">MTI</div>
        <div class="mono strong">${esc(parsed?.mti ?? '—')}</div>
      </div>
      <div>
        <div class="label">Primary Bitmap</div>
        <code class="mono">${esc(parsed?.primaryBitmap ?? '—')}</code>
      </div>
      <div>
        <div class="label">Secondary Bitmap</div>
        <code class="mono">${esc(parsed?.secondaryBitmap ?? '—')}</code>
      </div>
      <div>
        <div class="label">Fields Present</div>
        <span class="badge badge-count">${fieldCount}</span>
      </div>
    </div>
    ${errors.length ? `<div class="compare-errors">${errors.map(e => `<div>• ${esc(e)}</div>`).join('')}</div>` : ''}
  `;
  return card;
}

function deltaCard(onlyA, onlyB, changed) {
  const card = document.createElement('div');
  card.className = 'compare-card delta-card';
  card.innerHTML = `
    <div class="compare-card-title">Bitmap Delta</div>
    ${deltaRow('Only in A', onlyA, 'delta-a')}
    ${deltaRow('Only in B', onlyB, 'delta-b')}
    ${deltaRow('Changed Fields', changed, 'delta-changed')}
  `;
  return card;
}

function deltaRow(label, items, cls) {
  const chips = items.length
    ? items.map(de => `<span class="tag ${cls}">DE${esc(de)}</span>`).join('')
    : '<span class="muted">None</span>';
  return `
    <div class="delta-row">
      <span class="delta-label">${esc(label)}</span>
      <div class="delta-values">${chips}</div>
    </div>
  `;
}

function statusLabel(status) {
  if (status === 'changed') return 'Changed';
  if (status === 'only-a') return 'Only A';
  if (status === 'only-b') return 'Only B';
  return 'Same';
}
