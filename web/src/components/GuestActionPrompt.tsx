"use client";

import { usePathname } from "next/navigation";
import Link from "@/components/LoadingProvider";
import styles from "./GuestActionPrompt.module.css";

export function GuestActionPrompt({ text }: { text: string }) {
  const pathname = usePathname();
  const next = encodeURIComponent(pathname || "/");

  return (
    <div className={styles.prompt}>
      <p>{text}</p>
      <div className={styles.actions}>
        <Link href={`/login?next=${next}`} className={styles.loginButton}>
          Log in
        </Link>
        <Link href={`/register?next=${next}`} className={styles.registerButton}>
          Sign up
        </Link>
      </div>
    </div>
  );
}
