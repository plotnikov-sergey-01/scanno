"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className = "", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`w-full rounded-lg border border-ink-100 bg-white py-3 pl-4 pr-12 ${className}`.trim()}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-700/60 hover:bg-ink-100 hover:text-ink-900"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.5 5.4A9.4 9.4 0 0 1 12 5c5 0 8.5 4.5 9.6 6.4a1.2 1.2 0 0 1 0 1.2 17.8 17.8 0 0 1-2.8 3.5" />
            <path d="M6.6 6.7a18.6 18.6 0 0 0-4.2 4.7 1.2 1.2 0 0 0 0 1.2C3.5 14.5 7 19 12 19a9.7 9.7 0 0 0 4.1-.9" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M2.4 11.4C3.5 9.5 7 5 12 5s8.5 4.5 9.6 6.4a1.2 1.2 0 0 1 0 1.2C20.5 14.5 17 19 12 19s-8.5-4.5-9.6-6.4a1.2 1.2 0 0 1 0-1.2Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
