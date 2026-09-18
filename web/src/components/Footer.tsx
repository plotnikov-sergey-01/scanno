"use client";

import Link from "@/components/LoadingProvider";
import { useAuth } from "@/lib/auth";
import styles from "./Footer.module.css";

export function Footer() {
  const { user } = useAuth();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>Scanno<span aria-hidden="true" /></Link>
          <p>Remember what belongs in your basket.</p>
        </div>
        <div className={styles.links}>
          <div>
            <h3>Product</h3>
            <Link href="/search">Search and scan</Link>
            <Link href="/explore">Explore verdicts</Link>
            <Link href={user ? "/diary" : "/register"}>Your diary</Link>
          </div>
          <div>
            <h3>Account</h3>
            {user ? (
              <Link href={`/u/${user.username}`}>My profile</Link>
            ) : (
              <>
                <Link href="/login">Log in</Link>
                <Link href="/register">Create account</Link>
              </>
            )}
          </div>
          <div className={styles.contact}>
            <h3>Contact</h3>
            <a href="mailto:hello@scanno.app">hello@scanno.app</a>
            <a href="mailto:support@scanno.app">Support</a>
            <a href="mailto:hello@scanno.app?subject=Product%20report">Report a product</a>
          </div>
        </div>
        <div className={styles.bottom}>
          <span>Copyright {new Date().getFullYear()} Scanno</span>
          <span>Built for better repeat purchases.</span>
        </div>
      </div>
    </footer>
  );
}
