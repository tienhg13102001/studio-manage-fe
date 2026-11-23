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
    });
    assert.equal(res.value, 2_000_000);
    assert.equal(res.text, '2.000.000đ');
    assert.equal(res.caret, '2.000.000'.length);
  }
});

test('applyCurrencyChange preserves caret when inserting digits in the middle', () => {
  // "12.345.678đ" — insert '9' after '3' -> "123.945.678đ", caret right after '9' (index 5)
  const res = applyCurrencyChange({
    prevText: '12.345.678đ',
    nextRaw: '12.3945.678đ',
    rawCaret: 5,
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
  });
  assert.equal(res.value, undefined);
  assert.equal(res.text, '');
  assert.equal(res.caret, 0);

  const zeroCleared = applyCurrencyChange({
    prevText: '0đ',
    nextRaw: 'đ',
    rawCaret: 0,
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
  });
  assert.deepEqual(suffixDeleted, { value: 200_000, text: '200.000đ', caret: 7 });

  const dotDeleted = applyCurrencyChange({
    prevText: '12.345.678đ',
    nextRaw: '12345.678đ',
    rawCaret: 2,
  });
  assert.deepEqual(dotDeleted, { value: 1_345_678, text: '1.345.678đ', caret: 1 });
});

test('caret helpers count digits and clamp before suffix', () => {
  assert.equal(countDigitsBefore('2.000.000đ', 5), 4);
  assert.equal(caretFromDigitIndex('2.000.000đ', 4), 5);
  assert.equal(clampCurrencyCaret('2.000.000đ', 10), 9);
  assert.equal(clampCurrencyCaret('2.000.000đ', 3), 3);
});
