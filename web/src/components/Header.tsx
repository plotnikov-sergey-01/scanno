"use client";

import Link from "@/components/LoadingProvider";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/Spinner";
import { usePathname } from "next/navigation";
import { BookOpen, Camera, Compass, Search } from "lucide-react";
import styles from "./Header.module.css";

export function Header() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          Scanno
          <span className={styles.brandDot} />
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link
            href="/explore"
            className={styles.navLink}
            aria-current={pathname === "/explore" ? "page" : undefined}
          >
            <Compass className={styles.navIcon} aria-hidden="true" />
            Explore
          </Link>
          <Link
            href="/search"
            className={styles.navLink}
            aria-current={pathname === "/search" ? "page" : undefined}
          >
            <Search className={styles.navIcon} aria-hidden="true" />
            Search
          </Link>
          {user && (
            <Link
              href="/diary"
              className={styles.navLink}
              aria-current={pathname === "/diary" ? "page" : undefined}
            >
              <BookOpen className={styles.navIcon} aria-hidden="true" />
              Diary
            </Link>
          )}
        </nav>
        {pathname !== "/" && pathname !== "/search" && (
            <Link href="/search?scan=1" className={styles.scanButton} aria-label="Scan a product" title="Scan a product">
              <Camera size={20} aria-hidden="true" />
            </Link>
        )}
        <div className={styles.account}>
          {loading ? (
            <Spinner size="sm" />
          ) : user ? (
            <Link
              href={`/u/${user.username}`}
              className={styles.profileLink}
              aria-label={`${user.profile?.display_name || user.username}'s profile`}
            >
              <span className={styles.profileAvatar}>
                {user.profile?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profile.avatar} alt="" />
                ) : (
                  (user.profile?.display_name || user.username)
                    .slice(0, 1)
                    .toUpperCase()
                )}
              </span>
              <span className={styles.profileName}>
                {user.profile?.display_name || user.username}
              </span>
            </Link>
          ) : (
            <>
              <Link href="/login" className={styles.navLink}>
                Log in
              </Link>
              <Link href="/register" className={styles.signupLink}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
