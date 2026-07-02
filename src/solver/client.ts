/**
 * Main-thread client for the solver worker.
 *
 * Wraps the worker in a small request/response API: call {@link analyze} with a
 * board and a callback, and receive streamed {@link SearchResult}s as the
 * search deepens. Each new request supersedes the previous one — late messages
 * from an abandoned position are dropped by matching on `requestId`.
 */

import { type Board } from "../engine/board.ts";
import { type SearchResult } from "./expectimax.ts";
import {
  type AnalyzeRequest,
  type WorkerResponse,
} from "./protocol.ts";

export interface AnalysisUpdate {
  result: SearchResult;
  /** True on the deepest search for this request. */
  final: boolean;
}

export type AnalysisCallback = (update: AnalysisUpdate) => void;

export class SolverClient {
  private readonly worker: Worker;
  private requestId = 0;
  private activeId = 0;
  private callback: AnalysisCallback | null = null;

  constructor() {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.requestId !== this.activeId) {
        return; // stale response from a superseded request
      }
      if (message.type === "progress" && this.callback) {
        this.callback({ result: message.result, final: message.final });
      }
    };
  }

  /** Analyze `board`, streaming results to `onUpdate` until the search finishes. */
  analyze(board: Board, onUpdate: AnalysisCallback, maxDepth?: number): void {
    this.requestId += 1;
    this.activeId = this.requestId;
    this.callback = onUpdate;
    const request: AnalyzeRequest = {
      type: "analyze",
      requestId: this.requestId,
      board,
      ...(maxDepth !== undefined ? { maxDepth } : {}),
    };
    this.worker.postMessage(request);
  }

  dispose(): void {
    this.callback = null;
    this.worker.terminate();
  }
}
