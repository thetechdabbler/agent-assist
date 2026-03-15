'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_PREFIX = 'form_draft:';

function storageKey(formRequestId: string): string {
  return `${STORAGE_PREFIX}${formRequestId}`;
}

export function useFormDraft<T extends Record<string, unknown>>(
  formRequestId: string,
  initialValues: T,
): [T, (values: T) => void, () => void] {
  const [values, setValues] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValues;
    try {
      const raw = sessionStorage.getItem(storageKey(formRequestId));
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        return { ...initialValues, ...parsed };
      }
    } catch {
      // ignore
    }
    return initialValues;
  });

  const setDraft = useCallback(
    (next: T) => {
      setValues(next);
      if (typeof window === 'undefined') return;
      try {
        sessionStorage.setItem(storageKey(formRequestId), JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [formRequestId],
  );

  const clearDraft = useCallback(() => {
    setValues(initialValues);
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(storageKey(formRequestId));
    } catch {
      // ignore
    }
  }, [formRequestId, initialValues]);

  useEffect(() => {
    setValues((prev) => ({ ...initialValues, ...prev }));
  }, [formRequestId]);

  return [values, setDraft, clearDraft];
}
