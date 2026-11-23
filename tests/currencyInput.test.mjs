import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyCurrencyChange,
  caretFromDigitIndex,
  clampCurrencyCaret,
  countDigitsBefore,
  formatCurrencyInput,
  handleCurrencyKeyDown,
  parseCurrencyInput,
} from '../src/lib/currency-input.ts';

test('formatCurrencyInput formats numbers with dot separators and đ suffix', () => {
  assert.equal(formatCurrencyInput(2_000_000), '2.000.000đ');
  assert.equal(formatCurrencyInput(2_320_000), '2.320.000đ');
  assert.equal(formatCurrencyInput(500), '500đ');
  assert.equal(formatCurrencyInput(0), '0đ');
});

test('formatCurrencyInput keeps empty inputs empty and supports zeroAsEmpty', () => {
  assert.equal(formatCurrencyInput(undefined), '');
  assert.equal(formatCurrencyInput(null), '');
  assert.equal(formatCurrencyInput(''), '');
  assert.equal(formatCurrencyInput(Number.NaN), '');
  assert.equal(formatCurrencyInput(0, { zeroAsEmpty: true }), '');
  assert.equal(formatCurrencyInput(150_000, { zeroAsEmpty: true }), '150.000đ');
});

test('parseCurrencyInput parses formatted, pasted, and raw numeric strings', () => {
  assert.equal(parseCurrencyInput('2.000.000'), 2_000_000);
  assert.equal(parseCurrencyInput('2,000,000đ'), 2_000_000);
  assert.equal(parseCurrencyInput('2000000'), 2_000_000);
  assert.equal(parseCurrencyInput('  2.320.000 đ '), 2_320_000);
  assert.equal(parseCurrencyInput('0'), 0);
  assert.equal(parseCurrencyInput('00500'), 500);
  assert.equal(parseCurrencyInput(''), undefined);
  assert.equal(parseCurrencyInput('abc đ'), undefined);
});

test('applyCurrencyChange handles pasting formatted and unformatted values into empty input', () => {
  for (const pasted of ['2.000.000', '2,000,000đ', '2000000']) {
    const res = applyCurrencyChange({
      prevText: '',
      nextRaw: pasted,
      rawCaret: pasted.length,
      inputType: 'insertFromPaste',
    });
    assert.equal(res.value, 2_000_000);
    assert.equal(res.text, '2.000.000đ');
    assert.equal(res.caret, '2.000.000'.length);
  }
});

test('select-all and paste/type same or different value preserves every digit', () => {
  for (const [prevText, pasted, expectedVal, expectedText] of [
    ['2.000.000đ', '2000000', 2_000_000, '2.000.000đ'],
    ['2.000.000đ', '2.000.000', 2_000_000, '2.000.000đ'],
    ['1.500.000đ', '1500000', 1_500_000, '1.500.000đ'],
    ['5đ', '5', 5, '5đ'],
    ['2.000.000đ', '3500000', 3_500_000, '3.500.000đ'],
  ]) {
    const res = applyCurrencyChange({
      prevText,
      nextRaw: pasted,
      rawCaret: pasted.length,
      hadSelection: true,
      inputType: 'insertFromPaste',
    });
    assert.equal(res.value, expectedVal);
    assert.equal(res.text, expectedText);
    assert.equal(res.caret, expectedText.length - 1);
  }

  // Even without inputType (synthetic/JSDOM fallback), hadSelection prevents Backspace heuristic
  const synthetic = applyCurrencyChange({
    prevText: '5đ',
    nextRaw: '5',
    rawCaret: 1,
    hadSelection: true,
  });
  assert.deepEqual(synthetic, { value: 5, text: '5đ', caret: 1 });

  // Multi-char length drop (e.g. "2.000.000đ" -> "2000000") never triggers single-char Backspace
  const multiCharDrop = applyCurrencyChange({
    prevText: '2.000.000đ',
    nextRaw: '2000000',
    rawCaret: 7,
  });
  assert.deepEqual(multiCharDrop, { value: 2_000_000, text: '2.000.000đ', caret: 9 });

  // Ctrl+A and type single digit
  const ctrlAType = applyCurrencyChange({
    prevText: '2.000.000đ',
    nextRaw: '7',
    rawCaret: 1,
    hadSelection: true,
    inputType: 'insertText',
  });
  assert.deepEqual(ctrlAType, { value: 7, text: '7đ', caret: 1 });
});

test('default 0đ replaces 0 when typing or pasting digits instead of appending trailing 0', () => {
  // Caret before 0 ("|0đ"), type '7' -> "7đ", caret after '7'
  const beforeZero = applyCurrencyChange({
    prevText: '0đ',
    nextRaw: '70đ',
    rawCaret: 1,
    inputType: 'insertText',
  });
  assert.deepEqual(beforeZero, { value: 7, text: '7đ', caret: 1 });

  // Caret before 0 ("|0đ"), paste '2000000' -> "2.000.000đ"
  const pasteBeforeZero = applyCurrencyChange({
    prevText: '0đ',
    nextRaw: '20000000đ',
    rawCaret: 7,
    inputType: 'insertFromPaste',
  });
  assert.deepEqual(pasteBeforeZero, { value: 2_000_000, text: '2.000.000đ', caret: 9 });

  // Caret after 0 ("0|đ"), type '7' -> "7đ", caret after '7'
  const afterZero = applyCurrencyChange({
    prevText: '0đ',
    nextRaw: '07đ',
    rawCaret: 2,
    inputType: 'insertText',
  });
  assert.deepEqual(afterZero, { value: 7, text: '7đ', caret: 1 });

  // Typing "2000000" sequentially from "0đ" with initial caret at 0
  let state = { text: '0đ', caret: 0, value: 0 };
  for (const ch of '2000000') {
    const nextRaw = state.text.slice(0, state.caret) + ch + state.text.slice(state.caret);
    state = applyCurrencyChange({
      prevText: state.text,
      nextRaw,
      rawCaret: state.caret + 1,
      inputType: 'insertText',
    });
  }
  assert.deepEqual(state, { value: 2_000_000, text: '2.000.000đ', caret: 9 });
});

