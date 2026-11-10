# ARROW ESCAPE — Firebase setup

The game remains playable as a guest. Its existing localStorage save is retained. Firebase adds Google/email authentication, per-user cloud progress, a shared leaderboard, and a registered-player count once configured.

## 1. Create a Firebase project

1. Open https://console.firebase.google.com/ and create a project named **Arrow Escape**.
2. Add a **Web app** in Project settings.
3. Copy the web app configuration into `firebase-config.js`. Replace every `PASTE_` / `YOUR_` value.
4. In Authentication → Sign-in method, enable **Anonymous**, **Google**, and **Email/Password**. Anonymous sign-in is required to count guest visits without asking guests to create an account.
5. In Authentication → Settings → Authorized domains, add your GitHub Pages hostname: `naiksadashiv352-sudo.github.io`. Add your custom domain there too if you use one.
6. Create a Cloud Firestore database (production mode) in a region appropriate for your audience.

The Firebase web configuration is not a service-account secret. Never put a service-account JSON, Admin SDK private key, payment secret, or other server credential in this repository.

## 2. Publish Firestore rules

In Firebase Console → Firestore Database → Rules, paste the latest contents of `firestore.rules` and publish. The rules restrict private user documents to their owner, allow public read-only leaderboard access, allow each signed-in account to maintain one public `gamePlayers/{uid}` directory entry, and allow authenticated guest or registered sessions to create a visit record in `gameVisits`.

## 3. Test

1. Deploy the updated repository to GitHub Pages.
2. Open the game and use **Google sign in** or **Email**.
3. Complete a level, refresh, and sign in again to check cloud progress.
4. Open Leaderboard from the game menu and verify the account's score appears.
5. Return to Home and tap **Total game visits**. Open the game in a guest browser and again in a signed-in browser; refresh the count to see both openings recorded. Each fresh page load creates one visit record, so repeat visits count again.

## Current implementation boundary

- Guest play and local saves continue to work without Firebase configuration.
- Google and email/password authentication are implemented in the client.
- Signed-in progress is written to `users/{uid}`; public ranking entries are written to `leaderboard/{uid}`; one player directory entry is written to `gamePlayers/{uid}` for the community count.
- Total Game Visits counts each app opening as a separate visit, including guest sessions. Firebase Anonymous Authentication is used automatically for guests; guests do not need to register or sign in manually. One opening is recorded per page load, not per arrow move. It requires Firebase configuration, Anonymous Authentication enabled, and the latest Firestore rules. It is not a count of unique people or currently online players.
- This client-side leaderboard is suitable for an initial prototype, not a cheat-resistant competitive ranking. Players can manipulate browser state. Before cash prizes, tournaments, paid currency, or trusted rankings, move score validation and reward grants to trusted Cloud Functions / a server and use App Check.
- Payment processing, AdMob/AdSense reward verification, admin roles, and server-authoritative purchases are not enabled by this Firebase foundation.
- Do not grant currency or premium items based only on a client-side success callback.

## Deploying

This is a static GitHub Pages app and uses Firebase's browser SDK through official Google-hosted ES modules. No build step is required. GitHub Pages serves `index.html`, `firebase.js`, and `firebase-config.js` from the repository root.
