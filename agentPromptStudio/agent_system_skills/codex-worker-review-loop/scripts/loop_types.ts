export type LoopStatus =
  | "init"
  | "plan_ready"
  | "worker_running"
  | "reviewer_running"
  | "approved"
  | "failed";

export interface LoopConfig {
  task: string;
  workspaceRoot: string;
  runDir: string;
  maxReworks: number;
  workerModel: string;
  reviewerModel: string;
}

export interface LoopState {
  task: string;
  workspaceRoot: string;
  runDir: string;
  maxReworks: number;
  status: LoopStatus;
  iteration: number;
  reworkCount: number;
  reviewerInstruction: string;
  workerThreadId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerResult {
  planMarkdown: string;
  messageMarkdown: string;
  filesTouched: string[];
  checksRun: string[];
  openRisks: string[];
  threadId: string | null;
}

export interface ReviewerResult {
  decision: "approve" | "rework";
  reviewMessageMarkdown: string;
  workerInstruction: string;
}
