import { useState } from "react";

export function useFormState<T extends Record<string, unknown>>(initial: T) {
  const [data, setData] = useState<T>(initial);

  const updateField = <K extends keyof T>(key: K, value: T[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => setData(initial);

  return { data, updateField, reset, setData };
}
