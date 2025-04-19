import React, { useState } from 'react';

interface AutocompleteProps {
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({ suggestions, value, onChange, placeholder }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredSuggestions = value
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
    : suggestions;

  return (
    <div className="relative">
      <input
        type="text"
        className="input input-bordered w-full bg-white text-zinc-900 border border-input focus:ring-2 focus:ring-primary/50 rounded-md shadow dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 placeholder:text-zinc-400 dark:placeholder:text-zinc-400"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
        placeholder={placeholder}
        dir="rtl"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded shadow-md max-h-48 overflow-auto mt-1 rtl:right-0 rtl:left-auto">
          {filteredSuggestions.slice(0, 8).map((s, i) => (
            <li
              key={s}
              className={`px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 ${i === highlightedIndex ? 'bg-blue-100 dark:bg-blue-900' : ''} text-zinc-900 dark:text-zinc-100`}
              onMouseDown={() => {
                onChange(s);
                setShowSuggestions(false);
              }}
              onMouseEnter={() => setHighlightedIndex(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
