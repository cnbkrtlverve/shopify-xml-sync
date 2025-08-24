export default async (request, context) => {
  console.log('Shopify proxy çağrıldı:', request.method, request.url);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Shopify-Access-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    // POST isteği bekliyoruz
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Sadece POST istekleri desteklenir' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Request body'yi al
    const body = await request.json();
    console.log('İstek body:', body);
    
    if (!body.url) {
      return new Response(JSON.stringify({ error: 'URL gerekli' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Shopify isteği için headers hazırla
    const fetchHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Headers'ı birleştir
    if (body.headers) {
      Object.assign(fetchHeaders, body.headers);
    }

    // Shopify API'ye istek gönder
    const fetchOptions = {
      method: body.method || 'GET',
      headers: fetchHeaders
    };

    if (body.body && (body.method === 'POST' || body.method === 'PUT')) {
      fetchOptions.body = body.body;
    }

    console.log('Shopify\'a istek gönderiliyor:', body.url, fetchOptions);

    const response = await fetch(body.url, fetchOptions);
    
    console.log('Shopify yanıtı:', response.status, response.statusText);
    
    const responseText = await response.text();
    
    return new Response(responseText, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Proxy hatası:', error);
    return new Response(JSON.stringify({ 
      error: 'Proxy hatası', 
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
