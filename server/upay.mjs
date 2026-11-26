// Card payments through UPay's hosted payment page: the customer types the card on UPay's site, never on ours.
// Set UPAY_EMAIL (the UPay account's email) on the server to turn it on. UPAY_LIVE=1 takes real money; anything else is UPay's test mode.
import { randomBytes } from "node:crypto";

const PAYMENT_PAGE = "https://app.upay.co.il/API6/clientsecure/redirectpage.php";
const EMAIL = process.env.UPAY_EMAIL ?? "";
const LIVE = process.env.UPAY_LIVE === "1";
// The most installments a customer may choose on UPay's page; the store offers up to 10.
const MAX_PAYMENTS = Math.min(36, Math.max(1, Number.parseInt(process.env.UPAY_MAX_PAYMENTS ?? "10", 10) || 1));
// UPAY_INVOICE=1 asks UPay to issue the invoice and receipt.
const INVOICE = process.env.UPAY_INVOICE === "1" ? "1" : "0";
const REPORT_FIELDS = 40;
const REPORT_VALUE_LENGTH = 200;

export const paymentsEnabled = () => Boolean(EMAIL);
export const paymentConfig = () => ({ card: paymentsEnabled(), maxPayments: MAX_PAYMENTS });

// What a new card order starts with; the token is the secret part of the address UPay reports back to.
export const newPayment = () => ({ method: "upay", status: "pending", token: randomBytes(16).toString("hex"), live: LIVE });

// The address of UPay's payment page for an order. The amount comes from the order the server saved.
export function paymentUrl(order, siteUrl) {
  const number = String(order.number);
  const params = new URLSearchParams({
    email: EMAIL,
    amount: order.total.toFixed(2),
    currency: "NIS",
    paymentdetails: `${order.lang === "en" ? "Betak Furniture order" : "הזמנה מרהיטי ביתאק"} ${number}`,
    maxpayments: String(MAX_PAYMENTS),
    livesystem: LIVE ? "1" : "0",
    refername: "UPAY",
    lang: order.lang === "en" ? "EN" : "HE",
    createinvoiceandreceipt: INVOICE,
    returnurl: `${siteUrl}/paid?order=${number}`,
    ipnurl: `${siteUrl}/api/upay/ipn?order=${number}&token=${order.payment.token}`,
  });
  return `${PAYMENT_PAGE}?${params}`;
}

// Long digit runs could be card numbers; they are never stored, even if UPay sends one.
const safeValue = (value) => String(value).slice(0, REPORT_VALUE_LENGTH).replace(/\d{9,}/g, (run) => `…${run.slice(-4)}`);

// The first field whose name matches, ignoring case.
const field = (report, ...names) => Object.entries(report).find(([key]) => names.includes(key.toLowerCase()))?.[1] ?? "";

// What UPay reported for a payment, read defensively because UPay's report format is not published.
export function readReport(fields, order) {
  const report = Object.fromEntries(Object.entries(fields).slice(0, REPORT_FIELDS).map(([key, value]) => [key.slice(0, 60), safeValue(value)]));
  const success = field(report, "success", "status").toLowerCase();
  const errorCode = field(report, "errorcode");
  const failed = ["0", "false", "failed", "error"].includes(success) || (errorCode !== "" && !/(^|[^0-9])0*0$/.test(errorCode));
  const amount = Number.parseFloat(field(report, "amount", "totalamount", "sum"));
  const amountMatches = Number.isNaN(amount) ? null : Math.abs(amount - order.total) < 0.01;
  const status = failed ? "failed" : amountMatches === false ? "amount-mismatch" : "reported";
  const reference = field(report, "cashierid", "transactionid", "transferid", "confirmationcode", "authnumber");
  const payments = field(report, "numberpayments", "payments");
  return { status, amount: Number.isNaN(amount) ? null : amount, reference, payments, report, reportedAt: new Date().toISOString() };
}
