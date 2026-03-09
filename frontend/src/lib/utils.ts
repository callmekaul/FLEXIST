import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns local datetime as ISO-like string without timezone suffix (e.g. "2026-03-08T15:30:00") */
export function localISOString(date?: Date): string {
  const d = date ?? new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Converts an ISO-like string to a value suitable for <input type="datetime-local"> (includes seconds) */
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  return localISOString(d);
}
