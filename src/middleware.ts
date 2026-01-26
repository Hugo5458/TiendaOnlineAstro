import { defineMiddleware } from 'astro:middleware';
import { supabase } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    // Only protect /admin routes (except login)
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
        // Get session from cookies
        const accessToken = context.cookies.get('sb-access-token')?.value;
        const refreshToken = context.cookies.get('sb-refresh-token')?.value;

        if (!accessToken || !refreshToken) {
            // No tokens, redirect to login
            return context.redirect('/admin/login');
        }

        // Verify session with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
            // Invalid session, try to refresh
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
                refresh_token: refreshToken
            });

            if (refreshError || !refreshData.session) {
                // Clear invalid cookies and redirect
                context.cookies.delete('sb-access-token', { path: '/' });
                context.cookies.delete('sb-refresh-token', { path: '/' });
                return context.redirect('/admin/login');
            }

            // Update cookies with new tokens
            context.cookies.set('sb-access-token', refreshData.session.access_token, {
                path: '/',
                httpOnly: true,
                secure: import.meta.env.PROD,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 days
            });
            context.cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
                path: '/',
                httpOnly: true,
                secure: import.meta.env.PROD,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 days
            });
        }
    }

    return next();
});
