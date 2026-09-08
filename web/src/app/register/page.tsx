"use client";

import { FormEvent, useState } from "react";
import Link from "@/components/LoadingProvider";
import { useLoadingRouter as useRouter } from "@/components/LoadingProvider";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/Spinner";

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
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-bold">Create account</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            className="w-full rounded-lg border border-ink-100 bg-white px-4 py-3"
          />
          )
        )}
        {error && <p className="text-sm text-verdict-never">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-scan-500 py-3 font-semibold text-white hover:bg-scan-600 disabled:opacity-50"
        >
          {submitting && <Spinner size="sm" onDark />}
          Sign up
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-700">
        Already have an account? <Link href="/login" className="text-scan-600">Log in</Link>
      </p>
    </div>
  );
}
