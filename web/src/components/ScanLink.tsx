"use client";

import type { ReactNode } from "react";
import Link, { useLoadingRouter } from "@/components/LoadingProvider";

export function ScanLink({ children, className }: { children: ReactNode; className?: string }) {
  const router = useLoadingRouter();
  return (
    <Link href="/search" className={className} onNavigate={(event) => {
      event.preventDefault();
      router.push(window.matchMedia("(max-width: 1023px)").matches ? "/search?scan=1" : "/search");
    }}>
      {children}
    </Link>
  );
}
