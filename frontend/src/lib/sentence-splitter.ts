/**
 * Sentence Splitter — Multi-language Support
 *
 * Splits text into sentences for translation. Handles:
 * - English sentences (split on .!? followed by space or end)
 * - Nepali sentences (split on । — Devanagari danda)
 * - Tamang sentences (similar to Nepali)
 * - Preserves original whitespace and punctuation
 * - Doesn't split on abbreviations (Mr., Mrs., Dr., etc.)
 * - Doesn't split on numbers (3.14, 1,000)
 */

export interface SplitSentence {
  /** The sentence text (without surrounding whitespace) */
  sentence: string;
  /** Leading whitespace before this sentence */
  prefix: string;
  /** Trailing whitespace/punctuation after this sentence */
  suffix: string;
}

/**
 * Common English abbreviations that should NOT trigger a sentence split.
 */
const ABBREVIATIONS: Set<string> = new Set([
  // Titles
  'Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Professor',
  'Rev', 'Revd', 'Hon', 'Sen', 'Rep', 'Gov', 'Lt', 'Gen',
  'Col', 'Maj', 'Capt', 'Sgt', 'Adm', 'Cmdr',
  // Academic/Professional
  'Ph', 'D', 'M', 'B', 'A', 'Jr', 'Sr', 'Inc', 'Ltd', 'Co',
  'Corp', 'Assn', 'Dept', 'Univ', 'Est', 'Govt', 'Org',
  // Common abbreviations
  'etc', 'eg', 'ie', 'vs', 'approx', 'apt', 'dept', 'est',
  'min', 'max', 'misc', 'tech', 'temp', 'vet', 'vol',
  // Nepali abbreviations (romanized)
  'No', 'Nr', 'St', 'Rd', 'Mt',
  // Add period variants
  'al', 'ed', 'vol', 'pp', 'ch', 'sec', 'fig', 'eq',
]);

/**
 * Check if a period at the given position is an abbreviation and not a sentence end.
 *
 * @param text - The full text
 * @param periodIndex - Index of the period character
 * @returns true if this is an abbreviation period, false if it's a sentence-ending period
 */
function isAbbreviationPeriod(text: string, periodIndex: number): boolean {
  // Find the word before the period
  let wordStart = periodIndex - 1;
  while (wordStart >= 0 && /[a-zA-Z]/.test(text[wordStart])) {
    wordStart--;
  }
  wordStart++; // Move to first letter of the word

  const wordBeforePeriod = text.slice(wordStart, periodIndex);

  // Check if the word is a known abbreviation
  if (ABBREVIATIONS.has(wordBeforePeriod)) {
    return true;
  }

  // Single capital letter followed by period (like initials: J. K. Rowling)
  if (wordBeforePeriod.length === 1 && /[A-Z]/.test(wordBeforePeriod)) {
    // Check if next character is also a capital letter followed by period
    const nextCharIdx = periodIndex + 1;
    if (nextCharIdx < text.length) {
      const afterPeriod = text.slice(nextCharIdx).trimStart();
      if (afterPeriod.length > 0 && /^[A-Z]\./.test(afterPeriod)) {
        return true;
      }
    }
    return true;
  }

  return false;
}

/**
 * Check if a period is part of a number (decimal point).
 *
 * @param text - The full text
 * @param periodIndex - Index of the period character
 */