test('applyCurrencyChange preserves caret when inserting digits in the middle', () => {
  // "12.345.678đ" — insert '9' after '3' -> "123.945.678đ", caret right after '9' (index 5)
  const res = applyCurrencyChange({
    prevText: '12.345.678đ',
    nextRaw: '12.3945.678đ',
    rawCaret: 5,
    inputType: 'insertText',
  });
  assert.equal(res.value, 123_945_678);
  assert.equal(res.text, '123.945.678đ');
  assert.equal(res.caret, 5);
  assert.equal(res.text.slice(0, res.caret), '123.9');
});

test('applyCurrencyChange preserves caret when deleting digits in the middle', () => {
  // "123.945.678đ" — delete '9' -> "12.345.678đ", caret right after '3' (index 4)
  const res = applyCurrencyChange({
    prevText: '123.945.678đ',
    nextRaw: '123.45.678đ',
    rawCaret: 4,
    inputType: 'deleteContentBackward',
  });
  assert.equal(res.value, 12_345_678);
  assert.equal(res.text, '12.345.678đ');
  assert.equal(res.caret, 4);
  assert.equal(res.text.slice(0, res.caret), '12.3');
});

test('applyCurrencyChange keeps empty input empty when clearing last digit', () => {
  const res = applyCurrencyChange({
    prevText: '5đ',
    nextRaw: 'đ',
    rawCaret: 0,
    inputType: 'deleteContentBackward',
  });
  assert.equal(res.value, undefined);
  assert.equal(res.text, '');
  assert.equal(res.caret, 0);

  const zeroCleared = applyCurrencyChange({
    prevText: '0đ',
    nextRaw: 'đ',
    rawCaret: 0,
    inputType: 'deleteContentBackward',
  });
  assert.equal(zeroCleared.value, undefined);
  assert.equal(zeroCleared.text, '');
  assert.equal(zeroCleared.caret, 0);
});

test('applyCurrencyChange ignores non-digit keystrokes without corrupting value or caret', () => {
  const res = applyCurrencyChange({
    prevText: '2.000đ',
    nextRaw: '2a.000đ',
    rawCaret: 2,
    inputType: 'insertText',
  });
  assert.equal(res.value, 2_000);
  assert.equal(res.text, '2.000đ');
  assert.equal(res.caret, 1);
});

test('handleCurrencyKeyDown deletes digit before dot on Backspace and after dot on Delete', () => {
  // "12.345.678đ" — caret at index 3 (right after first '.'), Backspace deletes '2' -> "1.345.678đ", caret at 1
  const bsDot = handleCurrencyKeyDown({
    key: 'Backspace',
    text: '12.345.678đ',
    selectionStart: 3,
    selectionEnd: 3,
  });
  assert.deepEqual(bsDot, { value: 1_345_678, text: '1.345.678đ', caret: 1 });

  // "12.345.678đ" — caret at index 2 (right before first '.'), Delete deletes '3' -> "1.245.678đ", caret at 3 ("1.2|45.678đ")
  const delDot = handleCurrencyKeyDown({
    key: 'Delete',
    text: '12.345.678đ',
    selectionStart: 2,
    selectionEnd: 2,
  });
  assert.deepEqual(delDot, { value: 1_245_678, text: '1.245.678đ', caret: 3 });

  // "2.000.000đ" — caret after 'đ' (index 10), Backspace deletes last '0' -> "200.000đ", caret before 'đ'
  const bsSuffix = handleCurrencyKeyDown({
    key: 'Backspace',
    text: '2.000.000đ',
    selectionStart: 10,
    selectionEnd: 10,
  });
  assert.deepEqual(bsSuffix, { value: 200_000, text: '200.000đ', caret: 7 });
});

test('applyCurrencyChange fallback handles deletion of dot or trailing đ when keyDown was bypassed', () => {
  const suffixDeleted = applyCurrencyChange({
    prevText: '2.000.000đ',
    nextRaw: '2.000.000',
    rawCaret: 9,
    inputType: 'deleteContentBackward',
  });
  assert.deepEqual(suffixDeleted, { value: 200_000, text: '200.000đ', caret: 7 });

  const dotDeleted = applyCurrencyChange({
    prevText: '12.345.678đ',
    nextRaw: '12345.678đ',
    rawCaret: 2,
    inputType: 'deleteContentBackward',
  });
  assert.deepEqual(dotDeleted, { value: 1_345_678, text: '1.345.678đ', caret: 1 });
});

test('caret helpers count digits and clamp before suffix', () => {
  assert.equal(countDigitsBefore('2.000.000đ', 5), 4);
  assert.equal(caretFromDigitIndex('2.000.000đ', 4), 5);
  assert.equal(clampCurrencyCaret('2.000.000đ', 10), 9);
  assert.equal(clampCurrencyCaret('2.000.000đ', 3), 3);
});
