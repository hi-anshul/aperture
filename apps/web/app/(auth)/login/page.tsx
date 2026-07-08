import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Sign in to Aperture
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Personal job-search intelligence
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 shadow-sm">
        <LoginForm />
      </div>
    </div>
  );
}
