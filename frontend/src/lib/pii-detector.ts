/**
 * PII Detector — Split-Around Approach
 *
 * Instead of replacing PII with placeholders (which the TMT API can't handle),
 * we split the text AROUND the PII entities. Only 'text' fragments get sent
 * to the translation API; 'pii' fragments are preserved as-is in the output.
 */

export interface PIIFragment {
  /** Whether this fragment is translatable text or protected PII */
  type: 'text' | 'pii';
  /** The text content of this fragment */
  value: string;
  /** The type of PII detected (only for type='pii') */
  piiType?: 'name' | 'phone' | 'email' | 'address' | 'location';
}

/** PII entity detected in text, with position information */
interface PIIMatch {
  start: number;
  end: number;
  piiType: PIIFragment['piiType'];
  value: string;
}

// =====================
// Detection Patterns
// =====================

/** Nepali phone: +977-XXXXXXXXXX or +977 XXXXXXXXXX or 01-XXXXXXX */
const PHONE_PATTERNS: Array<{ regex: RegExp; piiType: 'phone' }> = [
  // +977-98XXXXXXXX or +977-1XXXXXXXX
  { regex: /\+977[-\s]?\d{10}/g, piiType: 'phone' },
  // 01-XXXXXXX or 01 XXXXXXX (Kathmandu landline)
  { regex: /\b01[-\s]\d{7}\b/g, piiType: 'phone' },
  // 98XXXXXXXX (10-digit mobile)
  { regex: /\b98\d{8}\b/g, piiType: 'phone' },
  // International format: +XX-XXXXXXXXXX
  { regex: /\+\d{1,3}[-\s]?\d{7,12}/g, piiType: 'phone' },
];

/** Standard email pattern */
const EMAIL_PATTERN: RegExp = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Name patterns: titles followed by capitalized words */
const NAME_PATTERNS: Array<{ regex: RegExp; piiType: 'name' }> = [
  // Mr./Mrs./Ms./Dr./Prof. followed by 1-3 capitalized words
  { regex: /(?:Mr|Mrs|Ms|Miss|Dr|Prof|Professor)\.\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2}/g, piiType: 'name' },
];

/** Known location names in Nepal */
const NEPAL_LOCATIONS: string[] = [
  'Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Biratnagar',
  'Birgunj', 'Dharan', 'Bharatpur', 'Janakpur', 'Nepalgunj',
  'Butwal', 'Itahari', 'Hetauda', 'Dhangadhi', 'Chitwan',
  'Siddharthanagar', 'Tulsipur', 'Damak', 'Mechinagar',
  'Kirtipur', 'Madhyapur Thimi', 'Banepa', 'Dhulikhel',
  'Panauti', 'Sankhu', 'Boudha', 'Thamel', 'Patan',
  'Nagarkot', 'Dhading', 'Gorkha', 'Palpa', 'Mustang',
  'काठमाडौं', 'पोखरा', 'ललितपुर', 'भक्तपुर', 'विराटनगर',
  'बिरगंज', 'धरान', 'भरतपुर', 'जनकपुर', 'नेपालगंज',
  'बुटवल', 'इटहरी', 'हेटौंडा', 'धनगढी', 'चितवन',
];

/** Address patterns */
const ADDRESS_PATTERNS: Array<{ regex: RegExp; piiType: 'address' }> = [
  // Street address: Number + Street/Road/Marg
  { regex: /\b\d+\s+[A-Z][a-zA-Z]+\s+(?:Street|St|Road|Rd|Marg|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Way|Drive|Dr|Chowk|Tole|Galli)\b(?:\s*,\s*[A-Z][a-zA-Z\s]+){0,2}/g, piiType: 'address' },
  // Ward/X pattern in Nepal: Ward No. X
  { regex: /Ward\s+No\.?\s*\d+/gi, piiType: 'address' },
];

/**
 * Detect all PII entities in the given text and return them as sorted matches.
 */
