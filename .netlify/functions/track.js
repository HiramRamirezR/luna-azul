exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{}' };

  const { slug, pagina = '/' } = JSON.parse(event.body);
  if (!slug) return { statusCode: 400, headers, body: JSON.stringify({ error: 'slug required' }) };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  await fetch(`${SUPABASE_URL}/rest/v1/pageviews`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ site_slug: slug, pagina }),
  });

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
};
