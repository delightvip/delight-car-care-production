
import { useState, useEffect } from 'react';

/**
 * A hook that returns a debounced value that changes after the specified delay
 * This is useful for preventing excessive function calls when a value changes rapidly
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds before the value should update
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up by clearing the timeout if the value changes again before the delay
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
