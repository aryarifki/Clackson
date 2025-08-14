// Deprecated Google OAuth entrypoint. Use Auth0 instead.
export async function GET() {
  return new Response('Google OAuth deprecated. Use /api/auth/login', { status: 410 });
}

