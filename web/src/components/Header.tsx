"use client";

import Link from "@/components/LoadingProvider";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/Spinner";

export function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-ink-50/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="inline-flex shrink-0 items-start gap-1 whitespace-nowrap font-display text-2xl font-bold tracking-tight text-ink-900"
        >
          Scanno
          <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-scan-500" />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-ink-700">
          <Link href="/explore" className="hover:text-scan-600">
            Explore
          </Link>
          <Link href="/search" className="hover:text-scan-600">
            Search
          </Link>
          {loading ? (
            <Spinner size="sm" />
          ) : user ? (
            <>
              <Link href="/diary" className="hover:text-scan-600">
                Diary
              </Link>
              <Link href={`/u/${user.username}`} className="hover:text-scan-600">
                {user.profile?.display_name || user.username}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-md px-2 py-1 text-verdict-never hover:bg-verdict-never/10"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-scan-600">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-scan-500 px-3 py-1.5 text-white shadow-sm hover:bg-scan-600"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
