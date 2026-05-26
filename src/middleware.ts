import { defineMiddleware } from 'astro:middleware';
import { verifyToken } from './lib/auth.ts';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Initialise locals
  context.locals.user = null;

  // Resolve auth for every admin route except the login page itself
  if (pathname.startsWith('/admin')) {
    const token   = context.cookies.get('admin_token')?.value;
    const payload = token ? await verifyToken(token) : null;

    if (payload) {
      context.locals.user = payload;
    } else if (!pathname.startsWith('/admin/login')) {
      return context.redirect('/admin/login');
    }
  }

  return next();
});
