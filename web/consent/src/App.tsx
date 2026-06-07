import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

type AppProps = {
  supabase: SupabaseClient;
};

type ViewState = "loading" | "missing_request" | "signed_out" | "ready" | "error" | "redirecting";

type OAuthHelpers = NonNullable<SupabaseClient["auth"]["oauth"]>;

const accessItems = [
  "Check platform status",
  "Use future notes tools",
  "Use future finance tools",
  "Use future habit tools",
];

export function App({ supabase }: AppProps) {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [message, setMessage] = useState("Loading connection request...");
  const [email, setEmail] = useState("");
  const [clientName, setClientName] = useState("ChatGPT");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);

  const authorizationId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("authorization_id");
  }, []);

  const oauth = supabase.auth.oauth as OAuthHelpers | undefined;

  useEffect(() => {
    async function load() {
      if (!authorizationId) {
        setViewState("missing_request");
        setMessage("Start this connection from ChatGPT so we can verify the request.");
        return;
      }

      if (
        !oauth ||
        typeof oauth.getAuthorizationDetails !== "function" ||
        typeof oauth.approveAuthorization !== "function" ||
        typeof oauth.denyAuthorization !== "function"
      ) {
        setViewState("error");
        setMessage("The authorization client is not available. Please try again later.");
        return;
      }

      const session = await supabase.auth.getSession();

      if (!session.data.session) {
        setViewState("signed_out");
        setMessage("Sign in to verify that you own this Personal MCP server.");
        return;
      }

      const response = await oauth.getAuthorizationDetails(authorizationId);

      if (response.error) {
        console.error("Authorization details error", response.error);
        setViewState("error");
        setMessage("Could not load this connection request.");
        return;
      }

      const data = response.data;

      if (data && !("authorization_id" in data) && data.redirect_url) {
        setViewState("redirecting");
        setMessage("Redirecting you back to ChatGPT...");
        window.location.href = data.redirect_url;
        return;
      }

      if (data?.client?.name) {
        setClientName(String(data.client.name));
      }

      setViewState("ready");
      setMessage("Review this connection before approving access.");
    }

    void load();
  }, [authorizationId, oauth, supabase.auth]);

  async function sendMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.href,
        },
      });

      if (response.error) {
        console.error("Magic link error", response.error);
        setMessage(`Could not send sign-in link: ${response.error.message}`);
        return;
      }

      setLinkSentTo(email);
      setMessage("Check your email to continue.");
    } catch (error) {
      console.error("Magic link exception", error);
      setMessage(
        `Could not send sign-in link: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendMagicLink() {
    if (!linkSentTo) return;

    setIsSubmitting(true);

    try {
      const response = await supabase.auth.signInWithOtp({
        email: linkSentTo,
        options: {
          emailRedirectTo: window.location.href,
        },
      });

      if (response.error) {
        console.error("Magic link resend error", response.error);
        setMessage(`Could not resend sign-in link: ${response.error.message}`);
        return;
      }

      setMessage("We sent a new sign-in link. Check your email to continue.");
    } catch (error) {
      console.error("Magic link resend exception", error);
      setMessage(
        `Could not resend sign-in link: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function approve() {
    if (!authorizationId || !oauth) return;

    setIsSubmitting(true);
    setMessage("Approving connection...");

    const response = await oauth.approveAuthorization(authorizationId);

    if (response.error) {
      console.error("Approve authorization error", response.error);
      setIsSubmitting(false);
      setMessage("Could not approve the connection. Please try again.");
      return;
    }

    setViewState("redirecting");
    setMessage("Connection approved. Redirecting you back to ChatGPT...");
    window.location.href = response.data.redirect_url;
  }

  async function deny() {
    if (!authorizationId || !oauth) return;

    setIsSubmitting(true);
    setMessage("Denying connection...");

    const response = await oauth.denyAuthorization(authorizationId);

    if (response.error) {
      console.error("Deny authorization error", response.error);
      setIsSubmitting(false);
      setMessage("Could not deny the connection. Please try again.");
      return;
    }

    setViewState("redirecting");
    setMessage("Connection denied. Redirecting you back to ChatGPT...");
    window.location.href = response.data.redirect_url;
  }

  return (
    <main className="page">
      <section className="card" aria-labelledby="consent-title">
        <div className="brand-row">
          <div className="brand-mark">PM</div>
          <div>
            <p className="eyebrow">Personal MCP</p>
            <p className="brand-subtitle">Secure connection approval</p>
          </div>
        </div>

        <div className="hero">
          <span className="badge">OAuth connection</span>
          <h1 id="consent-title">
            {viewState === "ready" ? "Approve ChatGPT connection?" : "Connect your personal tools"}
          </h1>
          <p className="status">{message}</p>
        </div>

        {viewState === "signed_out" && (
          <div className="panel">
            {linkSentTo ? (
              <>
                <div className="request-box">
                  <p className="request-label">Sign-in link sent</p>
                  <p className="request-name">Check your email</p>
                </div>

                <p className="field-hint">
                  We sent a sign-in link to <strong>{linkSentTo}</strong>. Open that email in this
                  browser to continue approving the ChatGPT connection.
                </p>

                <div className="actions">
                  <button
                    type="button"
                    onClick={() => void resendMagicLink()}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Resend sign-in link"}
                  </button>
                  <button type="button" className="secondary" onClick={() => setLinkSentTo(null)}>
                    Use a different email
                  </button>
                </div>
              </>
            ) : (
              <form className="email-form" onSubmit={sendMagicLink}>
                <div>
                  <label htmlFor="email">Email address</label>
                  <p className="field-hint">Use the email connected to your Supabase account.</p>
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send sign-in link"}
                </button>
                <p className="fine-print">
                  Only approve this connection if you started it from ChatGPT.
                </p>
              </form>
            )}
          </div>
        )}

        {viewState === "ready" && (
          <div className="panel">
            <div className="request-box">
              <p className="request-label">Requesting app</p>
              <p className="request-name">{clientName}</p>
            </div>

            <div>
              <p className="section-label">This connection can access:</p>
              <ul className="access-list">
                {accessItems.map((item) => (
                  <li key={item}>
                    <span className="check">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="actions">
              <button type="button" onClick={approve} disabled={isSubmitting}>
                {isSubmitting ? "Working..." : "Approve connection"}
              </button>
              <button type="button" className="secondary" onClick={deny} disabled={isSubmitting}>
                Deny
              </button>
            </div>
          </div>
        )}

        {viewState === "missing_request" && (
          <div className="panel muted-panel">
            <p>Open this page from the ChatGPT connector setup flow.</p>
          </div>
        )}

        {viewState === "error" && (
          <div className="panel error-panel">
            <p>Something went wrong while preparing the connection.</p>
            <p className="fine-print">Check the browser console or Render logs for details.</p>
          </div>
        )}

        {viewState === "redirecting" && (
          <div className="panel muted-panel">
            <div className="loader" aria-hidden="true" />
            <p>Redirecting...</p>
          </div>
        )}
      </section>
    </main>
  );
}
