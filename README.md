# vibe-match

Semantic test matchers powered by LLMs. Test your AI outputs with fuzzy matching that understands meaning, not just exact text.

## Packages

- **[vibe-match](./packages/vibe-match)** - The main library with semantic matchers

## Development

```bash
# Install dependencies
bun install

# Run playground tests with OpenAI
cd playground && bun test

# Run playground tests with different providers
cd playground && VIBE_PROVIDER=anthropic bun test
cd playground && VIBE_PROVIDER=google bun test
cd playground && VIBE_PROVIDER=mistral bun test
cd playground && VIBE_PROVIDER=xai bun test
```

## Supported Providers

vibe-match uses the [Vercel AI SDK](https://sdk.vercel.ai/providers) and supports any compatible provider:

- **OpenAI** (`@ai-sdk/openai`) - Language + Embedding models
- **Anthropic** (`@ai-sdk/anthropic`) - Language models only
- **Google** (`@ai-sdk/google`) - Language + Embedding models
- **Mistral** (`@ai-sdk/mistral`) - Language + Embedding models
- **xAI / Grok** (`@ai-sdk/xai`) - Language models only
- And more...

See the [vibe-match README](./packages/vibe-match/README.md) for full documentation.
