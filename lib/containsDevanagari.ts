/**
 * Devanagari (Hindi, Marathi, Nepali, etc.) — used to tune typography/spacing where
 * Latin metrics feel tight (matras, shirorekha, conjuncts).
 * Ranges: Unicode Devanagari, Devanagari Extended.
 */
const DEVANAGARI = /[\u0900-\u097F\uA8E0-\uA8FF]/;

export function containsDevanagari(text: string): boolean {
  return text.length > 0 && DEVANAGARI.test(text);
}
