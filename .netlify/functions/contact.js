exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{}' };

  const { slug, nombre, telefono, email, mensaje } = JSON.parse(event.body);
  if (!slug || !nombre) return { statusCode: 400, headers, body: JSON.stringify({ error: 'slug and nombre required' }) };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  // Guardar lead en Supabase
  await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_slug: slug,
      nombre, telefono, email, mensaje,
      fuente: 'formulario',
    }),
  });

  // Obtener info del sitio para Discord
  const siteResp = await fetch(`${SUPABASE_URL}/rest/v1/sites?slug=eq.${slug}&select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (siteResp.ok) {
    const sites = await siteResp.json();
    const site = sites?.[0];
    const sitioNombre = site?.cliente_nombre || slug;

    // Enviar a Discord solo si hay webhook configurado
    if (process.env.DISCORD_WEBHOOK_URL) {
      const discordMsg = {
        embeds: [{
          title: `📩 Nuevo lead - ${sitioNombre}`,
          color: 0x10b981,
          fields: [
            { name: 'Nombre', value: nombre, inline: true },
            { name: 'Telefono', value: telefono || 'N/A', inline: true },
            { name: 'Email', value: email || 'N/A', inline: true },
            { name: 'Mensaje', value: mensaje || 'Sin mensaje' },
            { name: 'Sitio', value: `https://${slug}.netlify.app` },
          ],
          timestamp: new Date().toISOString(),
        }],
      };

      fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordMsg),
      }).catch(() => {});
    }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
};
