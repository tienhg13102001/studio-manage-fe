/** Mask free text to DD/MM/YYYY: digits only, '/' auto-inserted, max 10 chars.
 *  A trailing '/' is only appended while typing forward so backspace stays natural. */
export function maskDateInput(raw: string, prev = ''): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += '/' + digits.slice(2, 4);
  if (digits.length > 4) out += '/' + digits.slice(4);
  const typingForward = raw.length > prev.length;
  if (typingForward && (digits.length === 2 || digits.length === 4)) out += '/';
  return out;
}

/** Parse a complete DD/MM/YYYY string into a real calendar date (rejects 31/02 etc). */
export function parseDisplayDate(text: string): Date | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return undefined;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (year < 1000) return undefined;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return undefined;
  }
  return d;
}
