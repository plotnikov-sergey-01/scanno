"use client";

import Link from "@/components/LoadingProvider";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/Spinner";
import styles from "./Header.module.css";

export function Header() {
  const { user, loading, logout } = useAuth();

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
            Explore
          </Link>
          <Link href="/search" className={styles.navLink}>
            Search
          </Link>
          {loading ? (
            <Spinner size="sm" />
          ) : user ? (
            <>
              <Link href="/diary" className={styles.navLink}>
                Diary
              </Link>
              <Link href={`/u/${user.username}`} className={styles.navLink}>
                {user.profile?.display_name || user.username}
              </Link>
              <button
                type="button"
                onClick={logout}
                className={styles.logoutButton}
              >
                Log out
              </button>
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
