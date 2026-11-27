# Betak Furniture website

React + TypeScript + Vite storefront for [betak.co.il](https://betak.co.il), in Hebrew and English.

## Run

```bash
npm install
npm run dev      # local development
npm run build    # production build in dist/
```

Upload the contents of `dist/` to any static host.

## Where things are

| Path | What it holds |
| --- | --- |
| `src/data/catalog.ts` | Categories, product types and every product (name, price, SKU, image) |
| `src/data/store.ts` | Phone, WhatsApp, email and social links |
| `src/i18n/text.ts` | All interface copy, Hebrew and English |
| `src/pages/` | Home, category, room designer, saved list, about, contact |
| `src/components/` | Header, footer, product card, cart drawer, dialogs, 3D room |
| `src/lib/designer.ts` | Room designer rules: slots per room, taste scoring, budget split |
| `src/lib/agent.ts` | AI designer: prompt, transports (server or Claude preview), answer parsing, fallback |
| `server/server.mjs` | Production server: serves `dist/` and the AI designer endpoint (Gemini on Vertex AI) |
| `src/showroom/` | The three.js 3D showroom on the home page |
| `Dockerfile`, `cloudbuild.yaml` | Container image and Google Cloud Build / Cloud Run deployment |
| `src/styles.css` | Design tokens and all styles |
| `public/img/` | Product photos (`p<image id>.webp`), logo and hero images |

## Adding a product

Add a row to its category in `src/data/catalog.ts` and put the photo in `public/img/p<image id>.webp`.

## AI room designer

The designer chat sends the conversation and the catalog to Gemini on Vertex AI and gets back a room made of
real product ids. The call is made by `server/server.mjs`, never by the website code.

Local run, signed in with your own Google account:

```bash
npm run build
GOOGLE_CLOUD_PROJECT=cs-poc-powbbzquo5jfciibv06ma0z GOOGLE_ACCESS_TOKEN=$(gcloud auth print-access-token) npm start
```

Settings (environment variables): `GEMINI_MODEL` (default `gemini-3.8-flash`), `VERTEX_LOCATION` (default `global`).
If the call fails, the chat still answers with the rule-based builder in `src/lib/designer.ts`.

## Connecting the eSentriX agent

The floating chat is built in (`src/components/AgentWidget.tsx`). To use the eSentriX agent instead:

1. Sign Betak up in CommerceOS and copy its store id (Channels → Website shows it in the snippet as `data-store`).
2. Put the id in `ESENTRIX.storeId` in `src/data/store.ts`.
3. Build and deploy again. The site then loads eSentriX's `embed.js`, hides the built-in chat, and every
   "ask the assistant" button and the home page prompt open the eSentriX widget.

## Deploy to Google Cloud Run

One container (`Dockerfile`) serves the built site and `/api/designer`.
`cloudbuild.yaml` builds the image, pushes it to Artifact Registry and deploys it to Cloud Run:

```bash
gcloud builds submit --project cs-poc-powbbzquo5jfciibv06ma0z --config cloudbuild.yaml
```

One-time setup in the project (run with your own account):

```bash
PROJECT=cs-poc-powbbzquo5jfciibv06ma0z
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com --project $PROJECT
gcloud artifacts repositories create betak --repository-format docker --location me-west1 --project $PROJECT
```

- The Cloud Build service account needs: Cloud Run Admin, Service Account User, Artifact Registry Writer, Logs Writer.
- The Cloud Run service account needs: Vertex AI User (so the designer can call Gemini).

## Ordering

The cart asks for the same details as the old site: first and last name, email, main and other phone, the
full address (city, street, house, entrance, floor, apartment, door code, postcode), notes, whether there is
a lift, and how to pay. The order is saved on the server (`POST /api/orders`, kept in Firestore with its own
order number from 5001). Prices and the total come from the catalog (`dist/prices.json`, written by the build),
never from the browser.

- **Order by phone:** WhatsApp opens with the order and its number, as before. If saving fails, WhatsApp still opens.
- **Pay by credit card (UPay):** the customer moves to UPay's secure payment page (`server/upay.mjs`); card
  details never reach this site. UPay sends the customer back to `/paid?order=<number>` and reports the payment
  to `/api/upay/ipn`, which marks the order on the orders page. Shown only when `UPAY_EMAIL` is set.

### Card payments (UPay)

Settings on the Cloud Run service (none of them is a secret):

| Variable | Meaning |
| --- | --- |
| `UPAY_EMAIL` | The UPay account's email. Turns card payment on. |
| `UPAY_LIVE` | `1` takes real money. Anything else uses UPay's test mode. |
| `UPAY_MAX_PAYMENTS` | Most installments offered (default 10). |
| `UPAY_INVOICE` | `1` asks UPay to issue the invoice and receipt. |
| `PUBLIC_SITE_URL` | Optional, e.g. `https://betak.co.il`, for UPay's return and report addresses. |

```bash
gcloud run services update betak-website --region me-west1 --project $PROJECT --update-env-vars UPAY_EMAIL=<upay email>,UPAY_LIVE=0
```

UPay does not publish its API, so the report from UPay is stored as it arrives and read defensively. Every
order's report address carries a random token, but the customer can see that address, so a report is not proof
of payment: the orders page says "UPay reported paid" and asks to confirm in UPay before shipping. Once UPay
send their API documentation and an API key, the server can check each payment with UPay directly; the key
then goes in Secret Manager (`--update-secrets UPAY_KEY=upay-key:latest`), never in the code or the chat.

### The store's orders page

`/admin/orders` lists the orders (newest first, up to 300) with WhatsApp, phone and email links, a "read"
checkbox, search, an unread filter and export to Excel. It is linked from nowhere, never indexed, and the
server hands orders only to a Google account listed in `ADMIN_EMAILS` (`server/admin-auth.mjs`).

One-time setup in the project:

```bash
PROJECT=cs-poc-powbbzquo5jfciibv06ma0z
gcloud services enable firestore.googleapis.com --project $PROJECT
gcloud firestore databases create --location me-west1 --project $PROJECT
# The Cloud Run service account reads and writes orders:
gcloud projects add-iam-policy-binding $PROJECT --member serviceAccount:<run service account> --role roles/datastore.user
```

- Google sign-in: in the Cloud console, Google Auth Platform → Clients → Create client → Web application.
  Authorized JavaScript origins: the Cloud Run address and `https://betak.co.il`. Copy the client id.
- Tell the service who may sign in (kept on the service, not in the code):
  `gcloud run services update betak-website --region me-west1 --project $PROJECT --update-env-vars GOOGLE_CLIENT_ID=<client id>,ADMIN_EMAILS=<gmail>`
  (several emails: separate with `\,` or use `--env-vars-file`).

### Contact form and email alerts

The contact page form saves each message in Firestore (`messages`, `server/messages.mjs`); they show in the
"פניות מהאתר" tab of `/admin/orders`. To also get an email for each new message (`server/mail.mjs`, Gmail SMTP):

1. On the Gmail account, turn on 2-Step Verification, then create an app password at
   https://myaccount.google.com/apppasswords (16 letters).
2. Keep it in Secret Manager and give it to the service (the run service account needs
   `roles/secretmanager.secretAccessor` on the secret):

```bash
printf '%s' '<app password>' | gcloud secrets create alert-email-password --data-file=- --project $PROJECT
gcloud run services update betak-website --region me-west1 --project $PROJECT \
  --update-env-vars ALERT_EMAIL_USER=<gmail> --update-secrets ALERT_EMAIL_PASSWORD=alert-email-password:latest
```

`ALERT_EMAIL_TO` sends the alerts to another address (default: the same Gmail). Without these settings the form
works the same, with no email.

Local run without Google Cloud: `ORDERS_STORE=memory npm start` keeps orders in memory. To open the orders
page locally, also set `ADMIN_TEST_TOKEN` and put the same value in the tab's `sessionStorage`
(`betak.admin.token`); the production image ignores it.
