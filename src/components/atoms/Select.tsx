import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

const Select = ({
  options,
  value,
  onChange,
  multiple = false,
  placeholder,
  error,
  disabled = false,
}: SelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tính toán vị trí dropdown dựa trên trigger box
  const updateDropdownPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 240; // max-h ước tính

    // Mở lên trên nếu không đủ chỗ bên dưới
    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      setDropdownStyle({
        position: 'fixed',
        top: rect.top - dropdownHeight - 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    } else {
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  };

  useEffect(() => {
    if (open) {
      updateDropdownPosition();
      // Focus thủ công sau khi DOM đã render xong
      // Dùng setTimeout để tránh iOS Safari scroll đến vị trí portal trong DOM
      setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 50);
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    const handleScroll = () => {
      if (open) updateDropdownPosition();
    };
    document.addEventListener('mousedown', handleClickOutside);
    // iOS Safari dùng touchstart thay vì mousedown
    document.addEventListener('touchstart', handleClickOutside as EventListener);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  const selectedValues: string[] = multiple ? (Array.isArray(value) ? value : []) : [];

  const singleValue = !multiple ? (typeof value === 'string' ? value : '') : '';

  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (optValue: string) => {
    if (multiple) {
      const next = selectedValues.includes(optValue)
        ? selectedValues.filter((v) => v !== optValue)
        : [...selectedValues, optValue];
      onChange?.(next);
    } else {
      onChange?.(optValue);
      setOpen(false);
      setSearch('');
    }
  };

  const removeTag = (optValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(selectedValues.filter((v) => v !== optValue));
  };

  const selectedOptions = multiple ? options.filter((o) => selectedValues.includes(o.value)) : [];

  const singleLabel = !multiple ? options.find((o) => o.value === singleValue)?.label : undefined;

  const dropdown = open && (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-gray-200 rounded-md shadow-lg"
    >
      {/* Search */}
      <div className="p-2 border-b border-gray-100">
        <input
          ref={searchInputRef}
          type="text"
          className="input py-1 text-normal"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Options list */}
      <ul className="max-h-52 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-sm text-gray-400">Không có kết quả</li>
        )}
        {filtered.map((opt) => {
          const isSelected = multiple
            ? selectedValues.includes(opt.value)
            : singleValue === opt.value;
          return (
            <li
              key={opt.value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(opt.value)}
              className={[
                'px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-gray-50',
                isSelected ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700',
              ].join(' ')}
            >
              <span>{opt.label}</span>
              {isSelected && (
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger box */}
      <div
        onClick={() => !disabled && setOpen((o) => !o)}
        className={[
          'input flex items-center gap-1.5 flex-wrap min-h-[38px] cursor-pointer select-none',
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '',
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {multiple ? (
          <>
            {selectedOptions.length === 0 ? (
              <span className="text-gray-400 text-sm flex-1">{placeholder ?? 'Chọn...'}</span>
            ) : (
              selectedOptions.map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 rounded px-2 py-0.5 text-xs font-medium"
                >
                  {opt.label}
                  <button
                    type="button"
                    onClick={(e) => removeTag(opt.value, e)}
                    className="hover:text-primary-600 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </>
        ) : (
          <span className={`flex-1 text-sm ${!singleLabel ? 'text-gray-400' : 'text-gray-900'}`}>
            {singleLabel ?? placeholder ?? 'Chọn...'}
          </span>
        )}

        {/* Chevron */}
        <svg
          className={`ml-auto shrink-0 w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown rendered via Portal — không ảnh hưởng layout modal */}
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Select;
