import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

// src/statusline.ts
import fs2 from "node:fs";
import os from "node:os";
import path3 from "node:path";

// src/lib/state.ts
import fs from "node:fs";
import path2 from "node:path";

// src/lib/model.ts
var URGENCY_RANK = { low: 0, normal: 1, high: 2 };

// src/lib/config.ts
import { homedir } from "node:os";
import path from "node:path";
function dataDir() {
  return path.join(process.env.CLAUDE_PLUGIN_DATA ?? path.join(homedir(), ".claude", "collab-channel"), "v1");
}
function sessionsRoot() {
  return path.join(dataDir(), "sessions");
}
function sessionDir(clientSessionId) {
  return path.join(sessionsRoot(), sanitize(clientSessionId));
}
function sanitize(value) {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 80) || "default";
}

// src/lib/state.ts
var EMPTY_STATE = {
  connected: false,
  channel: "",
  self: "",
  handle: "",
  topic: "",
  members: [],
  claims: [],
  contextIndex: [],
  taskLists: [],
  latestSeq: 0,
  updatedAt: 0
};
var EMPTY_CURSOR = { delivered: 0, acked: 0, lastBlockAt: 0 };
function file(clientSessionId, name) {
  return path2.join(sessionDir(clientSessionId), name);
}
function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}
function readInbox(clientSessionId, sinceSeq = 0) {
  let raw;
  try {
    raw = fs.readFileSync(file(clientSessionId, "inbox.jsonl"), "utf8");
  } catch {
    return [];
  }
  const seen = /* @__PURE__ */ new Set();
  const messages = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const message = JSON.parse(line);
      if (message.seq > sinceSeq && !seen.has(message.seq)) {
        seen.add(message.seq);
        messages.push(message);
      }
    } catch {
    }
  }
  return messages.sort((a, b) => a.seq - b.seq);
}
function readCursor(clientSessionId) {
  return { ...EMPTY_CURSOR, ...readJson(file(clientSessionId, "cursor.json"), {}) };
}
function readLocalState(clientSessionId) {
  return { ...EMPTY_STATE, ...readJson(file(clientSessionId, "state.json"), {}) };
}
function unreadMessages(clientSessionId, options = {}) {
  const { delivered } = readCursor(clientSessionId);
  const threshold = URGENCY_RANK[options.minUrgency ?? "low"];
  return readInbox(clientSessionId, delivered).filter((message) => URGENCY_RANK[message.urgency] >= threshold);
}
function flattenForContext(text) {
  return String(text ?? "").replace(/\r?\n|[\u2028\u2029]/g, " \u23CE ").replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ");
}

// src/lib/render.ts
function clip(text, max) {
  const flat = flattenForContext(text);
  return flat.length > max ? `${flat.slice(0, max - 1)}\u2026` : flat;
}
var inProgress = (tasks) => tasks.filter((task) => task.status === "in_progress" && task.holder).sort((a, b) => (b.lastProgress?.at ?? b.holder.since) - (a.lastProgress?.at ?? a.holder.since));
function renderStatusLine(state, unread, ownSession) {
  if (!state.channel) return "";
  const others = state.tasksStale ? [] : inProgress(state.tasks ?? []).filter((task) => !(task.holder.memberId === state.self && task.holder.clientSessionId === ownSession));
  const doing = others.slice(0, 2).map((task) => {
    const who = task.holder.memberId === state.self ? "you" : clip(task.holder.handle || task.holder.name, 20);
    const percent = task.lastProgress?.percent;
    return `${who} ${clip(task.list, 16)}#${task.number}${percent === void 0 ? "" : ` ${percent}%`}`;
  });
  if (others.length > 2) doing.push(`+${others.length - 2}`);
  const parts = [
    ...doing.length > 0 ? [doing.join(", ")] : [],
    ...unread > 0 ? [`${unread} unread`] : [],
    ...state.connected ? [] : ["offline"]
  ];
  return `collab ${state.connected ? "\u25CF" : "\u25CB"}${parts.length > 0 ? ` ${parts.join(" \xB7 ")}` : ""}`;
}

// src/statusline.ts
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}
function dataRootFor(clientSessionId) {
  const pluginData = path3.join(os.homedir(), ".claude", "plugins", "data");
  let installed = [];
  try {
    installed = fs2.readdirSync(pluginData).filter((name) => name.startsWith("collab-channel")).map((name) => path3.join(pluginData, name));
  } catch {
  }
  const candidates = [process.env.CLAUDE_PLUGIN_DATA, ...installed].filter((dir) => Boolean(dir));
  return candidates.find((dir) => fs2.existsSync(path3.join(dir, "v1", "sessions", clientSessionId, "state.json")));
}
async function main() {
  const { session_id: id } = await readStdin();
  if (typeof id !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(id)) return;
  const root = dataRootFor(id);
  if (!root) return;
  process.env.CLAUDE_PLUGIN_DATA = root;
  const line = renderStatusLine(readLocalState(id), unreadMessages(id).length, id);
  if (line) process.stdout.write(`${line}
`);
}
main().catch(() => void 0);
