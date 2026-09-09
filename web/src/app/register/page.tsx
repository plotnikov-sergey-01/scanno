"use client";

import { FormEvent, useState } from "react";
import Link from "@/components/LoadingProvider";
import { useLoadingRouter as useRouter } from "@/components/LoadingProvider";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/Spinner";
import styles from "./page.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    display_name: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.register(form);
      await api.login(form.email, form.password);
      await refresh();
      router.push("/search");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Create account</h1>
      <form onSubmit={onSubmit} className={styles.form}>
        {(["email", "username", "display_name", "password"] as const).map((field) =>
          field === "password" ? (
            <PasswordInput
              key={field}
              required
              minLength={8}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              placeholder="Password"
            />
          ) : (
          <input
            key={field}
            type={field === "email" ? "email" : "text"}
            required={field !== "display_name"}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            placeholder={
              field === "display_name"
                ? "Display name"
                : field.charAt(0).toUpperCase() + field.slice(1)
            }
            className={styles.input}
          />
          )
        )}
        {error && <p className={styles.error}>{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className={styles.submitButton}
        >
          {submitting && <Spinner size="sm" onDark />}
          Sign up
        </button>
      </form>
      <p className={styles.footerText}>
        Already have an account? <Link href="/login" className={styles.link}>Log in</Link>
      </p>
    </div>
  );
}
