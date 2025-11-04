'use client';

import * as React from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';

export interface SearchDropdownOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  group?: string;
}

export interface SearchDropdownProps {
  options: SearchDropdownOption[];
  value?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
  allowClear?: boolean;
  showSearch?: boolean;
  groupBy?: boolean;
}

export const SearchDropdown = React.forwardRef<HTMLDivElement, SearchDropdownProps>(
  ({ 
    options, 
    value, 
    placeholder = "Select an option", 
    searchPlaceholder = "Search...",
    disabled = false, 
    className, 
    onValueChange,
    allowClear = false,
    showSearch = true,
    groupBy = false
  }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedValue, setSelectedValue] = React.useState(value || '');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [focusedIndex, setFocusedIndex] = React.useState(-1);

    const selectedOption = options.find(option => option.value === selectedValue);

    // Filter options based on search term
    const filteredOptions = React.useMemo(() => {
      if (!searchTerm) return options;
      return options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }, [options, searchTerm]);

    // Group options if groupBy is enabled
    const groupedOptions = React.useMemo(() => {
      if (!groupBy) return { '': filteredOptions };
      
      return filteredOptions.reduce((groups, option) => {
        const group = option.group || 'Other';
        if (!groups[group]) groups[group] = [];
        groups[group].push(option);
        return groups;
      }, {} as Record<string, SearchDropdownOption[]>);
    }, [filteredOptions, groupBy]);

    const handleSelect = (optionValue: string) => {
      if (disabled) return;
      setSelectedValue(optionValue);
      onValueChange?.(optionValue);
      setIsOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedValue('');
      onValueChange?.('');
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (disabled) return;
      
      const flatOptions = Object.values(groupedOptions).flat();
      
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          if (isOpen && focusedIndex >= 0 && flatOptions[focusedIndex]) {
            handleSelect(flatOptions[focusedIndex].value);
          } else {
            setIsOpen(!isOpen);
          }
          break;
        case ' ':
          event.preventDefault();
          setIsOpen(!isOpen);
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setFocusedIndex(prev => Math.min(prev + 1, flatOptions.length - 1));
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setFocusedIndex(prev => Math.max(prev - 1, 0));
          }
          break;
      }
    };

    React.useEffect(() => {
      setSelectedValue(value || '');
    }, [value]);

    React.useEffect(() => {
      if (isOpen) {
        setFocusedIndex(-1);
      }
    }, [searchTerm, isOpen]);

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
          <div className="flex items-center flex-1 min-w-0">
            {selectedOption && (
              <div className="flex flex-col">
                <span className="truncate font-medium">{selectedOption.label}</span>
                {selectedOption.description && (
                  <span className="text-xs text-muted-foreground truncate">
                    {selectedOption.description}
                  </span>
                )}
              </div>
            )}
            {!selectedOption && (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {allowClear && selectedValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-accent rounded-sm"
                aria-label="Clear selection"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 opacity-50 transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
              {showSearch && (
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                      autoFocus
                    />
                  </div>
                </div>
              )}
              
              <div className="max-h-60 overflow-auto py-1">
                {Object.keys(groupedOptions).length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                    No options found
                  </div>
                ) : (
                  Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                    <div key={groupName}>
                      {groupBy && groupName && (
                        <div className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted/50">
                          {groupName}
                        </div>
                      )}
                      <ul role="listbox">
                        {groupOptions.map((option, index) => {
                          const flatIndex = Object.values(groupedOptions)
                            .flat()
                            .findIndex(opt => opt.value === option.value);
                          
                          return (
                            <li
                              key={option.value}
                              role="option"
                              className={cn(
                                "relative flex items-start px-3 py-2 text-sm cursor-pointer",
                                "hover:bg-accent hover:text-accent-foreground",
                                "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                                option.disabled && "opacity-50 cursor-not-allowed",
                                selectedValue === option.value && "bg-accent text-accent-foreground",
                                focusedIndex === flatIndex && "bg-accent text-accent-foreground"
                              )}
                              onClick={() => !option.disabled && handleSelect(option.value)}
                              aria-selected={selectedValue === option.value}
                              aria-disabled={option.disabled}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{option.label}</div>
                                {option.description && (
                                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                                    {option.description}
                                  </div>
                                )}
                              </div>
                              {selectedValue === option.value && (
                                <Check className="h-4 w-4 ml-2 flex-shrink-0" />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
);

SearchDropdown.displayName = 'SearchDropdown';
