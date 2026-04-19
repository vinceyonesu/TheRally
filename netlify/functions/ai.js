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

    // Build Gemini contents array
    const contents = [];
    if (messages && messages.length > 0) {
      messages.forEach(m => {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        });
      });
    }
    const fullPrompt = systemPrompt ? systemPrompt + '\n\n' + prompt : prompt;
    contents.push({ role: 'user', parts: [{ text: fullPrompt }] });

    const body = JSON.stringify({
      contents: contents,
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 }
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: '/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + process.env.GEMINI_KEY,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    const text = data.candidates && data.candidates[0] && data.candidates[0].content
      ? data.candidates[0].content.parts[0].text
      : (data.error ? data.error.message : null);

    return { statusCode: 200, headers, body: JSON.stringify({ text }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};