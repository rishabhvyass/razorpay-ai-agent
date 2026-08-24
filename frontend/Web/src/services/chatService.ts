/**
 * Chat.
 *
 * `POST /api/chat` DOES NOT EXIST YET. The backend's route index lists it under
 * `notImplementedYet` pending the Claude + MCP layer.
 *
 * This module is the seam. It defines the typed call the UI makes, and routes it
 * to one of two places:
 *
 *   VITE_USE_MOCK=false  ->  the real endpoint. If the backend has not shipped it,
 *                            the caller gets a ROUTE_NOT_FOUND ApiError, which the
 *                            chat UI renders as "this endpoint is not implemented
 *                            yet" - an honest failure, not a fabrication.
 *
 *   VITE_USE_MOCK=true   ->  services/mock/mockAgent, which searches the REAL
 *                            catalogue and returns turns flagged `mock: true`.
 *
 * When the backend ships the endpoint, flipping the flag is the entire migration.
 * Nothing in components/chat knows which side answered.
 */

import { config } from '@/lib/config';
import { ApiError, request } from './api';
import { mockChat } from './mock/mockAgent';
import type { ChatResponse, Product } from '@/types';

export interface SendMessageArgs {
  conversationId: string;
  message: string;
  /**
   * The recommendation currently on screen. Only used by the mock, so that
   * "yes, buy it" can resolve to a real product instead of inventing one. The
   * real endpoint derives this from server-side conversation state and ignores it.
   */
  standingProduct?: Product | null;
  /**
   * What the user actually did, when a CONTROL rather than free text produced this
   * message. Selecting a recommendation sends a sentence ("I'd like to buy the X"),
   * and the mock's intent parser read that as a fresh catalogue search because the
   * product name looked like search terms - so the authorisation card was never
   * reached and the click appeared to do nothing but repeat the recommendation.
   *
   * The click is not ambiguous, so it does not go through a language guess. Only the
   * mock consumes this; the real endpoint derives intent server-side from the model
   * and the conversation row, and ignores it. It is a hint about provenance, never a
   * permission: the buy intent still only produces an authorisation card, and the
   * money action still waits for the explicit approval in that card.
   */
  declaredIntent?: 'buy';
  /**
   * Progress reporting for the UI's loading copy. Only the mock can populate it:
   * `POST /api/chat` is one opaque round trip, so in real mode the phase stays
   * 'thinking' rather than the UI inventing steps it cannot observe.
   */
  onPhase?: (phase: 'thinking' | 'searching-catalogue') => void;
  signal?: AbortSignal;
}

export async function sendMessage(args: SendMessageArgs): Promise<ChatResponse> {
  if (config.useMock) {
    return mockChat({
      message: args.message,
      standingProduct: args.standingProduct ?? null,
      ...(args.declaredIntent ? { declaredIntent: args.declaredIntent } : {}),
      ...(args.onPhase ? { onPhase: args.onPhase } : {}),
    });
  }

  const response = await request<ChatResponse>('/api/chat', {
    method: 'POST',
    body: { conversationId: args.conversationId, message: args.message },
    ...(args.signal ? { signal: args.signal } : {}),
    // The agent turn involves a model call and possibly several tool calls, so it
    // needs a longer budget than a plain CRUD read.
    timeoutMs: 60_000,
  });

  return { ...response, mock: false };
}

/**
 * Whether the chat endpoint is expected to work at all.
 *
 * Used by the chat UI to decide between rendering the composer and rendering a
 * "not implemented" notice, rather than letting the user type into an input whose
 * submit can only ever 404.
 */
export function isChatAvailable(): boolean {
  return config.useMock || !config.isDev;
}

/** True when a failure means "the route isn't built" rather than "it broke". */
export function isNotImplemented(error: unknown): boolean {
  return error instanceof ApiError && error.isNotImplemented;
}
