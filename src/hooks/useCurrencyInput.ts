import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  applyCurrencyChange,
  clampCurrencyCaret,
  formatCurrencyInput,
  handleCurrencyKeyDown,
} from '@/lib/currency-input';

export interface UseCurrencyInputOptions {
  value: number | '' | null | undefined;
  onValueChange: (value: number | undefined) => void;
  suffix?: string;
  maxDigits?: number;
  /** Treat `0` as empty display string (when state uses `0` as blank sentinel). */
  zeroAsEmpty?: boolean;
}

/**
 * Controlled VND currency input hook:
 * - Displays `2.000.000đ` while keeping `number | undefined` state
 * - Preserves caret position across middle edits, deletions, dots, and suffix
 * - Keeps empty inputs empty (does not force `0đ`)
 */
export function useCurrencyInput({
  value,
  onValueChange,
  suffix = 'đ',
  maxDigits = 13,
  zeroAsEmpty = false,
}: UseCurrencyInputOptions) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const [caretTick, setCaretTick] = useState(0);

  const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  const displayValue = formatCurrencyInput(numericValue, { suffix, zeroAsEmpty });

  useLayoutEffect(() => {
    const caret = pendingCaretRef.current;
    const el = inputRef.current;
    if (caret === null || !el) return;
    pendingCaretRef.current = null;
    if (document.activeElement === el) {
      el.setSelectionRange(caret, caret);
    }
  }, [displayValue, caretTick]);

  const scheduleCaret = useCallback((caret: number) => {
    pendingCaretRef.current = caret;
    setCaretTick((t) => t + 1);
  }, []);

  const clampCurrentCaret = useCallback(
    (el: HTMLInputElement) => {
      if (el.selectionStart === null || el.selectionStart !== el.selectionEnd) return;
      const clamped = clampCurrencyCaret(displayValue, el.selectionStart, suffix);
      if (clamped !== el.selectionStart) {
        el.setSelectionRange(clamped, clamped);
      }
    },
    [displayValue, suffix],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawCaret = e.target.selectionStart ?? e.target.value.length;
      const result = applyCurrencyChange({
        prevText: displayValue,
        nextRaw: e.target.value,
        rawCaret,
        maxDigits,
        suffix,
        zeroAsEmpty,
      });
      scheduleCaret(result.caret);
      onValueChange(result.value);
    },
    [displayValue, maxDigits, onValueChange, scheduleCaret, suffix, zeroAsEmpty],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const selectionStart = el.selectionStart ?? displayValue.length;
      const selectionEnd = el.selectionEnd ?? selectionStart;
      const result = handleCurrencyKeyDown({
        key: e.key,
        text: displayValue,
        selectionStart,
        selectionEnd,
        maxDigits,
        suffix,
        zeroAsEmpty,
      });
      if (!result) return;
      e.preventDefault();
      scheduleCaret(result.caret);
      onValueChange(result.value);
    },
    [displayValue, maxDigits, onValueChange, scheduleCaret, suffix, zeroAsEmpty],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLInputElement>) => {
      clampCurrentCaret(e.currentTarget);
    },
    [clampCurrentCaret],
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowRight' || e.key === 'End') {
        clampCurrentCaret(e.currentTarget);
      }
    },
    [clampCurrentCaret],
  );

  return {
    inputRef,
    displayValue,
    handleChange,
    handleKeyDown,
    handleMouseUp,
    handleKeyUp,
  };
}
