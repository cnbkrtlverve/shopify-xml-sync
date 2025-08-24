// netlify/functions/xml-proxy.js
exports.handler = async (event, context) => {
  console.log('XML proxy çağrıldı:', event.httpMethod, event.path);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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
    // GET isteği bekliyoruz
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Sadece GET istekleri desteklenir' })
      };
    }

    // URL parametresini al
    const xmlUrl = event.queryStringParameters?.url;
    
    if (!xmlUrl) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'url parametresi gerekli' })
      };
    }

    console.log('XML URL:', xmlUrl);

    // XML kaynağına istek gönder
    const response = await fetch(xmlUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; Netlify-Bot)'
      }
    });

    console.log('XML yanıtı:', response.status, response.statusText);
    
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `XML kaynağından hata: ${response.status}` })
      };
    }

    const xmlContent = await response.text();
    
    console.log('XML içerik uzunluğu:', xmlContent.length);
    
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml'
      },
      body: xmlContent
    };

  } catch (error) {
    console.error('XML proxy hatası:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'XML proxy hatası', 
        message: error.message
      })
    };
  }
};