function detectAllPII(text: string): PIIMatch[] {
  const matches: PIIMatch[] = [];

  // Detect emails
  let match: RegExpExecArray | null;
  EMAIL_PATTERN.lastIndex = 0;
  while ((match = EMAIL_PATTERN.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      piiType: 'email',
      value: match[0],
    });
  }

  // Detect phone numbers
  for (const pattern of PHONE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        piiType: pattern.piiType,
        value: match[0],
      });
    }
  }

  // Detect names (title + capitalized words)
  for (const pattern of NAME_PATTERNS) {
    pattern.regex.lastIndex = 0;
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        piiType: pattern.piiType,
        value: match[0],
      });
    }
  }

  // Detect addresses
  for (const pattern of ADDRESS_PATTERNS) {
    pattern.regex.lastIndex = 0;
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        piiType: pattern.piiType,
        value: match[0],
      });
    }
  }

  // Detect Nepal locations
  for (const location of NEPAL_LOCATIONS) {
    const locRegex = new RegExp(`\\b${escapeRegex(location)}\\b`, 'g');
    while ((match = locRegex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        piiType: 'location',
        value: match[0],
      });
    }
  }

  // Sort by start position, then by longest match first (for overlapping)
  matches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - a.end;
  });

  return matches;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remove overlapping PII matches, keeping the longest match at each position.
 */
function removeOverlaps(matches: PIIMatch[]): PIIMatch[] {
  if (matches.length === 0) return [];

  const result: PIIMatch[] = [matches[0]];

  for (let i = 1; i < matches.length; i++) {
    const current = matches[i];
    const last = result[result.length - 1];

    // If current overlaps with last, skip current (last is longer since sorted)
    if (current.start < last.end) {
      continue;
    }

    result.push(current);
  }

  return result;
}

/**
 * Detect PII in text and split around it.
 *
 * Example:
 *   "My name is John Smith and I live in Kathmandu"
 *   → [
 *       {type:'text', value:'My name is '},
 *       {type:'pii', value:'John Smith', piiType:'name'},
 *       {type:'text', value:' and I live in '},
 *       {type:'pii', value:'Kathmandu', piiType:'location'}
 *     ]
 *
 * Only 'text' fragments should be sent to the translation API.
 * 'pii' fragments are preserved as-is in the final output.
 */
export function detectPII(text: string): PIIFragment[] {
  if (!text || text.trim().length === 0) {
    return [{ type: 'text', value: text }];
  }

  const matches = removeOverlaps(detectAllPII(text));

  if (matches.length === 0) {
    return [{ type: 'text', value: text }];
  }

  const fragments: PIIFragment[] = [];
  let lastEnd = 0;

  for (const match of matches) {
    // Add text before this PII match
    if (match.start > lastEnd) {
      fragments.push({
        type: 'text',
        value: text.slice(lastEnd, match.start),
      });
    }

    // Add the PII fragment
    fragments.push({
      type: 'pii',
      value: match.value,
      piiType: match.piiType,
    });

    lastEnd = match.end;
  }

  // Add remaining text after the last PII match
  if (lastEnd < text.length) {
    fragments.push({
      type: 'text',
      value: text.slice(lastEnd),
    });
  }

  return fragments;
}

/**
 * Reconstruct text from PII fragments after translation.
 * Text fragments get their translated value; PII fragments stay unchanged.
 *
 * @param fragments - The original fragments with PII detected
 * @param translations - Map from original text fragment value to translated value
 * @returns The reconstructed text string
 */
export function reconstructFromFragments(
  fragments: PIIFragment[],
  translations: Map<string, string>
): string {
  return fragments
    .map((fragment) => {
      if (fragment.type === 'pii') {
        return fragment.value;
      }
      return translations.get(fragment.value) ?? fragment.value;
    })
    .join('');
}

/**
 * Check if a string contains any PII.
 */
export function containsPII(text: string): boolean {
  return detectAllPII(text).length > 0;
}

/**
 * Get all PII entities found in text (without splitting).
 */
export function findPIIEntities(text: string): Array<{ value: string; type: string; start: number; end: number }> {
  return removeOverlaps(detectAllPII(text)).map((m) => ({
    value: m.value,
    type: m.piiType ?? 'unknown',
    start: m.start,
    end: m.end,
  }));
}
