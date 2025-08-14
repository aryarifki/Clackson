// Auth0 route handler (types may vary slightly by version)
import * as auth0 from '@auth0/nextjs-auth0';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler: any = (auth0 as any).handleAuth ? (auth0 as any).handleAuth() : () => new Response('Auth0 not configured', { status: 500 });
export default handler;
