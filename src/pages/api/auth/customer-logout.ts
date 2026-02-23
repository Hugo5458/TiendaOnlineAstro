import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
    // Get the access token before deleting cookies
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    // Sign out from Supabase server-side to invalidate the session/refresh token
    try {
        if (accessToken) {
            // Set the session so we can sign out properly
            await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
            });
        }
        await supabase.auth.signOut();
    } catch (e) {
        // Ignore errors - we still want to clear cookies
        console.error('Supabase signOut error:', e);
    }

    // Clear session cookies via Astro API
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });

    // Also set manual expired cookies as fallback to guarantee deletion
    const expiredCookie = 'Max-Age=0; Path=/; HttpOnly; SameSite=Strict';
    const headers = new Headers({
        'Content-Type': 'application/json',
    });
    headers.append('Set-Cookie', `sb-access-token=; ${expiredCookie}`);
    headers.append('Set-Cookie', `sb-refresh-token=; ${expiredCookie}`);

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers,
    });
};
