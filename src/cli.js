#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { parseISO8583 } from './parser.js';
import { buildHexFromJSON } from './importer.js';
import { exportToJSON } from './exporter.js';
import { SAMPLE_HEX } from './sample.js';

function printHelp() {
  console.log(`ISO 8583 Tooling CLI

Usage:
  iso8583 parse [--hex <hex>|--file <path>] [--skip-bytes <n>] [--json] [--out <path>]
  iso8583 build --file <json> [--out <path>] [--summarize]
  iso8583 sample [--json] [--summarize]

Commands:
  parse     Parse a hex-encoded ISO 8583 message. Supports skipping leading bytes.
  build     Build a hex message from a JSON payload (same format as the UI export).
  sample    Output the built-in 0200 sample message.

Options:
  --skip-bytes <n>   Skip N leading bytes (e.g. 2 or 4 length headers) before parsing.
  --json             Output the parsed message as JSON (same minimal export as the UI).
  --out <path>       Write output to a file instead of stdout.
  --summarize        For build/sample, also parse the resulting hex and print a table.

Examples:
  iso8583 parse --hex \"${SAMPLE_HEX.slice(0, 24)}...\" --skip-bytes 2 --json
  iso8583 parse --file message.hex --out parsed.json --json
  iso8583 build --file payload.json --out message.hex --summarize
  iso8583 sample --summarize
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._ = args._ || [];
      args._.push(arg);
    }
  }
  return args;
}

function readStdin() {
  if (process.stdin.isTTY) return null;
  return fs.readFileSync(0, 'utf8');
}

function readHexInput(args) {
  if (args.hex) return String(args.hex);
  if (args.file) return fs.readFileSync(path.resolve(args.file), 'utf8');
  const piped = readStdin();
  if (piped) return piped;
  throw new Error('Provide hex input via --hex, --file, or STDIN piping.');
}

function readJsonInput(args) {
  if (args.file) {
    const content = fs.readFileSync(path.resolve(args.file), 'utf8');
    return JSON.parse(content);
  }
  const piped = readStdin();
  if (piped) return JSON.parse(piped);
  throw new Error('Provide JSON via --file or STDIN piping.');
}

function sanitizeHex(raw) {
  return raw.replace(/\s+/g, '').toUpperCase();
}

function writeOutput(content, outPath) {
  if (!outPath) {
    console.log(content);
    return;
  }
  fs.writeFileSync(path.resolve(outPath), content);
  console.log(`Wrote ${content.length} characters to ${outPath}`);
}

function truncate(value, max = 60) {
  const str = String(value);
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}…`;
}

function formatFieldsTable(fields) {
  const rows = Object.keys(fields)
    .map(Number)
    .sort((a, b) => a - b)
    .map(de => {
      const f = fields[de];
      return [
        `DE${de.toString().padStart(3, '0')}`,
        f.name ?? '?',
        f.format ?? '?',
        f.lengthType ?? '?',
        String(f.length ?? '?'),
        truncate(f.value ?? ''),
      ];
    });

  const headers = ['DE', 'Name', 'Format', 'Length Type', 'Len', 'Value'];
  const widths = headers.map((h, idx) => Math.max(h.length, ...rows.map(r => r[idx].length || 0)));

  const renderRow = (cols) => cols.map((c, i) => c.padEnd(widths[i])).join('  ');

  const lines = [
    renderRow(headers),
    renderRow(widths.map(w => '-'.repeat(w))),
    ...rows.map(renderRow),
  ];

  return lines.join('\n');
}

function printParseSummary(parsed) {
  const fieldCount = Object.keys(parsed.fields).length;
  console.log(`MTI:             ${parsed.mti ?? '—'}`);
  console.log(`Primary Bitmap:  ${parsed.primaryBitmap ?? '—'}`);
  console.log(`Secondary Bitmap:${parsed.secondaryBitmap ?? '—'}`);
  console.log(`Fields Present:  ${fieldCount}`);
  if (parsed.errors && parsed.errors.length > 0) {
    console.log(`Warnings (${parsed.errors.length}):`);
    for (const err of parsed.errors) console.log(`  - ${err}`);
  }
  if (fieldCount > 0) {
    console.log('\n' + formatFieldsTable(parsed.fields));
  }
}

function handleParse(args) {
  const skipBytes = Number(args['skip-bytes'] ?? 0) || 0;
  const rawHex = readHexInput(args);
  const parsed = parseISO8583(sanitizeHex(rawHex), { skipBytes });

  if (args.json) {
    const json = exportToJSON(parsed);
    writeOutput(json, args.out);
    return;
  }

  printParseSummary(parsed);
}

function handleBuild(args) {
  const payload = readJsonInput(args);
  const hex = buildHexFromJSON(payload);
  writeOutput(hex, args.out);

  if (args.summarize) {
    console.log('\nParsed view:');
    printParseSummary(parseISO8583(hex));
  }
}

function handleSample(args) {
  const hex = SAMPLE_HEX;

  if (args.json) {
    const parsed = parseISO8583(hex);
    const json = exportToJSON(parsed);
    writeOutput(json, args.out);
  } else {
    writeOutput(hex, args.out);
  }

  if (args.summarize) {
    console.log('\nParsed view:');
    printParseSummary(parseISO8583(hex));
  }
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  try {
    if (!command || command === 'help' || args.help) {
      printHelp();
      return;
    }

    if (command === 'parse') return handleParse(args);
    if (command === 'build') return handleBuild(args);
    if (command === 'sample') return handleSample(args);

    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
