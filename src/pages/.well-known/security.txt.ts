import type { APIRoute } from 'astro';

const SECURITY_TXT = `# FashionStore Security Policy
# This file follows the security.txt standard (RFC 9116)
# https://securitytxt.org/

Contact: mailto:hugodelmoral77@gmail.com
Expires: 2027-02-20T00:00:00.000Z
Preferred-Languages: es, en
Canonical: https://fashionstore.es/.well-known/security.txt
Policy: https://fashionstore.es/privacidad
`;

export const GET: APIRoute = () => {
    return new Response(SECURITY_TXT, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
        },
    });
};
