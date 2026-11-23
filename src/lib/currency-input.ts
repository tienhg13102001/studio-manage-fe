const DEFAULT_SUFFIX = 'đ';
const DEFAULT_MAX_DIGITS = 13;

export interface CurrencyFormatOptions {
  suffix?: string;
  /** Treat numeric `0` as empty string (useful when state uses `0` as blank sentinel). */
  zeroAsEmpty?: boolean;
}

export interface CurrencyParseOptions {
  maxDigits?: number;
}

export interface CurrencyEditOptions extends CurrencyFormatOptions, CurrencyParseOptions {}

export interface CurrencyEditResult {
  value: number | undefined;
  text: string;
  caret: number;
}

const viNumberFormat = new Intl.NumberFormat('vi-VN');

/** Format a non-negative integer VND amount as "2.000.000đ" (empty if null/undefined/NaN). */
export function formatCurrencyInput(
  value: number | '' | null | undefined,
  options: CurrencyFormatOptions = {},
): string {
  const { suffix = DEFAULT_SUFFIX, zeroAsEmpty = false } = options;
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  const rounded = Math.max(0, Math.round(value));
  if (rounded === 0 && zeroAsEmpty) return '';
  return `${viNumberFormat.format(rounded)}${suffix}`;
}

/** Parse user input or pasted text ("2.000.000", "2,000,000đ", "2000000") into an integer. */
export function parseCurrencyInput(
  raw: string,
  options: CurrencyParseOptions = {},
): number | undefined {
  const { maxDigits = DEFAULT_MAX_DIGITS } = options;
  const digits = raw.replace(/\D/g, '').slice(0, maxDigits);
  if (digits === '') return undefined;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Count ASCII digits in `text` strictly before `index`. */
export function countDigitsBefore(text: string, index: number): number {
  const end = Math.max(0, Math.min(index, text.length));
  let count = 0;
  for (let i = 0; i < end; i += 1) {
    const ch = text[i];
    if (ch >= '0' && ch <= '9') count += 1;
  }
  return count;
}

/** Clamp a collapsed caret so it stays before the trailing suffix (e.g. "đ"). */
export function clampCurrencyCaret(text: string, caret: number, suffix = DEFAULT_SUFFIX): number {
  const maxCaret = suffix && text.endsWith(suffix) ? text.length - suffix.length : text.length;
  return Math.max(0, Math.min(caret, maxCaret));
}

/** Find the character index in `formatted` immediately after `digitIndex` digits. */
export function caretFromDigitIndex(
  formatted: string,
  digitIndex: number,
  suffix = DEFAULT_SUFFIX,
): number {
  if (formatted === '' || digitIndex <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    const ch = formatted[i];
    if (ch >= '0' && ch <= '9') {
      seen += 1;
      if (seen === digitIndex) return i + 1;
    }
  }
  return clampCurrencyCaret(formatted, formatted.length, suffix);
}

function buildResultFromDigits(
  rawDigits: string,
  digitsBeforeCaret: number,
  options: CurrencyEditOptions,
): CurrencyEditResult {
  const { suffix = DEFAULT_SUFFIX, maxDigits = DEFAULT_MAX_DIGITS, zeroAsEmpty = false } = options;
  const limited = rawDigits.slice(0, maxDigits);
  const value = limited === '' ? undefined : Number(limited);
  const safeValue = value !== undefined && Number.isFinite(value) ? value : undefined;
  const text = formatCurrencyInput(safeValue, { suffix, zeroAsEmpty });
  if (text === '') return { value: safeValue, text: '', caret: 0 };

  const formattedDigits = text.replace(/\D/g, '');
  const leadingStripped = Math.max(0, limited.length - formattedDigits.length);
  const clampedDigitsBefore = Math.min(digitsBeforeCaret, limited.length);
  const targetDigitIndex = Math.max(0, clampedDigitsBefore - leadingStripped);
  return {
    value: safeValue,
    text,
    caret: caretFromDigitIndex(text, targetDigitIndex, suffix),
  };
}

/**
 * Compute next numeric value, formatted display text, and caret position after a change event.
 * Handles typing/deleting digits anywhere, pasting formatted/unformatted strings, and fallback
 * deletion of formatting chars (`.` or `đ`).
 */
export function applyCurrencyChange(params: {
  prevText: string;
  nextRaw: string;
  rawCaret: number;
  maxDigits?: number;
  suffix?: string;
  zeroAsEmpty?: boolean;
}): CurrencyEditResult {
  const {
    prevText,
    nextRaw,
    rawCaret,
    maxDigits = DEFAULT_MAX_DIGITS,
    suffix = DEFAULT_SUFFIX,
    zeroAsEmpty = false,
  } = params;
  const options: CurrencyEditOptions = { maxDigits, suffix, zeroAsEmpty };

  const prevDigits = prevText.replace(/\D/g, '');
  const nextDigitsAll = nextRaw.replace(/\D/g, '');

  // If only a formatting character ('.' or trailing suffix) was deleted without changing digits,
  // delete the adjacent digit so Backspace never gets stuck on dots or 'đ'.
  if (nextRaw.length < prevText.length && nextDigitsAll === prevDigits && prevDigits.length > 0) {
    if (suffix && prevText.endsWith(suffix) && !nextRaw.endsWith(suffix)) {
      const shortened = prevDigits.slice(0, -1);
      return buildResultFromDigits(shortened, shortened.length, options);
    }
    const digitsBefore = countDigitsBefore(nextRaw, rawCaret);
    if (digitsBefore > 0) {
      const removed = nextDigitsAll.slice(0, digitsBefore - 1) + nextDigitsAll.slice(digitsBefore);
      return buildResultFromDigits(removed, digitsBefore - 1, options);
    }
  }

  const digitsBefore = countDigitsBefore(nextRaw, rawCaret);
  return buildResultFromDigits(nextDigitsAll, digitsBefore, options);
}

/**
 * Intercept Backspace / Delete adjacent to thousand separators (`.`) or suffix (`đ`)
 * when there is a collapsed caret, returning the updated state or `null` to let default run.
 */
export function handleCurrencyKeyDown(params: {
  key: string;
  text: string;
  selectionStart: number;
  selectionEnd: number;
  maxDigits?: number;
  suffix?: string;
  zeroAsEmpty?: boolean;
}): CurrencyEditResult | null {
  const {
    key,
    text,
    selectionStart,
    selectionEnd,
    maxDigits = DEFAULT_MAX_DIGITS,
    suffix = DEFAULT_SUFFIX,
    zeroAsEmpty = false,
  } = params;

  if (selectionStart !== selectionEnd) return null;

  const options: CurrencyEditOptions = { maxDigits, suffix, zeroAsEmpty };
  const suffixStart = suffix && text.endsWith(suffix) ? text.length - suffix.length : text.length;

  if (key === 'Backspace') {
    if (selectionStart === 0) return null;
    if (suffix && text.endsWith(suffix) && selectionStart > suffixStart) {
      const digits = text.replace(/\D/g, '');
      if (digits.length === 0) return null;
      const shortened = digits.slice(0, -1);
      return buildResultFromDigits(shortened, shortened.length, options);
    }
    if (text[selectionStart - 1] === '.') {
      const digits = text.replace(/\D/g, '');
      const digitsBefore = countDigitsBefore(text, selectionStart - 1);
      if (digitsBefore <= 0) return null;
      const removed = digits.slice(0, digitsBefore - 1) + digits.slice(digitsBefore);
      return buildResultFromDigits(removed, digitsBefore - 1, options);
    }
    return null;
  }

  if (key === 'Delete') {
    if (suffix && text.endsWith(suffix) && selectionStart >= suffixStart) {
      const digits = text.replace(/\D/g, '');
      return buildResultFromDigits(digits, countDigitsBefore(text, suffixStart), options);
    }
    if (text[selectionStart] === '.') {
      const digits = text.replace(/\D/g, '');
      const digitsBefore = countDigitsBefore(text, selectionStart);
      if (digitsBefore >= digits.length) return null;
      const removed = digits.slice(0, digitsBefore) + digits.slice(digitsBefore + 1);
      return buildResultFromDigits(removed, digitsBefore, options);
    }
    return null;
  }

  return null;
}
