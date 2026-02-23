import { SITE_URL } from '../../lib/constants';

export const GET = async () => {
    return new Response(JSON.stringify({
        siteUrlInConstants: SITE_URL,
        envPublicSiteUrl: import.meta.env.PUBLIC_SITE_URL || 'NOT_SET',
        metaEnv: import.meta.env
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};
