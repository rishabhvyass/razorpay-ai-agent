/**
 * Runtime compatibility smoke test. Constructs both supported client forms but
 * never calls a provider, so this validates imports and configuration shape without
 * requiring credentials or changing external state.
 */

process.env.SUPABASE_URL = 'https://placeholder-project.supabase.co';
process.env.SUPABASE_ANON_KEY = 'placeholder-anon-key-0000000000000000';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role-key-000000';
process.env.OPENAI_API_KEY = 'openai-regression-key-0000';
process.env.OPENAI_MODEL = 'gpt-5-mini';
process.env.NODE_ENV = 'test';

const { Anthropic } = await import('@anthropic-ai/sdk');
const { OpenAI } = await import('openai');
const agentService = await import('../dist/services/agentService.js');

const anthropic = new Anthropic({ apiKey: 'sk-ant-regression-key' });
const openRouter = new OpenAI({
  apiKey: 'sk-or-regression-key',
  baseURL: 'https://openrouter.ai/api/v1',
});

if (!(anthropic instanceof Anthropic)) throw new Error('Anthropic client did not initialize');
if (!(openRouter instanceof OpenAI)) throw new Error('OpenAI/OpenRouter client did not initialize');
if (typeof agentService.chat !== 'function') throw new Error('agentService did not compile/export chat');

console.log('AI SDK compatibility smoke passed: Claude, OpenRouter-compatible OpenAI, agentService');
