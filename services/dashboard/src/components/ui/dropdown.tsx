'use client';

import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
}

export const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
  ({ options, value, placeholder = "Select an option", disabled = false, className, onValueChange }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedValue, setSelectedValue] = React.useState(value || '');

    const selectedOption = options.find(option => option.value === selectedValue);

    const handleSelect = (optionValue: string) => {
      if (disabled) return;
      setSelectedValue(optionValue);
      onValueChange?.(optionValue);
      setIsOpen(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (disabled) return;
      
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          setIsOpen(!isOpen);
          break;
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            const currentIndex = options.findIndex(opt => opt.value === selectedValue);
            const nextIndex = Math.min(currentIndex + 1, options.length - 1);
            if (options[nextIndex] && !options[nextIndex].disabled) {
              setSelectedValue(options[nextIndex].value);
            }
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            const currentIndex = options.findIndex(opt => opt.value === selectedValue);
            const prevIndex = Math.max(currentIndex - 1, 0);
            if (options[prevIndex] && !options[prevIndex].disabled) {
              setSelectedValue(options[prevIndex].value);
            }
          }
          break;
      }
    };

    React.useEffect(() => {
      setSelectedValue(value || '');
    }, [value]);

    return (
      <div ref={ref} className={cn("relative", className)}>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 text-sm border border-input bg-background rounded-md shadow-sm",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isOpen && "ring-2 ring-ring ring-offset-2"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className={cn(
            "truncate",
            !selectedOption && "text-muted-foreground"
          )}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 opacity-50 transition-transform",
            isOpen && "rotate-180"
          )} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
              <ul
                role="listbox"
                className="max-h-60 overflow-auto py-1"
              >
                {options.map((option) => (
                  <li
                    key={option.value}
                    role="option"
                    className={cn(
                      "relative flex items-center px-3 py-2 text-sm cursor-pointer",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                      option.disabled && "opacity-50 cursor-not-allowed",
                      selectedValue === option.value && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    aria-selected={selectedValue === option.value}
                    aria-disabled={option.disabled}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {selectedValue === option.value && (
                      <Check className="h-4 w-4 ml-2" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';

// Multi-select dropdown variant
export interface MultiSelectDropdownProps {
  options: DropdownOption[];
  values?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onValuesChange?: (values: string[]) => void;
  maxDisplayed?: number;
}

export const MultiSelectDropdown = React.forwardRef<HTMLDivElement, MultiSelectDropdownProps>(
  ({ options, values = [], placeholder = "Select options", disabled = false, className, onValuesChange, maxDisplayed = 2 }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedValues, setSelectedValues] = React.useState<string[]>(values);

    const selectedOptions = options.filter(option => selectedValues.includes(option.value));

    const handleToggle = (optionValue: string) => {
      if (disabled) return;
      
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      
      setSelectedValues(newValues);
      onValuesChange?.(newValues);
    };

    const getDisplayText = () => {
      if (selectedOptions.length === 0) return placeholder;
      if (selectedOptions.length <= maxDisplayed) {
        return selectedOptions.map(opt => opt.label).join(', ');
      }
      return `${selectedOptions.slice(0, maxDisplayed).map(opt => opt.label).join(', ')} +${selectedOptions.length - maxDisplayed} more`;
    };

    React.useEffect(() => {
      setSelectedValues(values);
    }, [values]);

    return (
      <div ref={ref} className={cn("relative", className)}>
        <button
          type="button"
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 text-sm border border-input bg-background rounded-md shadow-sm",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isOpen && "ring-2 ring-ring ring-offset-2"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className={cn(
            "truncate text-left",
            selectedOptions.length === 0 && "text-muted-foreground"
          )}>
            {getDisplayText()}
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 opacity-50 transition-transform",
            isOpen && "rotate-180"
          )} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
              <ul
                role="listbox"
                className="max-h-60 overflow-auto py-1"
              >
                {options.map((option) => (
                  <li
                    key={option.value}
                    role="option"
                    className={cn(
                      "relative flex items-center px-3 py-2 text-sm cursor-pointer",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                      option.disabled && "opacity-50 cursor-not-allowed",
                      selectedValues.includes(option.value) && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => !option.disabled && handleToggle(option.value)}
                    aria-selected={selectedValues.includes(option.value)}
                    aria-disabled={option.disabled}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {selectedValues.includes(option.value) && (
                      <Check className="h-4 w-4 ml-2" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    );
  }
);

MultiSelectDropdown.displayName = 'MultiSelectDropdown';
