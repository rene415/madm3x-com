import { defineMiddleware } from 'astro:middleware';
import { verifyToken } from './lib/auth.ts';

const ADMIN_ROOT  = '/mad/3x/admin';
const LOGIN_PAGE  = `${ADMIN_ROOT}/login`;

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Always resolve the token so API routes can read locals.user
  const token   = context.cookies.get('admin_token')?.value;
  const payload = token ? await verifyToken(token) : null;
  context.locals.user = payload;

  // Redirect unauthenticated visitors away from protected admin pages
  if (pathname.startsWith(ADMIN_ROOT) && pathname !== LOGIN_PAGE) {
    if (!payload) {
      return context.redirect(LOGIN_PAGE);
    }
  }

  return next();
});
