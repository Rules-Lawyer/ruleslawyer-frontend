import { Auth0Client } from "@auth0/nextjs-auth0/server"

export const auth0 = new Auth0Client({
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
  },
  // Force the session cookie Path to "/". auth0 4.22 omits Path on the *chunked*
  // session cookies (__session__0/__session__1), so the browser defaults their
  // path to "/auth" (the callback's directory) and never sends them to
  // /dashboard/* — making getSession() return null on every app page.
  session: {
    cookie: {
      path: "/",
    },
  },
})
