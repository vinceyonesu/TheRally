exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { prompt, systemPrompt, messages } = JSON.parse(event.body);

    // Build messages array
    let msgs = [];
    if (systemPrompt) {
      msgs.push({ role: 'system', content: systemPrompt });
    }
    if (messages && messages.length > 0) {
      msgs = msgs.concat(messages);
    }
    if (prompt) {
      msgs.push({ role: 'user', content: prompt });
    }

    // Call OpenRouter with key stored in Netlify env variable
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENROUTER_KEY,
        'HTTP-Referer': 'https://courtside.netlify.app',
        'X-Title': 'CourtSide Tennis'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-8b-instruct:free',
        messages: msgs
      })
    });

    const data = await response.json();
    const text = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : null;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
