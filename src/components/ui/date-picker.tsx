import * as React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { maskDateInput, parseDisplayDate } from '@/lib/date-input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const DISPLAY_FORMAT = 'dd/MM/yyyy';

export function DatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const d = parseISO(value);
    return isValid(d) ? d : undefined;
  }, [value]);

  const formatted = selected ? format(selected, DISPLAY_FORMAT) : '';
  const [text, setText] = React.useState(formatted);
  const [month, setMonth] = React.useState<Date>(() => selected ?? new Date());

  // Sync text + calendar month when the external value changes.
  React.useEffect(() => {
    setText(formatted);
    if (selected) setMonth(selected);
  }, [formatted, selected]);

  const openPopover = () => {
    if (disabled || open) return;
    setMonth(parseDisplayDate(text) ?? selected ?? new Date());
    setOpen(true);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = maskDateInput(e.target.value, text);
    setText(next);
    if (!open) setOpen(true);
    if (next === '') {
      if (value) onChange(undefined);
      return;
    }
    const d = parseDisplayDate(next);
    if (d) {
      setMonth(d);
      const iso = format(d, 'yyyy-MM-dd');
      if (iso !== value) onChange(iso);
    }
  };

  const handleSelect = (day: Date | undefined) => {
    onChange(day ? format(day, 'yyyy-MM-dd') : undefined);
    setText(day ? format(day, DISPLAY_FORMAT) : '');
    setOpen(false);
  };

  const clear = () => {
    onChange(undefined);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // only swallow Enter while the calendar is open; otherwise let forms submit
      if (open) e.preventDefault();
      if (!parseDisplayDate(text)) setText(formatted);
      setOpen(false);
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
      }
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      openPopover();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          ref={wrapperRef}
          aria-disabled={disabled || undefined}
          className={cn(
            // base
            'group relative flex w-full items-center h-9 px-3 rounded-md text-sm',
            'border border-input bg-background',
            'transition-all duration-200',
            // hover
            !disabled && 'hover:border-primary/50 hover:bg-primary/5',
            // focus / open
            (open || focused) && [
              'border-primary/70',
              '[box-shadow:0_0_0_3px_hsl(38_92%_50%/0.18)]',
            ],
            // disabled
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          {/* icon left: toggles the calendar */}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            aria-label="Mở lịch"
            onClick={() => {
              if (open) {
                setOpen(false);
              } else {
                openPopover();
                inputRef.current?.focus();
              }
            }}
            className="mr-2 shrink-0 disabled:cursor-not-allowed"
          >
            <CalendarIcon
              className={cn(
                'h-4 w-4 transition-colors duration-200',
                open || focused
                  ? 'text-primary'
                  : 'text-muted-foreground group-hover:text-primary/70',
              )}
            />
          </button>

          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            disabled={disabled}
            value={text}
            placeholder={focused && !text ? 'DD/MM/YYYY' : placeholder}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onClick={openPopover}
            onFocus={() => {
              setFocused(true);
              openPopover();
            }}
            onBlur={() => {
              setFocused(false);
              if (text && !parseDisplayDate(text)) setText(formatted);
            }}
            className={cn(
              'h-full min-w-0 flex-1 truncate bg-transparent text-left outline-none',
              'font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground',
              'disabled:cursor-not-allowed',
            )}
          />

          {/* clear button */}
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Xoá ngày"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                clear();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  clear();
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
        // keep focus in the input while typing
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        // clicks/focus on the input itself must not dismiss the popover
        onInteractOutside={(e) => {
          if (wrapperRef.current?.contains(e.target as Node)) e.preventDefault();
        }}
      >
        {/* header accent bar */}
        <div className="h-1 w-full [background:linear-gradient(90deg,#f59e0b,#22d3ee)]" />
        <Calendar
          mode="single"
          locale={vi}
          selected={selected}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}
