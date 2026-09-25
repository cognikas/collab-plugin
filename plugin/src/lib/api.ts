import type { DescMethodUnary } from '@bufbuild/protobuf';
import {
  ChannelService, create, decode, encode, ErrorCode, ErrorDetailSchema, formatVersion, HEADER_CLIENT_SESSION,
  HEADER_MEMBER_ID, HEADER_MEMBER_SECRET, HEADER_PROTOCOL, HEADER_TOPIC, MembershipService, PROTOCOL, rpcPath,
  WebSocketService, type ChannelState, type ClientFrame, type IssueTicketResponse, type JoinResponse,
  type MessageInitShape, type MessageShape, type Result, type SendRequest, type SendResponse,
} from '@collab/protocol';
import type { Credentials } from './config.js';

/**
 * The HTTP binding (collab-protocol/bindings/http.md): every unary call is
 * `POST /collab.v1.<Service>/<Method>` with protobuf JSON. The daemon uses it to
 * join, to get WebSocket tickets, and whenever the socket is down.
 */

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: ErrorCode, message: string) {
    super(`${ErrorCode[code] ?? 'INTERNAL'}: ${message}`);
  }
}

/** Errors that no retry can fix: the daemon stops reconnecting on these. */
export function isFatal(code: ErrorCode): boolean {
  return code === ErrorCode.UNSUPPORTED_PROTOCOL || code === ErrorCode.REVOKED;
}

/** One request case of a ClientFrame. */
export type ChannelRequest = ClientFrame['request'];

type Unary = DescMethodUnary;

async function call<M extends Unary>(
  endpoint: string,
  method: M,
  input: MessageInitShape<M['input']>,
  headers: Record<string, string> = {},
): Promise<MessageShape<M['output']>> {
  const res = await fetch(`${endpoint}${rpcPath(method)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [HEADER_PROTOCOL]: formatVersion(PROTOCOL), ...headers },
    body: encode(method.input, create(method.input, input)),
    signal: AbortSignal.timeout(15_000),
  });

  const text = await res.text();
  if (!res.ok) {
    let code = ErrorCode.INTERNAL;
    let message = res.statusText || `HTTP ${res.status}`;
    try {
      const detail = decode(ErrorDetailSchema, text);
      // A code this build does not know reads as unset: treat it as internal.
      if (detail.code !== ErrorCode.UNSPECIFIED) code = detail.code;
      if (detail.message) message = detail.message;
    } catch {
      if (text) message = text.slice(0, 300);
    }
    throw new ApiError(res.status, code, message);
  }
  return decode(method.output, text || '{}') as MessageShape<M['output']>;
}

/** The Claude Code session making a call, and its topic. The socket carries these in its ticket. */
export interface Origin {
  topic: string;
  clientSessionId: string;
}

function memberHeaders(creds: Credentials, origin: Origin): Record<string, string> {
  return {
    [HEADER_MEMBER_ID]: creds.memberId,
    [HEADER_MEMBER_SECRET]: creds.secret,
    [HEADER_TOPIC]: origin.topic,
    [HEADER_CLIENT_SESSION]: origin.clientSessionId,
  };
}

/** Redeems a one-shot invite. This is the only call that returns a secret. */
export function join(apiEndpoint: string, invite: string, displayName: string): Promise<JoinResponse> {
  return call(apiEndpoint, MembershipService.method.join, { invite, displayName });
}

/** Short-lived credential for the socket; the long-lived secret never hits a URL. */
export function issueTicket(creds: Credentials, origin: Origin): Promise<IssueTicketResponse> {
  return call(creds.apiEndpoint, WebSocketService.method.issueTicket, {}, memberHeaders(creds, origin));
}

/** Degraded mode: everything the socket would have pushed, pulled on demand. */
export async function fetchState(creds: Credentials, origin: Origin, since?: number): Promise<ChannelState> {
  const response = await call(creds.apiEndpoint, ChannelService.method.getState,
    since === undefined ? {} : { since }, memberHeaders(creds, origin));
  if (!response.state) throw new ApiError(500, ErrorCode.INTERNAL, 'GetState returned no state');
  return response.state;
}

export function sendViaHttp(creds: Credentials, origin: Origin, request: SendRequest): Promise<SendResponse> {
  return call(creds.apiEndpoint, ChannelService.method.send, request, memberHeaders(creds, origin));
}

export async function ackViaHttp(creds: Credentials, origin: Origin, cursor: number): Promise<void> {
  await call(creds.apiEndpoint, ChannelService.method.ack, { cursor }, memberHeaders(creds, origin));
}

/**
 * Any unary ChannelService call the socket would carry, over HTTP instead, with
 * its response in the same shape a WebSocket `result` has. Used when the socket
 * is down, and for frames too big for API Gateway's 128 KB WebSocket limit.
 */
export async function channelViaHttp(
  creds: Credentials,
  origin: Origin,
  request: Exclude<ChannelRequest, { case: 'subscribe' | undefined }>,
): Promise<Result['response']> {
  const headers = memberHeaders(creds, origin);
  const endpoint = creds.apiEndpoint;
  const m = ChannelService.method;
  switch (request.case) {
    case 'send': return { case: 'send', value: await call(endpoint, m.send, request.value, headers) };
    case 'ack': return { case: 'ack', value: await call(endpoint, m.ack, request.value, headers) };
    case 'claim': return { case: 'claim', value: await call(endpoint, m.claim, request.value, headers) };
    case 'release': return { case: 'release', value: await call(endpoint, m.release, request.value, headers) };
    case 'putContext': return { case: 'putContext', value: await call(endpoint, m.putContext, request.value, headers) };
    case 'getContext': return { case: 'getContext', value: await call(endpoint, m.getContext, request.value, headers) };
    case 'setPresence': return { case: 'setPresence', value: await call(endpoint, m.setPresence, request.value, headers) };
    case 'history': return { case: 'history', value: await call(endpoint, m.history, request.value, headers) };
    case 'heartbeat': return { case: 'heartbeat', value: await call(endpoint, m.heartbeat, request.value, headers) };
  }
}
