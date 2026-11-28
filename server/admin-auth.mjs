// Who may open the orders page: a Google account listed in ADMIN_EMAILS, signed in with Google on the page,
// or the username and password kept on the service in ADMIN_USER and ADMIN_PASSWORD (never in the code).
// The page sends Google's ID token with every request; Google's tokeninfo endpoint confirms it is genuine.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const ADMIN_USER = process.env.ADMIN_USER ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const PASSWORD_READY = Boolean(ADMIN_USER && ADMIN_PASSWORD);
// A password sign-in lasts this long; changing the password ends every session.
const SESSION_MS = 12 * 60 * 60_000;
const SESSION_KEY = createHash("sha256").update(`betak-admin-session:${ADMIN_PASSWORD}`).digest();
// Wrong passwords allowed from one address before it has to wait.
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;
const failures = new Map();
const ADMIN_EMAILS = new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
// For local tests only; never honoured in the production image (NODE_ENV=production).
const TEST_TOKEN = process.env.NODE_ENV === "production" ? "" : process.env.ADMIN_TEST_TOKEN ?? "";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

// Checked tokens, so Google is asked once per token and not on every click.
const checked = new Map();

export const adminConfig = () => ({ clientId: CLIENT_ID, ready: Boolean(CLIENT_ID && ADMIN_EMAILS.size), password: PASSWORD_READY });

const base64url = (value) => Buffer.from(value).toString("base64url");
const sign = (text) => createHmac("sha256", SESSION_KEY).update(text).digest("base64url");
// Compares without leaking, through timing, how much of a guess was right.
const same = (a, b) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

// A session token shaped like Google's (header.payload.signature), so the page reads its expiry the same way.
function sessionToken() {
  const body = `${base64url('{"typ":"betak"}')}.${base64url(JSON.stringify({ exp: Math.floor((Date.now() + SESSION_MS) / 1000) }))}`;
  return `${body}.${sign(body)}`;
}

function validSession(token) {
  const [header, payload, signature] = token.split(".");
  if (!PASSWORD_READY || !signature || !same(signature, sign(`${header}.${payload}`))) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// Signs in with the username and password: { token }, or an error to show ("wrong", "locked", "off").
export function passwordSignIn(address, username, password) {
  if (!PASSWORD_READY) return { error: "off" };
  const record = failures.get(address);
  if (record && record.count >= MAX_FAILURES && record.until > Date.now()) return { error: "locked" };
  // Both are always compared, so a wrong username takes as long as a wrong password.
  const right = [same(String(username ?? ""), ADMIN_USER), same(String(password ?? ""), ADMIN_PASSWORD)].every(Boolean);
  if (!right) {
    if (failures.size > 1000) failures.clear();
    failures.set(address, { count: (record && record.until > Date.now() ? record.count : 0) + 1, until: Date.now() + LOCK_MS });
    return { error: "wrong" };
  }
  failures.delete(address);
  return { token: sessionToken() };
}

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
  if (validSession(token)) return "ok";
  if (!CLIENT_ID) return "signed-out";
  const email = await emailFromToken(token).catch(() => null);
  if (!email) return "signed-out";
  return ADMIN_EMAILS.has(email) ? "ok" : "not-allowed";
}
