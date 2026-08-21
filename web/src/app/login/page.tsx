"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.login(email, password);
      await refresh();
      router.push("/diary");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-bold">Log in</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-lg border border-ink-100 bg-white px-4 py-3"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border border-ink-100 bg-white px-4 py-3"
        />
        {error && <p className="text-sm text-verdict-never">{error}</p>}
        <button type="submit" className="w-full rounded-lg bg-scan-500 py-3 font-semibold text-white hover:bg-scan-600">
          Log in
        </button>
      </form>
      <p className="mt-4 text-sm text-ink-700">
        No account? <Link href="/register" className="text-scan-600">Sign up</Link>
      </p>
    </div>
  );
}
