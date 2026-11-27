// Email alerts for the store, sent through Gmail's SMTP server with an app password.
// Plain SMTP over TLS with Node's own tls module, so there are no dependencies.
// Turned on by ALERT_EMAIL_USER and ALERT_EMAIL_PASSWORD; ALERT_EMAIL_TO defaults to the sending account.

import { connect } from "node:tls";

const SMTP_HOST = process.env.ALERT_SMTP_HOST ?? "smtp.gmail.com";
const SMTP_PORT = Number(process.env.ALERT_SMTP_PORT ?? 465);
const TIMEOUT_MS = 15_000;

export const alertsEnabled = () => Boolean(process.env.ALERT_EMAIL_USER && process.env.ALERT_EMAIL_PASSWORD);

const base64 = (text) => Buffer.from(text, "utf8").toString("base64");
// Base64 body lines stay under SMTP's 1000-character limit.
const wrap = (text) => text.match(/.{1,76}/g)?.join("\r\n") ?? "";

// Talks to the SMTP server: each send waits for the server's full reply and checks its code.
function smtpSession(socket) {
  let buffer = "";
  let waiting = null;
  socket.setEncoding("utf8");
  socket.on("data", (chunk) => {
    buffer += chunk;
    // A reply is complete when a line has a space after its code ("250 OK"; "250-..." means more lines follow).
    const lines = buffer.split("\r\n");
    const last = lines.findIndex((line) => /^\d{3} /.test(line));
    if (last === -1 || !waiting) return;
    const reply = lines.slice(0, last + 1).join("\n");
    buffer = lines.slice(last + 1).join("\r\n");
    const { resolve, reject, expect } = waiting;
    waiting = null;
    if (reply.startsWith(String(expect))) resolve(reply);
    else reject(new Error(`SMTP answered: ${reply}`));
  });
  const reply = (expect) => new Promise((resolve, reject) => { waiting = { resolve, reject, expect }; });
  return {
    greeting: () => reply(220),
    send: (line, expect) => {
      const answer = reply(expect);
      socket.write(`${line}\r\n`);
      return answer;
    },
  };
}

// Sends one plain-text email; rejects when the server refuses it or does not answer in time.
export async function sendAlert({ subject, text, replyTo }) {
  const user = process.env.ALERT_EMAIL_USER;
  const to = process.env.ALERT_EMAIL_TO || user;
  const socket = connect({ host: SMTP_HOST, port: SMTP_PORT, servername: SMTP_HOST });
  socket.setTimeout(TIMEOUT_MS, () => socket.destroy(new Error("SMTP timed out")));
  const failed = new Promise((_, reject) => socket.on("error", reject));
  const smtp = smtpSession(socket);

  const talk = async () => {
    await smtp.greeting();
    await smtp.send("EHLO betak-website", 250);
    await smtp.send("AUTH LOGIN", 334);
    await smtp.send(base64(user), 334);
    // Gmail shows app passwords in groups of four; the spaces are not part of it.
    await smtp.send(base64(process.env.ALERT_EMAIL_PASSWORD.replace(/\s/g, "")), 235);
    await smtp.send(`MAIL FROM:<${user}>`, 250);
    await smtp.send(`RCPT TO:<${to}>`, 250);
    await smtp.send("DATA", 354);
    const headers = [
      `From: =?UTF-8?B?${base64("אתר ביתאק")}?= <${user}>`,
      `To: <${to}>`,
      ...(replyTo ? [`Reply-To: <${replyTo}>`] : []),
      `Subject: =?UTF-8?B?${base64(subject)}?=`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
    ];
    await smtp.send(`${headers.join("\r\n")}\r\n\r\n${wrap(base64(text))}\r\n.`, 250);
    await smtp.send("QUIT", 221);
  };

  try {
    await Promise.race([talk(), failed]);
  } finally {
    socket.destroy();
  }
}

// Header values come from the visitor, so line breaks are taken out and the address is checked.
const oneLine = (value) => String(value).replace(/[\r\n]+/g, " ").trim();
const safeEmail = (value) => (/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(value) ? value : "");

// The alert for a new contact form message, in Hebrew for the store.
export function messageAlert(message, siteUrl) {
  return {
    subject: oneLine(`פנייה חדשה מהאתר: ${message.name}`),
    replyTo: safeEmail(message.email),
    text: [
      `שם: ${message.name}`,
      `טלפון: ${message.phone}`,
      ...(message.email ? [`מייל: ${message.email}`] : []),
      "",
      message.message,
      "",
      `כל הפניות: ${siteUrl}/admin/orders`,
    ].join("\n"),
  };
}
