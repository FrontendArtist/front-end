export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertRequiredStrapiEnv } = await import('@/lib/api');
    assertRequiredStrapiEnv();
  }
}
