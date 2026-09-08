"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";

const LoadingContext = createContext({
  register: (): (() => void) => () => {},
  navigate: (_href: string, _replace?: boolean, _scroll?: boolean) => {},
});

export function LoadingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [requests, setRequests] = useState(0);
  const register = useCallback(() => {
    setRequests((count) => count + 1);
    return () => setRequests((count) => count - 1);
  }, []);
  const navigate = useCallback((href: string, replace = false, scroll = true) => {
    startTransition(() => {
      if (replace) router.replace(href, { scroll });
      else router.push(href, { scroll });
    });
  }, [router]);
  const busy = pending || requests > 0;

  return (
    <LoadingContext.Provider value={{ register, navigate }}>
      <div inert={busy} aria-busy={busy}>{children}</div>
      {busy && (
        <div className="scanno-loading-overlay" role="status" aria-label="Loading">
          <span className="scanno-loader" aria-hidden="true" />
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function LoadingIndicator() {
  const { register } = useContext(LoadingContext);
  useEffect(() => register(), [register]);
  return null;
}

export function useLoadingRouter() {
  const router = useRouter();
  const { navigate } = useContext(LoadingContext);
  return { ...router, push: (href: string) => navigate(href), replace: (href: string) => navigate(href, true) };
}

export default function Link({ onNavigate, ...props }: ComponentProps<typeof NextLink>) {
  const { navigate } = useContext(LoadingContext);
  return <NextLink {...props} onNavigate={(event) => {
    onNavigate?.(event);
    if (typeof props.href !== "string" || onNavigate) return;
    const target = new URL(props.href, window.location.href);
    if (target.pathname === window.location.pathname && target.search === window.location.search) return;
    event.preventDefault();
    navigate(props.href, props.replace, props.scroll);
  }} />;
}
