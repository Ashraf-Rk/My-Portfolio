# Ashraf Rakkab — Portfolio: setup guide

## 1. Open it
Double-click `index.html` (or host it). First visit to the admin: click **Admin** in the footer (or add `#/admin` to the URL) and create your username + password.

## 2. Where your data lives
- **Without cloud (default):** everything you edit is saved in this browser (IndexedDB). It survives closing the site. Visitors on other devices only see what is inside the HTML file.
  Use **Admin → Settings & backup → Export backup** regularly.
- **With cloud (Firebase, free tier):** edits are saved to your database, visible to every visitor, and editable from any device.

## 3. Enable cloud (10 minutes)
1. console.firebase.google.com → create a project.
2. Build → **Firestore Database** → create (production mode).
3. Build → **Storage** → get started.
4. Build → **Authentication** → Sign-in method → enable **Email/Password** → Users → add your own email + password. Copy that user's **UID**.
5. Project settings → add a **Web app** → copy the `firebaseConfig` object.
6. Paste it into `FIREBASE_CONFIG` at the top of the `<script type="module">` in `index.html`.
7. Firestore → Rules (replace YOUR_UID):
```
rules_version = '2';
service cloud.firestore { match /databases/{db}/documents {
  match /site/{doc} { allow read: if true; allow write: if request.auth.uid == 'YOUR_UID'; } } }
```
8. Storage → Rules (replace YOUR_UID):
```
rules_version = '2';
service firebase.storage { match /b/{b}/o {
  match /files/{f} { allow read: if true; allow write: if request.auth.uid == 'YOUR_UID'; } } }
```
9. Open the site → Admin → sign in with the Firebase email/password. Edits now sync automatically.

## 4. Host for free
GitHub Pages or Netlify Drop: upload `index.html`.

## Notes
- Cloud security comes from the Firebase rules above, not from the page itself.
- Local-only password protects the editor UI on your device; it is not server security.
- Firestore stores text (including code files) in one document, limit ~1 MB. Images and files go to Storage.
