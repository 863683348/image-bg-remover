/**
 * Cloudflare Pages Function
 * 代理 Remove.bg API，保护 API Key 安全
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request, env } = context;

  // CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const apiKey = env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // 验证文件是图片
    if (!image.type?.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'File must be an image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // 限制图片大小 (25MB)
    if (image.size > 25 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Image too large (max 25MB)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const apiFormData = new FormData();
    apiFormData.append('image_file', image, image.name || 'image');

    const apiResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: apiFormData,
    });

    // API 错误处理
    if (!apiResponse.ok) {
      let errorDetail = 'Unknown error';
      try {
        const errJson = await apiResponse.json();
        errorDetail = errJson.errors?.[0]?.title || JSON.stringify(errJson);
      } catch {
        errorDetail = await apiResponse.text();
      }

      return new Response(JSON.stringify({
        error: `Remove.bg API error (${apiResponse.status})`,
        detail: errorDetail,
      }), {
        status: apiResponse.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    return new Response(apiResponse.body, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'inline; filename="removed-background.png"',
        ...CORS_HEADERS,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
