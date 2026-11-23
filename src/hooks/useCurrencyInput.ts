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
 * - Tracks pre-change selection and `inputType` so replacing/pasting never drops digits
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
  const prevSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const [caretTick, setCaretTick] = useState(0);

  const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  const displayValue = formatCurrencyInput(numericValue, { suffix, zeroAsEmpty });

  const syncSelectionSnapshot = useCallback((el: HTMLInputElement | null) => {
    if (!el || el.selectionStart === null || el.selectionEnd === null) return;
    prevSelectionRef.current = { start: el.selectionStart, end: el.selectionEnd };
  }, []);

  useLayoutEffect(() => {
    const caret = pendingCaretRef.current;
    const el = inputRef.current;
    if (caret === null || !el) return;
    pendingCaretRef.current = null;
    if (document.activeElement === el) {
      el.setSelectionRange(caret, caret);
      prevSelectionRef.current = { start: caret, end: caret };
    }
  }, [displayValue, caretTick]);

  const scheduleCaret = useCallback((caret: number) => {
    pendingCaretRef.current = caret;
    setCaretTick((t) => t + 1);
  }, []);

  const clampCurrentCaret = useCallback(
    (el: HTMLInputElement) => {
      if (el.selectionStart === null || el.selectionStart !== el.selectionEnd) {
        syncSelectionSnapshot(el);
        return;
      }
      const clamped = clampCurrencyCaret(displayValue, el.selectionStart, suffix);
      if (clamped !== el.selectionStart) {
        el.setSelectionRange(clamped, clamped);
      }
      prevSelectionRef.current = { start: clamped, end: clamped };
    },
    [displayValue, suffix, syncSelectionSnapshot],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawCaret = e.target.selectionStart ?? e.target.value.length;
      const prevSel = prevSelectionRef.current;
      const hadSelection = !!prevSel && prevSel.end > prevSel.start;
      const nativeEvent = e.nativeEvent as InputEvent | undefined;
      const inputType =
        typeof nativeEvent?.inputType === 'string' ? nativeEvent.inputType : undefined;
      const result = applyCurrencyChange({
        prevText: displayValue,
        nextRaw: e.target.value,
        rawCaret,
        maxDigits,
        suffix,
        zeroAsEmpty,
        hadSelection,
        inputType,
      });
      scheduleCaret(result.caret);
      onValueChange(result.value);
    },
    [displayValue, maxDigits, onValueChange, scheduleCaret, suffix, zeroAsEmpty],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      syncSelectionSnapshot(el);
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
    [
      displayValue,
      maxDigits,
      onValueChange,
      scheduleCaret,
      suffix,
      syncSelectionSnapshot,
      zeroAsEmpty,
    ],
  );

  const handleBeforeInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      syncSelectionSnapshot(e.currentTarget);
    },
    [syncSelectionSnapshot],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      syncSelectionSnapshot(e.currentTarget);
    },
    [syncSelectionSnapshot],
  );

  const handleSelect = useCallback(
    (e: React.SyntheticEvent<HTMLInputElement>) => {
      syncSelectionSnapshot(e.currentTarget);
    },
    [syncSelectionSnapshot],
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      syncSelectionSnapshot(e.currentTarget);
    },
    [syncSelectionSnapshot],
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
      } else {
        syncSelectionSnapshot(e.currentTarget);
      }
    },
    [clampCurrentCaret, syncSelectionSnapshot],
  );

  return {
    inputRef,
    displayValue,
    handleBeforeInput,
    handleChange,
    handleFocus,
    handleKeyDown,
    handleKeyUp,
    handleMouseUp,
    handlePaste,
    handleSelect,
  };
}
