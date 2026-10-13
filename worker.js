// Cloudflare Worker: keeps your Anthropic API key secret and talks to Claude for StudySpark.
// Settings needed in Cloudflare: secret ANTHROPIC_API_KEY, variable ALLOWED_ORIGIN (e.g. https://YOURNAME.github.io)
export default {
  async fetch(req, env) {
    const allowed = env.ALLOWED_ORIGIN || '';
    const cors = { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || req.headers.get('Origin') !== allowed) return new Response('Not allowed', { status: 403, headers: cors });
    let body;
    try { body = await req.json(); } catch (e) { return new Response('Bad request', { status: 400, headers: cors }); }
    if (typeof body.prompt !== 'string' || body.prompt.length > 30000) return new Response('Bad request', { status: 400, headers: cors });
    const content = [];
    if (body.image && body.image.type === 'image/jpeg' && typeof body.image.data === 'string' && body.image.data.length < 7000000) {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: body.image.data } });
    }
    content.push({ type: 'text', text: body.prompt });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 4000, messages: [{ role: 'user', content }] })
    });
    if (!r.ok) return new Response('AI error', { status: 502, headers: cors });
    const j = await r.json();
    const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    return new Response(JSON.stringify({ text }), { headers: Object.assign({ 'Content-Type': 'application/json' }, cors) });
  }
};