function isNumericPeriod(text: string, periodIndex: number): boolean {
  // Check if digit precedes the period
  if (periodIndex > 0 && /\d/.test(text[periodIndex - 1])) {
    // Check if digit follows the period
    if (periodIndex < text.length - 1 && /\d/.test(text[periodIndex + 1])) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a period is part of an ellipsis.
 */
function isEllipsisPeriod(text: string, periodIndex: number): boolean {
  // Check for ...
  const before = periodIndex > 0 ? text[periodIndex - 1] : '';
  const after = periodIndex < text.length - 1 ? text[periodIndex + 1] : '';
  return before === '.' || after === '.';
}

/**
 * Find sentence boundaries in text.
 * Returns an array of indices where sentences end.
 */
function findSentenceEnds(text: string): number[] {
  const ends: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // English sentence terminators: . ! ?
    if (char === '.' || char === '!' || char === '?') {
      // Skip ellipsis
      if (char === '.' && isEllipsisPeriod(text, i)) {
        continue;
      }

      // Skip numeric periods (3.14)
      if (char === '.' && isNumericPeriod(text, i)) {
        continue;
      }

      // Skip abbreviation periods
      if (char === '.' && isAbbreviationPeriod(text, i)) {
        continue;
      }

      // Check if followed by space or end of text (sentence boundary)
      if (i === text.length - 1) {
        // End of text — definitely a sentence end
        ends.push(i);
      } else if (i + 1 < text.length) {
        const nextChar = text[i + 1];
        // Sentence end if followed by whitespace then capital letter
        if (/\s/.test(nextChar)) {
          // Look ahead for capital letter or Devanagari start
          const restAfterSpace = text.slice(i + 1).trimStart();
          if (restAfterSpace.length === 0) {
            // Ends with whitespace only — trailing punctuation
            ends.push(i);
          } else if (/^[A-Z\u0900-\u097F]/.test(restAfterSpace)) {
            // Followed by capital letter or Devanagari — sentence boundary
            ends.push(i);
          } else if (char === '!' || char === '?') {
            // ! and ? are stronger sentence boundaries even without capital following
            ends.push(i);
          }
          // If followed by lowercase after ., it might be continuation (e.g., "i.e. something")
          // For . we are more conservative
        }
      }
    }

    // Nepali/Tamang sentence terminator: । (Devanagari danda, U+0964)
    if (char === '\u0964') {
      if (i === text.length - 1) {
        ends.push(i);
      } else if (i + 1 < text.length && /\s/.test(text[i + 1])) {
        ends.push(i);
      } else if (i + 1 < text.length && /[\u0900-\u097F]/.test(text[i + 1])) {
        // Followed by Devanagari — sentence boundary
        ends.push(i);
      }
    }

    // Double Devanagari danda ॥ (U+0965) — always a sentence boundary
    if (char === '\u0965') {
      ends.push(i);
    }
  }

  return ends;
}

/**
 * Split text into sentences with prefix and suffix information.
 *
 * Each sentence has:
 * - `sentence`: The actual sentence text
 * - `prefix`: Leading whitespace before the sentence
 * - `suffix`: Trailing whitespace/punctuation after the sentence
 *
 * @param text - The text to split into sentences
 * @returns Array of SplitSentence objects
 */
export function splitSentences(text: string): SplitSentence[] {
  if (!text || text.length === 0) {
    return [];
  }

  const ends = findSentenceEnds(text);

  if (ends.length === 0) {
    // No sentence boundaries found — treat the whole text as one sentence
    const trimmed = text.trimStart();
    const prefix = text.slice(0, text.length - trimmed.length);
    const suffixTrimmed = trimmed.trimEnd();
    const suffix = trimmed.slice(suffixTrimmed.length);

    if (suffixTrimmed.length === 0) {
      return [];
    }

    return [{ sentence: suffixTrimmed, prefix, suffix }];
  }

  const sentences: SplitSentence[] = [];
  let sentenceStart = 0;

  for (const endIdx of ends) {
    // Extract the sentence from start to end (inclusive)
    const rawSentence = text.slice(sentenceStart, endIdx + 1);

    // Extract prefix (leading whitespace)
    const trimmedStart = rawSentence.trimStart();
    const prefix = rawSentence.slice(0, rawSentence.length - trimmedStart.length);

    // Extract suffix (trailing whitespace)
    const trimmedEnd = trimmedStart.trimEnd();
    const suffix = trimmedStart.slice(trimmedEnd.length);

    if (trimmedEnd.length > 0) {
      sentences.push({
        sentence: trimmedEnd,
        prefix,
        suffix,
      });
    }

    sentenceStart = endIdx + 1;
  }

  // Handle remaining text after the last sentence end
  if (sentenceStart < text.length) {
    const remaining = text.slice(sentenceStart);
    const trimmedRemaining = remaining.trimStart();
    const prefix = remaining.slice(0, remaining.length - trimmedRemaining.length);
    const trimmedEnd = trimmedRemaining.trimEnd();
    const suffix = trimmedRemaining.slice(trimmedEnd.length);

    if (trimmedEnd.length > 0) {
      sentences.push({
        sentence: trimmedEnd,
        prefix,
        suffix,
      });
    }
  }

  return sentences;
}

/**
 * Reconstruct text from split sentences (useful after translation).
 *
 * @param sentences - Array of SplitSentence objects (possibly with translated text)
 * @returns The reconstructed text string
 */
export function reconstructSentences(sentences: SplitSentence[]): string {
  return sentences.map((s) => s.prefix + s.sentence + s.suffix).join('');
}

/**
 * Count the number of sentences in the given text.
 */
export function countSentences(text: string): number {
  return splitSentences(text).length;
}
