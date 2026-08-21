"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.register(form);
      await api.login(form.email, form.password);
      await refresh();
      router.push("/search");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-bold">Create account</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {(["email", "username", "display_name", "password"] as const).map((field) => (
          <input
            key={field}
            type={field === "password" ? "password" : field === "email" ? "email" : "text"}
            required={field !== "display_name"}
            minLength={field === "password" ? 8 : undefined}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            placeholder={
              field === "display_name"
                ? "Display name"
                : field.charAt(0).toUpperCase() + field.slice(1)
            }
            className="w-full rounded-lg border border-ink-100 bg-white px-4 py-3"
          />
        ))}
        {error && <p className="text-sm text-verdict-never">{error}</p>}
        <button type="submit" className="w-full rounded-lg bg-scan-500 py-3 font-semibold text-white hover:bg-scan-600">
          Sign up
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-700">
        Already have an account? <Link href="/login" className="text-scan-600">Log in</Link>
      </p>
    </div>
  );
}
