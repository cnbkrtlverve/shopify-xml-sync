// netlify/functions/shopify-proxy.js
exports.handler = async (event, context) => {
  console.log('Shopify proxy çağrıldı:', event.httpMethod, event.path);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Shopify-Access-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // POST isteği bekliyoruz
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Sadece POST istekleri desteklenir' })
      };
    }

    // Request body'yi al
    const body = JSON.parse(event.body);
    console.log('İstek body:', body);
    
    if (!body.url) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'URL gerekli' })
      };
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
    
    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: responseText
    };

  } catch (error) {
    console.error('Proxy hatası:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Proxy hatası', 
        message: error.message,
        stack: error.stack
      })
    };
  }
};
