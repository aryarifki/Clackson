// Deprecated custom login route. Use Auth0 /api/auth/login instead.
export async function POST() { return new Response('Deprecated', { status: 410 }); }
export async function DELETE() { return new Response('Deprecated', { status: 410 }); }
