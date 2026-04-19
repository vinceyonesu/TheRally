const https = require('https');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    const { prompt, systemPrompt, messages } = JSON.parse(event.body);

    let msgs = [];
    if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
    if (messages && messages.length > 0) {
      messages.forEach(m => msgs.push({ role: m.role, content: m.content }));
    }
    if (prompt) msgs.push({ role: 'user', content: prompt });

    const body = JSON.stringify({
      model: 'meta-llama/llama-3.3-8b-instruct:free',
      messages: msgs,
      max_tokens: 300
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.OPENROUTER_KEY,
          'HTTP-Referer': 'https://therally.netlify.app',
          'X-Title': 'TheRally Tennis',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    const data = JSON.parse(result);
    const text = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : null;

    return { statusCode: 200, headers, body: JSON.stringify({ text }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};