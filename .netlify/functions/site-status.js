exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const slug = event.queryStringParameters?.slug;
  if (!slug) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'slug required' }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/sites?slug=eq.${slug}&select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!resp.ok) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'site not found' }) };
  }

  const sites = await resp.json();
  if (!sites.length) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'site not found' }) };
  }

  const site = sites[0];

  const diasTranscurridos = Math.floor(
    (Date.now() - new Date(site.creado_en).getTime()) / (1000 * 60 * 60 * 24)
  );
  const diasRestantes = Math.max(0, site.dias_prueba - diasTranscurridos);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      chatbot_activo: site.chatbot_activo,
      dias_restantes: diasRestantes,
      plan: site.plan,
    }),
  };
};
