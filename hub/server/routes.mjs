// Route names shared by the local dev server and the Vercel function entry (api/_hub.js).
// A handler file is served at /api/<file name> unless it is listed here. Files that share a path merge their methods.
export const ALIASES = {
  'contact-write': 'contact',
  'invoices-send': 'invoices/send',
  'invoices-payment': 'invoices/payment',
  'invoices-void': 'invoices/void',
  'public-quote': 'public/quote',
  'public-quote-respond': 'public/quote/respond',
};

// Install flow routes live outside /api and are keyed by their full path.
export const ROOT_ALIASES = {
  'oauth-callback': '/oauth/callback',
  'webhooks-platform': '/webhooks/platform',
  'auth-user-context': '/auth/user-context',
};

/** The route key of a handler file name (without .js). Root routes start with a slash. */
export const routeKey = (name) => ROOT_ALIASES[name] ?? ALIASES[name] ?? name;
