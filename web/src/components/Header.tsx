"use client";

import Link from "@/components/LoadingProvider";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/Spinner";
import styles from "./Header.module.css";

export function Header() {
  const { user, loading } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link
          href="/"
          className={styles.brand}
        >
          Scanno
          <span className={styles.brandDot} />
        </Link>
        <nav className={styles.nav}>
          <Link href="/explore" className={styles.navLink}>
            <NavIcon kind="explore" />
            Explore
          </Link>
          <Link href="/search" className={styles.navLink}>
            <NavIcon kind="search" />
            Search
          </Link>
          {loading ? (
            <Spinner size="sm" />
          ) : user ? (
            <>
              <Link href="/diary" className={styles.navLink}>
                <NavIcon kind="diary" />
                Diary
              </Link>
              <Link href={`/u/${user.username}`} className={styles.profileLink}>
                <span className={styles.profileAvatar}>
                  {user.profile?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.profile.avatar} alt="" />
                  ) : (
                    (user.profile?.display_name || user.username).slice(0, 1).toUpperCase()
                  )}
                </span>
                {user.profile?.display_name || user.username}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.navLink}>
                Log in
              </Link>
              <Link
                href="/register"
                className={styles.signupLink}
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

function NavIcon({ kind }: { kind: "explore" | "search" | "diary" }) {
  if (kind === "explore") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.navIcon}>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.2 8.8-1.8 4.6-4.6 1.8 1.8-4.6 4.6-1.8Z" />
      </svg>
    );
  }

  if (kind === "search") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.navIcon}>
        <circle cx="11" cy="11" r="7" />
        <path d="m16.5 16.5 4 4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.navIcon}>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5v-16Z" />
      <path d="M5 5.5A2.5 2.5 0 0 0 2.5 3H2v16h.5A2.5 2.5 0 0 1 5 21.5" />
    </svg>
  );
}
