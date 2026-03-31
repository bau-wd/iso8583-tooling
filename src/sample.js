import { normalizeEncoding, textToHex } from './encoding.js';

// Sample 0200 Authorization Request used by both the UI and CLI.
// Hex is built using the chosen encoding (default ASCII) to mirror real payloads.

function buildSampleHex(selectedEncoding = 'ascii') {
  const encoding = normalizeEncoding(selectedEncoding);
  const enc = (s) => textToHex(s, encoding);

  const mti    = enc('0200');
  const bitmap = '7238000102C08000';

  const pan = '4111111111111111';
  const de02 = enc(String(pan.length).padStart(2, '0')) + enc(pan);

  const de03 = enc('000000');
  const de04 = enc('000000012345');
  const de07 = enc('0311101526');
  const de11 = enc('000001');
  const de12 = enc('101526');
  const de13 = enc('0311');
  const de22 = enc('012');
  const de25 = enc('00');

  const track2 = '4111111111111111=2512101000000000000';
  const de35   = enc(String(track2.length).padStart(2, '0')) + enc(track2);

  const de41 = enc('TERM0001');
  const de42 = enc('MERCHANT000001 ');
  const de49 = enc('978');

  return [
    mti,
    bitmap,
    de02,
    de03,
    de04,
    de07,
    de11,
    de12,
    de13,
    de22,
    de25,
    de35,
    de41,
    de42,
    de49,
  ].join('');
}

export const SAMPLE_HEX = buildSampleHex();
export { buildSampleHex };
