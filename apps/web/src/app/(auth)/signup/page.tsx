"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction, type SignupResult } from "./actions";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<SignupResult, FormData>(
    signupAction,
    undefined,
  );

  if (state && "ok" in state && state.ok) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <h1 className="text-base font-medium">Check your email</h1>
        <p className="text-muted-foreground">
          We sent a confirmation link. After confirming, you&apos;ll be able to sign in.
        </p>
        <Link className="underline" href="/login">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className="text-base font-medium">Create your account</h1>

      <label className="flex flex-col gap-1 text-sm">
        Full name
        <input
          name="full_name"
          type="text"
          autoComplete="name"
          className="rounded border px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded border px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="rounded border px-3 py-2 text-sm"
        />
      </label>

      {state && "error" in state && state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create account"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link className="underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
