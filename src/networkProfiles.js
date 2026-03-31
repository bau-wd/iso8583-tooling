import { FIELD_DEFINITIONS } from './fieldDefinitions.js';

const PRESET_LIST = [
  {
    id: 'none',
    label: 'No preset (basic ISO)',
    description: 'Skip network-specific validation and just parse the message.',
  },
  {
    id: 'visa',
    label: 'Visa Base',
    description: 'Common VisaNet auth/financial profile (0200/0100/0420/0800).',
    mtiPatterns: ['01xx', '02xx', '04xx', '08xx'],
    required: {
      default: [2, 3, 4, 7, 11, 12, 13, 22, 24, 25, 37, 41, 42, 49],
      byMti: {
        '04xx': [90],
        '08xx': [70],
      },
    },
    recommended: {
      default: [14, 35, 38, 55],
    },
  },
  {
    id: 'mastercard',
    label: 'Mastercard (Banknet)',
    description: 'Typical Mastercard auth/financial messages (0100/0200/0420/0800).',
    mtiPatterns: ['01xx', '02xx', '04xx', '08xx'],
    required: {
      default: [2, 3, 4, 7, 11, 12, 13, 22, 24, 25, 32, 37, 41, 42, 49],
      byMti: {
        '04xx': [90],
        '08xx': [70],
      },
    },
    recommended: {
      default: [14, 35, 38, 52, 55],
    },
  },
  {
    id: 'amex',
    label: 'American Express',
    description: 'Common Amex auth/financial profile.',
    mtiPatterns: ['01xx', '02xx', '04xx'],
    required: {
      default: [2, 3, 4, 7, 11, 12, 13, 18, 22, 37, 41, 42, 49],
      byMti: {
        '04xx': [90],
      },
    },
    recommended: {
      default: [14, 35, 43],
    },
  },
];

const PRESET_MAP = Object.fromEntries(PRESET_LIST.map(p => [p.id, p]));

export const NETWORK_PRESETS = PRESET_LIST;

export function findPreset(presetId) {
  return PRESET_MAP[presetId] || PRESET_MAP.none;
}

export function validateMessageProfile(message, presetId) {
  const preset = findPreset(presetId);
  const profile = {
    id: preset.id,
    label: preset.label,
    description: preset.description,
  };

  if (preset.id === 'none') {
    return { profile, errors: [], warnings: [] };
  }

  const mti = message?.mti || '';
  const present = new Set(Object.keys(message?.fields || {}).map(Number));

  const errors = [];
  const warnings = [];

  const required = collectFields(preset.required, mti);
  const recommended = collectFields(preset.recommended, mti);

  if (preset.mtiPatterns?.length && mti) {
    const matches = preset.mtiPatterns.some(pattern => mtiMatches(pattern, mti));
    if (!matches) {
      warnings.push(`MTI ${mti} is not typical for ${preset.label}. Expected ${preset.mtiPatterns.join(', ')}.`);
    }
  }

  for (const de of required) {
    if (!present.has(de)) {
      errors.push(`${preset.label} requires DE${padDe(de)} (${FIELD_DEFINITIONS[de]?.name ?? 'Unknown field'}).`);
    }
  }

  for (const de of recommended) {
    if (!present.has(de)) {
      warnings.push(`${preset.label} usually includes DE${padDe(de)} (${FIELD_DEFINITIONS[de]?.name ?? 'Unknown field'}).`);
    }
  }

  return { profile, errors, warnings };
}

function collectFields(spec = {}, mti = '') {
  const set = new Set(spec.default || []);
  if (spec.byMti && mti) {
    for (const [pattern, list] of Object.entries(spec.byMti)) {
      if (mtiMatches(pattern, mti)) {
        list.forEach(de => set.add(de));
      }
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

function mtiMatches(pattern, mti) {
  if (!pattern || !mti) return false;
  const regex = new RegExp(`^${pattern.replace(/x/gi, '.')}$`);
  return regex.test(mti);
}

function padDe(de) {
  return String(de).padStart(3, '0');
}
