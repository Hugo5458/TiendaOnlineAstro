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

    // ── HTTPS Redirect (production only) ──────────────────────────────────
    // Force HTTPS in production. This fixes the "redirects" check.
    const isProduction = import.meta.env.PROD;
    const proto = context.request.headers.get('x-forwarded-proto') || context.url.protocol.replace(':', '');
    if (isProduction && proto === 'http') {
        const httpsUrl = new URL(context.url);
        httpsUrl.protocol = 'https:';
        return context.redirect(httpsUrl.toString(), 301);
    }

    // Only protect /admin routes (except login)
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
        // Get session from cookies
        const accessToken = context.cookies.get('sb-access-token')?.value;
        const refreshToken = context.cookies.get('sb-refresh-token')?.value;

        if (!accessToken || !refreshToken) {
            // No tokens, redirect to login
            return context.redirect('/login');
        }

        // Verify session with Supabase
        let { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            // Invalid session, try to refresh
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
                refresh_token: refreshToken
            });

            if (refreshError || !refreshData.session) {
                // Clear invalid cookies and redirect
                context.cookies.delete('sb-access-token', { path: '/' });
                context.cookies.delete('sb-refresh-token', { path: '/' });
                return context.redirect('/login');
            }

            // Update cookies with new tokens (secure flags for scanners)
            context.cookies.set('sb-access-token', refreshData.session.access_token, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7 // 7 days
            });
            context.cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7 // 7 days
            });

            // Use the refreshed user
            user = refreshData.session.user;
        }

        // Check if user is admin by email
        if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
            // User is logged in but NOT an admin - redirect to home
            return context.redirect('/cuenta');
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
