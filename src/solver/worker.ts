/**
 * Solver Web Worker.
 *
 * Runs the search off the main thread so the UI never janks. For each
 * `analyze` request it drives {@link iterativeDeepening}, posting a `progress`
 * message per depth and yielding to the event loop between depths so a newer
 * request (the player moved again) immediately supersedes the current one.
 */

/// <reference lib="webworker" />

import { iterativeDeepening } from "./analyze.ts";
import {
  type AnalyzeRequest,
  type DoneMessage,
  type ProgressMessage,
  type WorkerRequest,
} from "./protocol.ts";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let latestRequestId = 0;

const nextTick = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

async function runAnalysis(request: AnalyzeRequest): Promise<void> {
  const iterator = iterativeDeepening(request.board, {
    ...(request.maxDepth !== undefined ? { maxDepth: request.maxDepth } : {}),
  });

  for (const { result, final } of iterator) {
    // A newer request arrived; abandon this stale one.
    if (request.requestId !== latestRequestId) {
      return;
    }
    const progress: ProgressMessage = {
      type: "progress",
      requestId: request.requestId,
      final,
      result,
    };
    ctx.postMessage(progress);
    await nextTick();
  }

  if (request.requestId === latestRequestId) {
    const done: DoneMessage = { type: "done", requestId: request.requestId };
    ctx.postMessage(done);
  }
}

ctx.onmessage = (event: MessageEvent<WorkerRequest>): void => {
  const request = event.data;
  if (request.type === "analyze") {
    latestRequestId = request.requestId;
    void runAnalysis(request);
  }
};
