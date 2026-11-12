# ARROW ESCAPE security notes

## What this project protects

- Firestore Security Rules are the primary access control for Firebase data. Keep the deployed rules synchronized with `firestore.rules`.
- Never commit Firebase Admin SDK service-account JSON, private keys, payment-provider secrets, email-provider secrets, or other server credentials.
- Browser Firebase configuration in `firebase-config.js` is public by design. A Firebase web API key identifies the project; it does not authorize privileged database access. Restrict the key in Google Cloud where practical, and rely on Firebase Authentication, Firestore Rules, and App Check for abuse controls.
- The game is a client-side web app. HTML, CSS, JavaScript, images, and other assets delivered to a player's browser can be inspected or copied. Minification or obfuscation is not true source-code protection.
- Do not trust client-submitted coins, diamonds, scores, play time, or purchase confirmations for valuable rewards. The current client-side leaderboard and progress sync are prototype features and are not cheat-resistant.
- Do not activate real-money purchases, cash prizes, paid currency, or valuable reward redemption until a trusted server verifies payments and calculates/grants rewards.

## Hosting and repository privacy

- Keep the GitHub repository private only after the public game has been deployed and verified on a separate host such as Cloudflare Pages.
- Cloudflare Pages can serve a public site from a private GitHub repository when its Git integration has authorized access.
- The `_headers` file in this repository is intended for Cloudflare Pages. GitHub Pages does not apply Cloudflare Pages `_headers` configuration.
- A public website remains inspectable even when its source repository is private.

## Firebase operations

1. Use production-mode Firestore rules; never publish open test rules.
2. Review and test `firestore.rules` before publishing changes.
3. Keep Authentication authorized domains limited to the actual game domains.
4. Enable Firebase App Check only after installing and testing its web SDK integration; enforcing it prematurely can block legitimate players.
5. Review Firebase usage and quotas regularly. Public visit counters can be abused and may incur usage.

## Incident response

If a service-account key, private key, payment secret, or other server credential is exposed:
1. Revoke/rotate it immediately in the provider console.
2. Remove it from the current code and Git history where possible.
3. Review provider audit logs and usage for unauthorized access.
4. Do not assume deleting the latest copy invalidates an already exposed credential.

For a suspected game vulnerability, avoid sharing credentials or personal player data in a public issue.
