import { defineMiddleware } from 'astro:middleware';
import { supabase } from './lib/supabase';

const ADMIN_EMAILS = ['hugodelmoral77@gmail.com', 'admin@fashionstore.com'];

// ── Security Headers ──────────────────────────────────────────────────
// These headers fix the issues reported by security scanners (e.g. Mozilla Observatory).
// NOTE: Firewall/WAF, DNSSEC, and DoH must be configured at the hosting/DNS level.

const securityHeaders: Record<string, string> = {
    // Content-Security-Policy – controls which resources the browser is allowed to load.
    // 'unsafe-inline' is needed because Astro injects inline <script> and <style> blocks.
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https: http:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.stripe.com",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
        "upgrade-insecure-requests",
    ].join('; '),

    // Strict-Transport-Security – forces HTTPS for 1 year, including sub-domains.
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // X-Content-Type-Options – prevents browsers from MIME-sniffing the response.
    'X-Content-Type-Options': 'nosniff',

    // X-Frame-Options – prevents click-jacking by disallowing iframes from other origins.
    'X-Frame-Options': 'SAMEORIGIN',

    // X-XSS-Protection – modern best practice is to set to "0" and rely on CSP instead.
    // Setting to "1; mode=block" is also acceptable for older browsers.
    'X-XSS-Protection': '1; mode=block',

    // Referrer-Policy – controls how much referrer info is sent with requests.
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions-Policy – restricts browser features (camera, microphone, etc.).
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
};

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    // NOTE: HTTPS redirect is handled by Cloudflare. Do NOT add redirect logic
    // here, as it causes infinite redirect loops (Cloudflare may forward
    // x-forwarded-proto: http even after upgrading the connection).

    // Only protect /admin and /cuenta routes (except login/auth related)
    const isProtected = (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) ||
        (pathname.startsWith('/cuenta'));

    if (isProtected) {
        // Get session from cookies
        const accessToken = context.cookies.get('sb-access-token')?.value;
        const refreshToken = context.cookies.get('sb-refresh-token')?.value;

        if (!accessToken || !refreshToken) {
            return context.redirect('/login?redirect=' + pathname);
        }

        // Verify session with Supabase
        let { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            // Invalid or expired token, try to refresh
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
                refresh_token: refreshToken
            });

            if (refreshError || !refreshData.session) {
                // Refresh failed, clear cookies and redirect
                context.cookies.delete('sb-access-token', { path: '/' });
                context.cookies.delete('sb-refresh-token', { path: '/' });
                return context.redirect('/login?redirect=' + pathname);
            }

            // Update cookies with new tokens
            context.cookies.set('sb-access-token', refreshData.session.access_token, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7
            });
            context.cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7
            });

            user = refreshData.session.user;
        }

        // Set locals for use in pages
        context.locals.user = user;
        context.locals.email = user?.email;

        // Admin checks for /admin routes
        if (pathname.startsWith('/admin')) {
            if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
                return context.redirect('/cuenta');
            }
        }
    }

    // Get the response from the next middleware / route handler
    const response = await next();

    // Attach security headers to every response
    for (const [header, value] of Object.entries(securityHeaders)) {
        response.headers.set(header, value);
    }

    return response;
});
