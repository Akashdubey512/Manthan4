// src/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { supabase } = require('./supabaseClient');

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email returned from Google'), null);

      // 1. look for existing user by oauth id
      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('oauth_provider', 'google')
        .eq('oauth_id', profile.id)
        .maybeSingle();

      // 2. fall back to matching by email (e.g. account was created via /register first)
      if (!user) {
        const { data: byEmail } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        user = byEmail;
      }

      // 3. create new user if none found
      if (!user) {
        const { data: created, error } = await supabase
          .from('users')
          .insert({
            name: profile.displayName,
            email,
            oauth_provider: 'google',
            oauth_id: profile.id,
            avatar_url: profile.photos?.[0]?.value,
            role: 'field_staff',
          })
          .select()
          .single();

        if (error) return done(error, null);
        user = created;
      } else if (!user.oauth_id) {
        // 4. existing password-based user signing in with Google for the first time
        const { data: updated, error } = await supabase
          .from('users')
          .update({ oauth_provider: 'google', oauth_id: profile.id })
          .eq('id', user.id)
          .select()
          .single();

        if (error) return done(error, null);
        user = updated;
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

module.exports = passport;