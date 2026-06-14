import * as React from 'react';
import { Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';

interface TimePickerProps {
  value?: string; // "HH:mm"
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minuteStep?: number; // bước phút, mặc định 1 (đủ 00–59)
}

const pad = (n: number) => String(n).padStart(2, '0');

// Chuẩn hoá text người dùng gõ về "HH:mm" hợp lệ (kẹp 0–23 giờ, 0–59 phút).
// Hỗ trợ: "8" → 08:00, "830" → 08:30, "0830" → 08:30, "8:5" → 08:05.
function normalizeTime(raw: string): string | undefined {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return undefined;
  let h: number;
  let m: number;
  if (raw.includes(':')) {
    const [hp, mp] = raw.split(':');
    h = Number(hp || '0');
    m = Number(mp || '0');
  } else if (digits.length <= 2) {
    h = Number(digits);
    m = 0;
  } else {
    h = Number(digits.slice(0, digits.length - 2));
    m = Number(digits.slice(-2));
  }
  if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
  h = Math.min(23, Math.max(0, h));
  m = Math.min(59, Math.max(0, m));
  return `${pad(h)}:${pad(m)}`;
}

// Parse text đang gõ dở để biết giờ/phút "tạm" → cho cột tự cuộn theo ngay khi gõ.
function parsePartial(raw: string): { h?: number; m?: number } {
  if (!raw) return {};
  let h: number | undefined;
  let m: number | undefined;
  if (raw.includes(':')) {
    const [hp, mp] = raw.split(':');
    if (hp !== '') {
      const n = Number(hp);
      if (!Number.isNaN(n) && n <= 23) h = n;
    }
    if (mp) {
      const n = Number(mp);
      if (!Number.isNaN(n) && n <= 59) m = n;
    }
  } else {
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 2) {
      const n = Number(digits);
      if (!Number.isNaN(n) && n <= 23) h = n;
    } else {
      const hn = Number(digits.slice(0, digits.length - 2));
      const mn = Number(digits.slice(-2));
      if (!Number.isNaN(hn) && hn <= 23) h = hn;
      if (!Number.isNaN(mn) && mn <= 59) m = mn;
    }
  }
  return { h, m };
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Chọn giờ',
  disabled,
  className,
  minuteStep = 1,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);

  // Text hiển thị trong ô — đồng bộ từ value khi không đang gõ.
  const [text, setText] = React.useState(value ?? '');
  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) setText(value ?? '');
  }, [value]);

  const [hour, minute] = React.useMemo(() => {
    if (!value) return [undefined, undefined] as const;
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(value);
    if (!m) return [undefined, undefined] as const;
    return [Number(m[1]), Number(m[2])] as const;
  }, [value]);

  const hours = React.useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = React.useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep],
  );

  // Giờ/phút "tạm" theo text đang gõ → cột cuộn & highlight theo ngay cả khi gõ dở.
  const preview = React.useMemo(() => parsePartial(text), [text]);
  const displayHour = preview.h ?? hour;
  const displayMinute = preview.m ?? minute;

  const commit = (h: number | undefined, mnt: number | undefined) => {
    const hh = h ?? hour ?? 0;
    const mm = mnt ?? minute ?? 0;
    onChange(`${pad(hh)}:${pad(mm)}`);
  };

  // Người dùng gõ: lấy tối đa 4 chữ số, 2 số CUỐI là phút, phần còn lại là giờ.
  // "8"→"8", "800"→"8:00", "1730"→"17:30" (không lấy nhầm 2 số đầu làm giờ).
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    const v = digits.length <= 2 ? digits : `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
    setText(v);
    // Commit ngay khi gõ đủ dạng hợp lệ HH:mm để cột bên dưới cũng cập nhật.
    if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(v)) onChange(normalizeTime(v));
  };

  // Khi rời ô / Enter: chuẩn hoá lại text về giá trị hợp lệ (hoặc xoá nếu rỗng).
  const commitText = () => {
    const norm = normalizeTime(text);
    if (norm) {
      onChange(norm);
      setText(norm);
    } else {
      onChange(undefined);
      setText('');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          ref={anchorRef}
          className={cn(
            'group relative flex w-full items-center h-9 px-3 rounded-md text-base md:text-sm',
            'border border-input bg-background transition-all duration-200',
            'hover:border-primary/50',
            'focus-within:border-primary/70 focus-within:[box-shadow:0_0_0_3px_hsl(38_92%_50%/0.18)]',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          <Clock
            className={cn(
              'mr-2 h-4 w-4 shrink-0 transition-colors duration-200',
              open ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70',
            )}
          />
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            value={text}
            placeholder={placeholder}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitText();
                setOpen(false);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            className={cn(
              'flex-1 min-w-0 bg-transparent outline-none text-left',
              'placeholder:text-muted-foreground',
              value ? 'font-medium text-foreground' : 'text-foreground',
            )}
          />
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Xoá giờ"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onChange(undefined);
                setText('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onChange(undefined);
                  setText('');
                }
              }}
              className="ml-1 h-5 w-5 shrink-0 rounded flex items-center justify-center
                         text-muted-foreground hover:text-destructive hover:bg-destructive/10
                         transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
        className={cn(
          'w-auto p-0 rounded-xl overflow-hidden',
          'border border-border/60',
          'shadow-xl shadow-black/10 dark:shadow-black/40',
        )}
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()} // giữ focus ở ô input để gõ tiếp
        onInteractOutside={(e) => {
          // Click trên chính ô input không tính là "ra ngoài" → tránh đóng/mở nháy 2 lần
          if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
        }}
      >
        <div className="h-1 w-full [background:linear-gradient(90deg,#f59e0b,#22d3ee)]" />
        <div className="flex">
          <TimeColumn
            label="Giờ"
            items={hours}
            value={displayHour}
            onSelect={(h) => commit(h, undefined)}
          />
          <div className="w-px bg-border/60" />
          <TimeColumn
            label="Phút"
            items={minutes}
            value={displayMinute}
            onSelect={(m) => commit(undefined, m)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface TimeColumnProps {
  label: string;
  items: number[];
  value: number | undefined; // giá trị muốn cuộn tới & highlight (có thể lệch bước)
  onSelect: (n: number) => void;
}

function TimeColumn({ label, items, value, onSelect }: TimeColumnProps) {
  const listRef = React.useRef<HTMLDivElement>(null);

  // Popover bị portal ra ngoài Dialog → react-remove-scroll của Modal chặn wheel.
  // Gắn listener wheel non-passive để tự cuộn, bypass khoá đó (cả ngoài modal vẫn ok).
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollHeight <= el.clientHeight) return; // không cuộn được thì bỏ qua
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Tự cuộn tới item gần value nhất mỗi khi value đổi (gõ tay hoặc mở popover).
  React.useEffect(() => {
    const el = listRef.current;
    if (!el || value == null || items.length === 0) return;
    const nearest = items.reduce((p, c) => (Math.abs(c - value) < Math.abs(p - value) ? c : p), items[0]);
    const node = el.querySelector<HTMLElement>(`[data-value="${nearest}"]`);
    if (node) el.scrollTop = node.offsetTop - el.clientHeight / 2 + node.clientHeight / 2;
  }, [value, items]);

  return (
    <div className="flex flex-col">
      <div className="px-3 py-1.5 text-center text-xs font-semibold text-muted-foreground border-b border-border/60">
        {label}
      </div>
      <div
        ref={listRef}
        className="relative h-48 w-16 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((n) => {
          const isSel = value === n;
          return (
            <button
              key={n}
              data-value={n}
              type="button"
              onClick={() => onSelect(n)}
              className={cn(
                'w-full px-2 py-1.5 text-center text-sm rounded-md transition-colors',
                isSel
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-foreground hover:bg-primary/10',
              )}
            >
              {pad(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
