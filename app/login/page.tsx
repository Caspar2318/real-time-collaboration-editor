"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const rules = validatePassword(password);
  const isValidPassword = Object.values(rules).every(Boolean);
  const isValidEmail = validateEmail(email);

  async function handleAuth(type: "login" | "register") {
    setError("");

    if (!isValidEmail) {
      setError("Please enter a valid email.");
      return;
    }

    if (type === "register" && !isValidPassword) {
      setError("Password does not meet the requirements.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, type }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Auth failed.");
        setLoading(false);
        return;
      }

      router.replace("/documents");
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-sky-400">Real-time Docs</h1>

        <p className="mt-2 text-sm text-slate-400">
          {mode === "login" ? "Login to continue." : "Create your account."}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-sky-500"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-sky-500"
          />

          {mode === "register" && password && (
            <div className="text-sm">
              <p className="text-slate-400">Password must contain:</p>
              <p className={rules.length ? "text-green-400" : "text-red-400"}>
                • At least 8 characters
              </p>
              <p
                className={rules.uppercase ? "text-green-400" : "text-red-400"}
              >
                • One uppercase letter
              </p>
              <p
                className={rules.lowercase ? "text-green-400" : "text-red-400"}
              >
                • One lowercase letter
              </p>
              <p className={rules.number ? "text-green-400" : "text-red-400"}>
                • One number
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            disabled={loading}
            onClick={() => handleAuth(mode)}
            className="mt-2 rounded-md bg-sky-600 py-2 font-medium text-white disabled:bg-slate-600 cursor-pointer"
          >
            {loading
              ? mode === "login"
                ? "Logging in..."
                : "Creating account..."
              : mode === "login"
                ? "Login"
                : "Register"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setEmail("");
              setPassword("");
            }}
            className="text-sm text-sky-400 underline underline-offset-4 hover:text-sky-600 cursor-pointer"
          >
            {mode === "login" ? "Create a new account" : "Back to login"}
          </button>
        </div>
      </div>
    </main>
  );
}
