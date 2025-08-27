function exportRequest(req, options = {}) {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const user = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
  const promptParts = [];
  if (system) promptParts.push(system);
  if (user) promptParts.push(user);
  const prompt = promptParts.join('\n\n');

  const body = {
    model: options.model || req.body?.model,
    prompt,
    max_tokens: req.body?.max_tokens ?? options.max_tokens ?? 256,
    temperature: req.body?.temperature ?? options.temperature ?? 0,
    top_p: req.body?.top_p ?? options.top_p ?? 1,
    stop: req.body?.stop ?? options.stop,
    n: 1
  };

  req.method = 'POST';
  req.url = options.endpoint || req.url;
  req.headers = Object.assign({}, req.headers, {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${options.apiKey}`
  });
  req.body = body;
  return req;
}

function exportResponse(resp, options = {}) {
  if (!resp) {
    return { error: { message: 'Empty response from Codex CLI' } };
  }
  if (resp.error) {
    return { error: resp.error };
  }
  const text = resp.choices && resp.choices[0] ? resp.choices[0].text : '';
  const usage = resp.usage || {
    prompt_tokens: resp.prompt_tokens || 0,
    completion_tokens: resp.completion_tokens || 0,
    total_tokens: resp.total_tokens || 0
  };
  return {
    id: resp.id || 'codex-cli',
    object: 'chat.completion',
    created: resp.created || Math.floor(Date.now() / 1000),
    model: resp.model || options.model || 'code-davinci-002',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: resp.choices && resp.choices[0] ? resp.choices[0].finish_reason : null
      }
    ],
    usage
  };
}

class CodexCLITransformer {
  constructor(options = {}) {
    this.options = options;
    this.name = 'codex-cli';
  }
  exportRequest(req) {
    return exportRequest(req, this.options);
  }
  exportResponse(resp) {
    return exportResponse(resp, this.options);
  }
}

module.exports = CodexCLITransformer;
module.exports.exportRequest = exportRequest;
module.exports.exportResponse = exportResponse;
