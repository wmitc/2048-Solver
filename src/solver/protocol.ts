/**
 * Message protocol between the UI and the solver Web Worker.
 *
 * The UI sends an `analyze` request for a board; the worker replies with one
 * `progress` message per search depth (so EV bars visibly settle as the search
 * deepens) and a final `done`. Each reply carries the `requestId` it answers so
 * stale results from a superseded position can be ignored.
 */

import { type Board } from "../engine/board.ts";
import { type SearchResult } from "./expectimax.ts";

export interface AnalyzeRequest {
  type: "analyze";
  requestId: number;
  board: Board;
  /** Optional cap; the worker otherwise picks an adaptive depth. */
  maxDepth?: number;
}

export type WorkerRequest = AnalyzeRequest;

export interface ProgressMessage {
  type: "progress";
  requestId: number;
  /** True on the deepest completed search for this request. */
  final: boolean;
  result: SearchResult;
}

export interface DoneMessage {
  type: "done";
  requestId: number;
}

export type WorkerResponse = ProgressMessage | DoneMessage;
