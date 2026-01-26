import type { APIRoute } from 'astro';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    const accessToken = cookies.get('sb-access-token')?.value;

    if (!accessToken) {
        return new Response(JSON.stringify({
            success: false,
            error: 'No autorizado. Por favor, inicia sesión.'
        }), { status: 401 });
    }

    if (!isSupabaseConfigured()) {
        // Demo mode
        return new Response(JSON.stringify({
            success: true,
            message: 'Contraseña actualizada correctamente (Modo Demo)'
        }), { status: 200 });
    }

    try {
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Debes proporcionar la contraseña actual y la nueva'
            }), { status: 400 });
        }

        if (newPassword.length < 6) {
            return new Response(JSON.stringify({
                success: false,
                error: 'La nueva contraseña debe tener al menos 6 caracteres'
            }), { status: 400 });
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

        if (userError || !user) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Sesión inválida. Por favor, vuelve a iniciar sesión.'
            }), { status: 401 });
        }

        // Verify current password by trying to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email!,
            password: currentPassword
        });

        if (signInError) {
            return new Response(JSON.stringify({
                success: false,
                error: 'La contraseña actual es incorrecta'
            }), { status: 400 });
        }

        // Update password
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (updateError) {
            throw updateError;
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Contraseña actualizada correctamente'
        }), { status: 200 });

    } catch (error: any) {
        console.error('Password change error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Error al cambiar la contraseña'
        }), { status: 500 });
    }
};
