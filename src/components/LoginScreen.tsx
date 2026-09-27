import React, { useEffect, useState } from "react";
import { useHotel } from "../context/HotelContext";
import { AuthApiError, authService } from "../services/authService";
import { SetupScreen } from "./SetupScreen";

export const LoginScreen: React.FC = () => {
  const { loginWithCredentials } = useHotel();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  // On a fresh install there are no staff accounts yet: offer first-run setup instead of sign-in.
  useEffect(() => {
    authService
      .setupStatus()
      .then((status) => setSetupRequired(status.required))
      .catch(() => setSetupRequired(false));
  }, []);

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    const trimmed = email.trim();
    if (!trimmed) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 8) next.password = "Password must be at least 8 characters.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await loginWithCredentials(email, password);
    } catch (err) {
      if (err instanceof AuthApiError) {
        if (err.status === 0) setError("Unable to connect to the server. Please try again.");
        else if (err.status === 401 || err.status === 403) setError("Invalid email or password.");
        else if (err.status >= 500) setError("Something went wrong. Please try again.");
        else setError(err.message || "Something went wrong. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (setupRequired) return <SetupScreen onAlreadyDone={() => setSetupRequired(false)} />;

  return (
    <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#bfc7d2]/40 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 bg-[#262f4c] text-[#eff0ff] text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#007bb9] flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-white text-[28px]">villa</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Blue Top Villa Dashboard</h1>
          <p className="text-xs text-[#bfc7d2]">
            Front desk, housekeeping, rates and enquiries
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-5 text-xs" noValidate>
          <div className="p-3 rounded-lg bg-[#cce5ff]/30 text-[#001d31] text-[11px] border border-[#006194]/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#006194]">verified_user</span>
            <span>Sign in with your staff email and password to access the terminal.</span>
          </div>

          {error ? (
            <div
              role="alert"
              className="p-3 rounded-lg bg-[#ffdad6]/50 text-[#ba1a1a] text-[11px] border border-[#ba1a1a]/25 flex items-start gap-2"
            >
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          ) : null}

          <div>
            <label htmlFor="login-email" className="font-bold text-[#111a36] block mb-1.5">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              disabled={isSubmitting}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={`w-full h-9 px-3 rounded-lg border focus:outline-none disabled:opacity-60 ${
                fieldErrors.email
                  ? "border-[#ba1a1a] focus:border-[#ba1a1a]"
                  : "border-[#bfc7d2]/60 focus:border-[#006194]"
              }`}
              placeholder="you@bluetopvilla.com"
            />
            {fieldErrors.email ? <p className="mt-1 text-[11px] text-[#ba1a1a]">{fieldErrors.email}</p> : null}
          </div>

          <div>
            <label htmlFor="login-password" className="font-bold text-[#111a36] block mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                disabled={isSubmitting}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className={`w-full h-9 px-3 pr-10 rounded-lg border focus:outline-none disabled:opacity-60 ${
                  fieldErrors.password
                    ? "border-[#ba1a1a] focus:border-[#ba1a1a]"
                    : "border-[#bfc7d2]/60 focus:border-[#006194]"
                }`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                tabIndex={-1}
                disabled={isSubmitting}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#707881] hover:text-[#111a36] disabled:opacity-50"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {fieldErrors.password ? (
              <p className="mt-1 text-[11px] text-[#ba1a1a]">{fieldErrors.password}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-[#006194] hover:bg-[#007bb9] disabled:bg-[#707881] disabled:hover:bg-[#707881] disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:active:scale-100"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">lock_open</span>
                <span>Sign in</span>
              </>
            )}
          </button>
        </form>

        <div className="p-4 bg-[#faf8ff] border-t border-[#ebedff] text-center text-[11px] text-[#707881]">
          Protected by Role-Based Access Control · JWT Session
        </div>
      </div>
    </div>
  );
};
