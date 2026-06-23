exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{}' };

  const { slug, message, history = [] } = JSON.parse(event.body);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  // Verificar estado del sitio
  const siteResp = await fetch(`${SUPABASE_URL}/rest/v1/sites?slug=eq.${slug}&select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  const sites = siteResp.ok ? await siteResp.json() : [];
  const site = sites?.[0];

  if (!site || !site.chatbot_activo) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: `\uD83D\uDC4B \u00a1Hola! Soy el asistente virtual de ${site?.cliente_nombre || 'este sitio'}.<br><br>\u2713 Respondo dudas al instante<br>\u2713 Ayudo a agendar citas 24/7<br>\u2713 Doy confianza a tus clientes<br><br>\u00bfQuieres activarme?<br><br><a href="https://wa.me/522221033301?text=Quiero%20activar%20el%20chatbot" target="_blank" class="chatbot-whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> Activar con mi asesor</a>`,
        placeholder: true,
      }),
    };
  }

  // Verificar GROQ_API_KEY
  if (!process.env.GROQ_API_KEY) {
    const siteName = site?.cliente_nombre || 'SITE_NAME';
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: `\uD83D\uDC4B \u00a1Hola! Soy el asistente virtual de ${siteName}.<br><br>\u2713 Respondo dudas al instante<br>\u2713 Ayudo a agendar citas 24/7<br>\u2713 Doy confianza a tus clientes<br><br>\u00bfQuieres activarme?<br><br><a href="https://wa.me/522221033301?text=Quiero%20activar%20el%20chatbot" target="_blank" class="chatbot-whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> Activar con mi asesor</a>`,
        placeholder: true,
      }),
    };
  }

  // Llama a Groq
  // ======================================================
  // BOT PROMPT — edita esto para personalizar el chatbot
  // ======================================================
  const systemPrompt = `Eres el asistente virtual de ${site.cliente_nombre} en ${site.city}. Ayudas a pacientes con informacion sobre servicios, horarios, precios y agendar citas. Responde en espanol, se amable y profesional.`;
  // ======================================================

  const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  const data = await groqResp.json();
  const reply = data.choices?.[0]?.message?.content || 'Lo siento, intenta de nuevo.';

  // Registrar interacción en Supabase
  const sesionId = event.headers['x-session-id'] || `anon-${Date.now()}`;

  // Intentar upsert: primero buscar si existe la sesión
  const existingResp = await fetch(`${SUPABASE_URL}/rest/v1/chat_interactions?sesion_id=eq.${sesionId}&site_slug=eq.${slug}&select=id`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  const existing = existingResp.ok ? await existingResp.json() : [];

  if (existing.length > 0) {
    await fetch(`${SUPABASE_URL}/rest/v1/chat_interactions?sesion_id=eq.${sesionId}&site_slug=eq.${slug}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ultima_interaccion: new Date().toISOString(),
      }),
    });
  } else {
    await fetch(`${SUPABASE_URL}/rest/v1/chat_interactions`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_slug: slug,
        sesion_id: sesionId,
        ultima_interaccion: new Date().toISOString(),
      }),
    });
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ reply }),
  };
};
