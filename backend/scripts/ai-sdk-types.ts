/**
 * Compile-only compatibility fixture for the two supported agent SDKs.
 *
 * This file intentionally makes no provider request. The regular backend
 * typecheck compiles agentService.ts; these explicit assignments additionally
 * keep the supported runtime constructors and resource-level types visible to
 * the compiler that will be used in a deployment.
 */

import { Anthropic } from '@anthropic-ai/sdk';
import type {
  ContentBlock,
  MessageParam,
  ToolResultBlockParam,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages';
import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const anthropicClient: Anthropic = new Anthropic({ apiKey: 'sk-ant-regression-key' });
const openRouterClient: OpenAI = new OpenAI({
  apiKey: 'sk-or-regression-key',
  baseURL: 'https://openrouter.ai/api/v1',
});

const anthropicMessage: MessageParam = {
  role: 'user',
  content: 'Compatibility check',
};
const anthropicToolUse: ToolUseBlock = {
  type: 'tool_use',
  id: 'toolu_regression',
  caller: { type: 'direct' },
  name: 'compatibility_check',
  input: {},
};
const anthropicContent: ContentBlock[] = [anthropicToolUse];
const anthropicToolResult: ToolResultBlockParam = {
  type: 'tool_result',
  tool_use_id: anthropicToolUse.id,
  content: 'ok',
};
const openAiMessage: ChatCompletionMessageParam = {
  role: 'user',
  content: 'Compatibility check',
};

void anthropicClient;
void openRouterClient;
void anthropicMessage;
void anthropicContent;
void anthropicToolResult;
void openAiMessage;
