import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { dashboardPathForRole, roleForAccountType } from "./roles";
import type { AccountType, AuthError } from "./types";
import "./auth-pages.css";

const ACCOUNT_OPTIONS: ReadonlyArray<{
  type: AccountType;
  title: string;
  description: string;
}> = [
  {
    type: "regular",
    title: "Agricultural Advisor",
    description: "Regional environmental context and community observations for agricultural work.",
  },
  {
    type: "scientific",
    title: "Researcher",
    description: "Study-area exploration and scientific workflows for research use.",
  },
];

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<AccountType>("regular");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const user = await login({ email: email.trim(), password }, accountType);
      navigate(dashboardPathForRole(roleForAccountType(user.accountType)), { replace: true });
    } catch (reason) {
      const authError = reason as Partial<AuthError>;
      setError(authError.message ?? "Sign-in could not be completed. Check your details and try again.");
    }
  }

  return (
    <main className="auth-page" data-theme="light">
      <section className="auth-brand-panel" aria-label="Dancing with the SARs">
        <a className="auth-brand" href="/login" aria-label="Dancing with the SARs sign in">
          <span className="auth-brand-mark" aria-hidden="true">D</span>
          <span><strong>Dancing with the SARs</strong><small>Environmental intelligence for the Haouz Plain</small></span>
        </a>
        <div className="auth-brand-message">
          <span className="auth-eyebrow">MOROCCO · EARTH OBSERVATION</span>
          <h1>Understand the landscape. Support better decisions.</h1>
          <p>Sign in to an agricultural or research workspace, with each role designed for its own way of working.</p>
        </div>
        <span className="auth-brand-caption">DEMONSTRATION ACCESS · SYNTHETIC ACCOUNTS</span>
      </section>

      <section className="auth-form-panel" aria-labelledby="login-heading">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <span className="auth-brand-mark" aria-hidden="true">D</span>
            <span><strong>Dancing with the SARs</strong><small>Demo workspace</small></span>
          </div>
          <div className="auth-form-heading">
            <span className="auth-eyebrow">WELCOME BACK</span>
            <h2 id="login-heading">Sign in to your workspace</h2>
            <p>Choose the account type connected to your demo account.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <fieldset className="auth-role-fieldset">
              <legend>Account type</legend>
              <div className="auth-role-options">
                {ACCOUNT_OPTIONS.map((option) => (
                  <label className={`card bg-base-100 border auth-role-card ${accountType === option.type ? "selected" : ""}`} key={option.type}>
                    <input
                      className="radio radio-primary auth-role-radio"
                      type="radio"
                      name="accountType"
                      value={option.type}
                      checked={accountType === option.type}
                      onChange={() => { setAccountType(option.type); setError(""); }}
                    />
                    <span className="auth-role-copy"><strong>{option.title}</strong><small>{option.description}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error && <div className="alert alert-error auth-feedback" role="alert">{error}</div>}
            {notice && <div className="alert auth-feedback auth-notice" role="status">{notice}</div>}

            <label className="auth-field" htmlFor="login-email">
              <span>Email address</span>
              <input className="input input-bordered" id="login-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" />
            </label>

            <label className="auth-field" htmlFor="login-password">
              <span>Password</span>
              <span className="auth-password-wrap">
                <input className="input input-bordered" id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
                <button className="auth-show-password" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
              </span>
            </label>

            <div className="auth-secondary-actions">
              <button className="link auth-text-action" type="button" onClick={() => { setError(""); setNotice("Password recovery is not available in this mock sign-in flow."); }}>Forgot password?</button>
            </div>

            <button className="btn btn-primary auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? <><span className="loading loading-spinner loading-sm" aria-hidden="true" /> Signing in…</> : <>Sign in <span aria-hidden="true">→</span></>}
            </button>

            <p className="auth-create-account">New to the platform? <button className="link auth-text-action" type="button" onClick={() => { setError(""); setNotice("Account registration will be available in a later approved step."); }}>Create an account</button></p>
          </form>

          <details className="auth-demo-details">
            <summary>Show synthetic demo accounts</summary>
            <div><strong>Agricultural Advisor</strong><span>Email: advisor@agri.haouz-demo.test</span><span>Password: Haouz-Advisor-2026!</span></div>
            <div><strong>Researcher · verified reviewer</strong><span>Email: researcher@research.haouz-demo.test</span><span>Password: Haouz-Research-2026!</span></div>
            <div><strong>Researcher · reviewer not verified</strong><span>Email: scientist@research.haouz-demo.test</span><span>Password: Science-Observer-2026!</span></div>
            <p>These accounts and credentials are fictional. The reserved .test domains do not receive email.</p>
          </details>
          <p className="auth-security-note">Role checks in this frontend are for demonstration only and do not replace server-side authorization.</p>
        </div>
      </section>
    </main>
  );
}
