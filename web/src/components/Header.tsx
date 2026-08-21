"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-ink-50/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight text-ink-900">
          Scanno
          <span className="ml-1 inline-block h-2 w-2 rounded-full bg-scan-500 align-super" />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-ink-700">
          <Link href="/explore" className="hover:text-scan-600">
            Explore
          </Link>
          <Link href="/search" className="hover:text-scan-600">
            Search
          </Link>
          {user ? (
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
                className="rounded-md px-2 py-1 text-ink-700 hover:bg-ink-100"
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
