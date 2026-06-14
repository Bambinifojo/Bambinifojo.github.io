// Netlify Function: Google Play Store'dan uygulama bilgilerini çek
const { parsePlayStoreHtml, FETCH_HEADERS } = require('../../js/play-store-parser');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const appId = event.queryStringParameters?.appId;
    if (!appId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'App ID gerekli' })
      };
    }

    const playStoreUrl = `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}&hl=tr`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch(playStoreUrl, {
        headers: FETCH_HEADERS,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`Play Store sayfası yüklenemedi: ${response.status}`);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('İstek zaman aşımına uğradı (30 saniye)');
      }
      throw fetchError;
    }

    const html = await response.text();
    const data = parsePlayStoreHtml(html);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Veri çekilemedi: ' + error.message,
        message: 'Lütfen bilgileri manuel olarak girin.'
      })
    };
  }
};
