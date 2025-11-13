export async function callHuggingFace(prompt: string) {
  const HF_API_KEY = process.env.HF_API_KEY || process.env.HF_TOKEN;
  if (!HF_API_KEY) throw new Error('Missing HF_API_KEY (or HF_TOKEN) env var');

  // If a full router URL is provided (e.g. local TGI or deployed HF endpoint), prefer it.
  // Expect HF_ROUTER_URL to be something like "http://localhost:8080/v1" or
  // "https://router.huggingface.co/v1". When present, call the OpenAI-compatible
  // chat completions endpoint: `${HF_ROUTER_URL}/chat/completions`.
  const routerUrl = process.env.HF_ROUTER_URL?.replace(/\/$/, '');
  const modelId = process.env.HF_MODEL_ID || 'moonshotai/Kimi-K2-Thinking';

  if (routerUrl) {
    const url = `${routerUrl}/chat/completions`;
    const body = {
      model: modelId,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 512
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Hugging Face router error ${res.status}: ${txt}`);
    }

    const json = await res.json();
    // OpenAI-compatible chat/completions returns choices[].message.content
    const content = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.message;
    if (typeof content === 'string') return content;
    if (content && typeof content === 'object' && 'content' in content) return content.content;
    return JSON.stringify(json);
  }

  // Fallback to hf-inference router style
  const url = 'https://router.huggingface.co/hf-inference';
  const body = {
    model: modelId,
    inputs: prompt,
    parameters: { max_new_tokens: 512, temperature: 0.2 }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Hugging Face inference error ${res.status}: ${txt}`);
  }

  const data: any = await res.json();
  // HF Inference for text generation returns an array or object depending on model
  // Try to extract text in common shapes
  if (Array.isArray(data) && data.length > 0 && typeof data[0].generated_text === 'string') {
    return data[0].generated_text;
  }
  if (data && typeof data === 'object' && 'generated_text' in data && typeof data.generated_text === 'string') {
    return data.generated_text;
  }
  if (Array.isArray(data) && data.length > 0 && typeof data[0].text === 'string') {
    return data[0].text;
  }
  if (data?.outputs && Array.isArray(data.outputs) && data.outputs[0].text) {
    return data.outputs[0].text;
  }

  // Fallback: stringify
  return JSON.stringify(data);
}
