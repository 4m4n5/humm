# Mood feature — Firestore security rules

If the **feed** (`subscribeToCoupleMoodFeed`) still fails while single-doc listeners work, your **`allow list`** rule was probably too strict (e.g. matching document ID to fields). Firestore treats collection queries specially: **rules are not filters**, so tie **`docId` ↔︎ fields** only on **`allow get` / writes**, and keep **`allow list`** to **`coupleId` + `isCoupleMember`** like [`firestore.mood.rules`](../firestore.mood.rules).

If mood screens still log **Missing or insufficient permissions** after you published rules, you likely merged an older **`allow read`** rule that only checks `resource.data`. Listeners on **today’s doc** run **before** the first save; that document **does not exist** yet, so `resource` is empty and the rule denies the snapshot. Use the current [`firestore.mood.rules`](../firestore.mood.rules): **mood helper functions** plus **`allow list` / `allow get`** (with `!exists`) — same idea as `habitCheckins`.

If your rules file does **not** define `isCoupleMember` yet (for example you haven’t merged the habits fragment), add this **once** alongside other helpers:

```txt
function isCoupleMember(coupleId) {
  return exists(/databases/$(database)/documents/couples/$(coupleId))
    && (
      get(/databases/$(database)/documents/couples/$(coupleId)).data.user1Id == request.auth.uid
      || get(/databases/$(database)/documents/couples/$(coupleId)).data.user2Id == request.auth.uid
    );
}
```

Then paste **all mood helper functions and** the **`match /moodEntries/{docId}`** block from [`firestore.mood.rules`](../firestore.mood.rules) (not only the `match` block).

## What to do

1. Open [Firebase Console](https://console.firebase.google.com) → your project → **Firestore Database** → **Rules**.
2. Remove any previous **`match /moodEntries`** block that used a single **`allow read: ... resource.data...`** (replace with the version from [`firestore.mood.rules`](../firestore.mood.rules)).
3. Paste the **mood helpers + `match /moodEntries`** from [`firestore.mood.rules`](../firestore.mood.rules). Use your existing **`signedIn()`** helper instead of `request.auth != null` if you prefer — both mean “authenticated”.
4. Click **Publish**.

Do **not** define `isCoupleMember` twice — Firestore will reject duplicate functions.

## Indexes

Deploy composite indexes after pulling latest [`firestore.indexes.json`](../firestore.indexes.json):

```bash
npm run deploy:indexes
```
