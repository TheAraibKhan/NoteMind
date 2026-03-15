import { useState, useCallback, useEffect } from 'react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: AxiosError | null;
}

export function useAsync<T>(asyncFunction: () => Promise<any>) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await asyncFunction();
      setState({ data: response.data, loading: false, error: null });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      setState({ data: null, loading: false, error: axiosError });
      toast.error(axiosError.message);
      throw error;
    }
  }, [asyncFunction]);

  return { ...state, execute };
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage?.getItem(key) : null;
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      typeof window !== 'undefined' &&
        window.localStorage?.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
