"use client";

import { FormEvent, useState } from "react";
import Link from "@/components/LoadingProvider";
import { useLoadingRouter as useRouter } from "@/components/LoadingProvider";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/Spinner";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.login(email, password);
      await refresh();
      router.push("/diary");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Log in</h1>
      <form onSubmit={onSubmit} className={styles.form}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className={styles.input}
        />
        <PasswordInput
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        {error && <p className={styles.error}>{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className={styles.submitButton}
        >
          {submitting && <Spinner size="sm" onDark />}
          Log in
        </button>
      </form>
      <p className={styles.footerText}>
        No account? <Link href="/register" className={styles.link}>Sign up</Link>
      </p>
    </div>
  );
}
