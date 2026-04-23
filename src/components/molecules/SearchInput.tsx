import { useRef } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

/**
 * Molecule: text input + search button + optional clear button.
 * Triggers onSearch on Enter key or button click.
 */
const SearchInput = ({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = 'Tìm kiếm…',
  className = '',
}: SearchInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      <div className="relative flex-1 min-w-[12rem]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
          <FiSearch className="text-base" />
        </span>
        <input
          ref={inputRef}
          className="input pl-8 pr-8"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs leading-none"
            aria-label="Xoá tìm kiếm"
          >
            <FiX className="text-sm" />
          </button>
        )}
      </div>
      <button type="button" className="btn-secondary" onClick={onSearch}>
        Tìm
      </button>
    </div>
  );
};

export default SearchInput;
