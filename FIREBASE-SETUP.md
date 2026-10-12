# Firebase owner access

1. In Firebase Console, make sure **Authentication → Sign-in method → Google** is enabled.
2. Open the site and click **+ Tulis cerita**, then sign in with the Google account that should own the stories. This creates its Firebase Authentication user.
3. In **Authentication → Users**, open that user and copy its **User UID**.
4. Replace `YOUR_OWNER_UID` in `firestore.rules` with the copied UID.
5. Publish `firestore.rules` in **Firestore Database → Rules**.
6. Verify public reading plus owner-only create/edit. If Google sign-in reports an authorized-domain error, add the site's domain under **Authentication → Settings → Authorized domains**.

Until `YOUR_OWNER_UID` is replaced, writes stay denied for everyone. Only the matching UID can create or edit stories once the rule is published. Google sign-in is enabled in the project, according to the provided Console screenshot.
