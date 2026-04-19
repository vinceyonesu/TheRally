const https = require('https');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { prompt, systemPrompt, messages } = JSON.parse(event.body);

    // Build messages - merge system prompt into first user message
    let msgs = [];
    if (messages && messages.length > 0) {
      messages.forEach(m => msgs.push({ role: m.role, content: m.content }));
    }
    // Add current message with system context prepended
    const fullPrompt = systemPrompt
      ? systemPrompt + '\n\nUser: ' + prompt
      : prompt;
    msgs.push({ role: 'user', content: fullPrompt });

    const models = [
      'meta-llama/llama-3.3-8b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
      'deepseek/deepseek-r1:free',
      'qwen/qwen-2.5-7b-instruct:free'
    ];

    for (const model of models) {
      const body = JSON.stringify({ model, messages: msgs, max_tokens: 400 });

      const result = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'openrouter.ai',
          path: '/api/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + process.env.OPENROUTER_KEY,
            'HTTP-Referer': 'https://therally.netlify.app',
            'X-Title': 'TheRally',
            'Content-Length': Buffer.byteLength(body)
          }
        }, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });

      const data = JSON.parse(result);
      const text = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content : null;

      if (text) return { statusCode: 200, headers, body: JSON.stringify({ text }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ text: 'I am having trouble connecting right now. Please try again in a moment.' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};