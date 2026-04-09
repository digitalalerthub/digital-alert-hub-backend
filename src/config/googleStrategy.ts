import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";

dotenv.config();

const clientID = process.env.GOOGLE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const callbackURL = process.env.GOOGLE_CALLBACK_URL?.trim();

if (clientID && clientSecret && callbackURL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        passReqToCallback: true,
      },
      async (_req, _accessToken, _refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );
} else {
  console.warn(
    "Google OAuth deshabilitado: faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_CALLBACK_URL."
  );
}

export default passport;
