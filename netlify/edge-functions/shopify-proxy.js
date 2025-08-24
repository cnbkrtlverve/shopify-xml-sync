// netlify/edge-functions/shopify-proxy.js
export default async (request, context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Access-Token, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const shopifyUrl = url.searchParams.get('shop');
    const endpoint = url.searchParams.get('endpoint');
    const token = request.headers.get('X-Shopify-Access-Token');

    if (!shopifyUrl || !endpoint || !token) {
      return new Response('Missing parameters', { status: 400, headers: corsHeaders });
    }

    const targetUrl = `https://${shopifyUrl}/admin/api/2024-07${endpoint}`;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      },
      body: request.method !== 'GET' ? await request.text() : undefined
    });

    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
};

export const config = {
  path: "/api/shopify-proxy"
};
