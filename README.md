This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Firebase

The local emulator environment uses `NEXT_PUBLIC_USE_EMULATORS=true`. Production deployments
must set it to `false` (or omit it) and provide these public Firebase web-app variables in the
hosting provider:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_USE_EMULATORS=false
```

Never deploy the local `.env.local` unchanged: emulator mode points the server to
`127.0.0.1:8080`, which is not the deployed Firestore instance.

### Netlify secret scanning

`NEXT_PUBLIC_FIREBASE_API_KEY` is a Firebase Web API key. It is intentionally embedded in
the browser bundle and is not a server credential; Firebase Security Rules and App Check
protect access to Firebase resources. Netlify Smart Detection can still report its `AIza...`
value as a likely secret.

In the Netlify site environment variables, add
`SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES` with the exact value of
`NEXT_PUBLIC_FIREBASE_API_KEY`. Keep Smart Detection enabled and do not add private service
account values to the omit list. Trigger a fresh deploy after saving the variable.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
