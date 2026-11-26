// Who may open the orders page: a Google account listed in ADMIN_EMAILS, signed in with Google on the page.
// The page sends Google's ID token with every request; Google's tokeninfo endpoint confirms it is genuine.

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const ADMIN_EMAILS = new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
// For local tests only; never honoured in the production image (NODE_ENV=production).
const TEST_TOKEN = process.env.NODE_ENV === "production" ? "" : process.env.ADMIN_TEST_TOKEN ?? "";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

// Checked tokens, so Google is asked once per token and not on every click.
const checked = new Map();

export const adminConfig = () => ({ clientId: CLIENT_ID, ready: Boolean(CLIENT_ID && ADMIN_EMAILS.size) });

async function emailFromToken(token) {
  const known = checked.get(token);
  if (known && known.expiresAt > Date.now()) return known.email;

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  if (!response.ok) return null;
  const info = await response.json();
  const genuine = info.aud === CLIENT_ID && ISSUERS.has(info.iss) && info.email_verified === "true" && Number(info.exp) * 1000 > Date.now();
  if (!genuine) return null;

  if (checked.size > 100) checked.clear();
  checked.set(token, { email: info.email.toLowerCase(), expiresAt: Number(info.exp) * 1000 });
  return info.email.toLowerCase();
}

// "ok" for the store's own account, "signed-out" for no or a bad token, "not-allowed" for any other account.
export async function checkAdmin(request) {
  const token = (request.headers.authorization ?? "").replace(/^Bearer /, "");
  if (!token) return "signed-out";
  if (TEST_TOKEN && token === TEST_TOKEN) return "ok";
  if (!CLIENT_ID) return "signed-out";
  const email = await emailFromToken(token).catch(() => null);
  if (!email) return "signed-out";
  return ADMIN_EMAILS.has(email) ? "ok" : "not-allowed";
}
