import * as React from 'react';
import { Input, type InputProps } from '@/components/ui/input';
import { useCurrencyInput } from '@/hooks/useCurrencyInput';
import { cn } from '@/lib/utils';

export interface CurrencyInputProps extends Omit<
  InputProps,
  'type' | 'value' | 'defaultValue' | 'onChange'
> {
  value: number | '' | null | undefined;
  onValueChange: (value: number | undefined) => void;
  suffix?: string;
  maxDigits?: number;
  /** Treat `0` as empty display string (useful when state uses `0` as blank sentinel). */
  zeroAsEmpty?: boolean;
}

/**
 * Shared VND currency input displaying formatted values like `2.000.000đ`
 * while emitting integer `number | undefined` values for forms and APIs.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onValueChange,
      suffix = 'đ',
      maxDigits = 13,
      zeroAsEmpty = false,
      className,
      inputMode = 'numeric',
      autoComplete = 'off',
      onBeforeInput,
      onFocus,
      onKeyDown,
      onKeyUp,
      onMouseUp,
      onPaste,
      onSelect,
      ...props
    },
    forwardedRef,
  ) => {
    const {
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
    } = useCurrencyInput({
      value,
      onValueChange,
      suffix,
      maxDigits,
      zeroAsEmpty,
    });

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef, inputRef],
    );

    return (
      <Input
        ref={setRefs}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={displayValue}
        onBeforeInput={(e) => {
          handleBeforeInput(e);
          onBeforeInput?.(e);
        }}
        onChange={handleChange}
        onFocus={(e) => {
          handleFocus(e);
          onFocus?.(e);
        }}
        onKeyDown={(e) => {
          handleKeyDown(e);
          onKeyDown?.(e);
        }}
        onKeyUp={(e) => {
          handleKeyUp(e);
          onKeyUp?.(e);
        }}
        onMouseUp={(e) => {
          handleMouseUp(e);
          onMouseUp?.(e);
        }}
        onPaste={(e) => {
          handlePaste(e);
          onPaste?.(e);
        }}
        onSelect={(e) => {
          handleSelect(e);
          onSelect?.(e);
        }}
        className={cn('tabular', className)}
        {...props}
      />
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
