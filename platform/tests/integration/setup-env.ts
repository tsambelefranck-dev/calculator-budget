for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* absent */
  }
}
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.ANTHROPIC_API_KEY = '';
