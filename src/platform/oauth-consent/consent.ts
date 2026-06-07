export const consentHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Authorize Personal MCP</title>
    <link rel="stylesheet" href="/assets/oauth-consent.css" />
  </head>
  <body data-supabase-url="__SUPABASE_URL__" data-supabase-anon-key="__SUPABASE_ANON_KEY__">
    <main class="shell">
      <h1>Authorize Personal MCP</h1>
      <p id="status">Loading authorization request...</p>
      <form id="email-form" class="panel" hidden>
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="email" required />
        <button type="submit">Send magic link</button>
      </form>
      <section id="consent" class="panel" hidden>
        <p id="client"></p>
        <button id="approve" type="button">Approve</button>
        <button id="deny" type="button" class="secondary">Deny</button>
      </section>
    </main>
    <script src="/assets/vendor/supabase.js"></script>
    <script src="/assets/oauth-consent.js"></script>
  </body>
</html>`;

export const consentCss = `:root {
  color: #1f2933;
  background: #f7f8fa;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

body {
  margin: 0;
}

.shell {
  box-sizing: border-box;
  width: min(100%, 420px);
  margin: 0 auto;
  padding: 32px 16px;
}

h1 {
  margin: 0 0 12px;
  font-size: 24px;
  line-height: 1.2;
}

.panel {
  display: grid;
  gap: 12px;
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #d7dde5;
  border-radius: 8px;
  background: #ffffff;
}

input,
button {
  min-height: 40px;
  border-radius: 6px;
  font: inherit;
}

input {
  border: 1px solid #b8c1cc;
  padding: 0 10px;
}

button {
  border: 0;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
}

button.secondary {
  border: 1px solid #b8c1cc;
  background: #ffffff;
  color: #1f2933;
}`;

export const consentScript = `(function () {
  const supabaseUrl = document.body.dataset.supabaseUrl || "";
  const supabaseAnonKey = document.body.dataset.supabaseAnonKey || "";
  const statusEl = document.querySelector("#status");
  const formEl = document.querySelector("#email-form");
  const consentEl = document.querySelector("#consent");
  const clientEl = document.querySelector("#client");
  const params = new URLSearchParams(window.location.search);
  const authorizationId = params.get("authorization_id");

  function setStatus(message) {
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  function getOAuthClient() {
    const createClient = window.supabase && window.supabase.createClient;
    if (!createClient) {
      setStatus("Authorization client could not be loaded.");
      return null;
    }

    const client = createClient(supabaseUrl, supabaseAnonKey);
    const oauth = client.auth && client.auth.oauth;
    const hasOAuthHelpers =
      oauth &&
      typeof oauth.getAuthorizationDetails === "function" &&
      typeof oauth.approveAuthorization === "function" &&
      typeof oauth.denyAuthorization === "function";

    if (!hasOAuthHelpers) {
      setStatus("Supabase OAuth consent helpers are not available in this client.");
      return null;
    }

    return { client, oauth };
  }

  async function main() {
    if (!authorizationId) {
      setStatus("Missing authorization request.");
      return;
    }

    const oauthClient = getOAuthClient();
    if (!oauthClient) {
      return;
    }

    const session = await oauthClient.client.auth.getSession();

    if (!session.data.session) {
      setStatus("Sign in to authorize ChatGPT.");
      if (formEl) {
        formEl.removeAttribute("hidden");
      }
      return;
    }

    if (formEl) {
      formEl.setAttribute("hidden", "true");
    }

    const response = await oauthClient.oauth.getAuthorizationDetails(authorizationId);

    if (response.error) {
      setStatus("Authorization request could not be loaded.");
      return;
    }

    const data = response.data;

    if (data && !("authorization_id" in data) && data.redirect_url) {
      window.location.href = data.redirect_url;
      return;
    }

    if (clientEl && data && data.client) {
      clientEl.textContent = String(data.client.name || "ChatGPT") + " is requesting access to Personal MCP.";
    }

    if (consentEl) {
      consentEl.removeAttribute("hidden");
    }
    setStatus("Review and approve access.");
  }

  if (formEl) {
    formEl.addEventListener("submit", async function (event) {
      event.preventDefault();
      const oauthClient = getOAuthClient();
      if (!oauthClient) {
        return;
      }

      const formData = new FormData(formEl);
      const email = String(formData.get("email") || "");

      const response = await oauthClient.client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.href,
        },
      });

      setStatus(response.error ? "Could not send magic link." : "Check your email for the sign-in link.");
    });
  }

  const approveEl = document.querySelector("#approve");
  if (approveEl) {
    approveEl.addEventListener("click", async function () {
      if (!authorizationId) return;
      const oauthClient = getOAuthClient();
      if (!oauthClient) return;
      const response = await oauthClient.oauth.approveAuthorization(authorizationId);
      if (response.error) {
        setStatus("Could not approve authorization.");
        return;
      }
      window.location.href = response.data.redirect_url;
    });
  }

  const denyEl = document.querySelector("#deny");
  if (denyEl) {
    denyEl.addEventListener("click", async function () {
      if (!authorizationId) return;
      const oauthClient = getOAuthClient();
      if (!oauthClient) return;
      const response = await oauthClient.oauth.denyAuthorization(authorizationId);
      if (response.error) {
        setStatus("Could not deny authorization.");
        return;
      }
      window.location.href = response.data.redirect_url;
    });
  }

  void main();
})();`;
