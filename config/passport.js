import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "../storage.js";
import { log } from "../utils/logger.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export function configurePassport(app) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    log("Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET", "auth");
    return false;
  }

  const callbackURL = process.env.BASE_URL
    ? `${process.env.BASE_URL}/api/auth/google/callback`
    : "http://localhost:4000/api/auth/google/callback";

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const nickname = profile.displayName || profile.name?.givenName || "User";

          if (!email) {
            return done(new Error("No email found from Google"), undefined);
          }

          let account = await storage.getAccountByGoogleId(googleId);

          if (!account) {
            account = await storage.getAccountByEmail(email);
            if (account) {
              await storage.updateAccount(account._id.toString(), { googleId });
              account = await storage.getAccountById(account._id.toString());
            }
          }

          if (!account) {
            const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") + Date.now().toString().slice(-4);
            account = await storage.createAccount({
              email,
              username,
              nickname,
              googleId,
            });
          }

          return done(null, account);
        } catch (error) {
          return done(error, undefined);
        }
      }
    )
  );

  app.use(passport.initialize());
  log("Google OAuth configured", "auth");
  return true;
}

export { passport };
