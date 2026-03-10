import { Codex, type ThreadItem } from "@openai/codex-sdk";
import { z } from "zod";

import type { WorkerResult } from "./loop_types.js";

const workerResultSchema = z.object({
  planMarkdown: z.string().min(1),
  messageMarkdown: z.string().min(1),
  filesTouched: z.array(z.string()).default([]),
  checksRun: z.array(z.string()).default([]),
  openRisks: z.array(z.string()).default([]),
});

const workerOutputSchema = {
  type: "object",
  properties: {
    planMarkdown: { type: "string" },
    messageMarkdown: { type: "string" },
    filesTouched: { type: "array", items: { type: "string" } },
    checksRun: { type: "array", items: { type: "string" } },
    openRisks: { type: "array", items: { type: "string" } },
  },
  required: ["planMarkdown", "messageMarkdown", "filesTouched", "checksRun", "openRisks"],
  additionalProperties: false,
} as const;

type WorkerRunInput = {
  task: string;
  workspaceRoot: string;
  planMarkdown: string;
  memoryMarkdown: string;
  reviewerInstruction: string;
  workerModel: string;
  workerThreadId: string | null;
};

function buildWorkerPrompt(input: WorkerRunInput): string {
  return [
    "You are the implementation worker in a single-thread worker-reviewer loop.",
    "You are running through Codex SDK directly, not through a higher-level agent framework.",
    "Operate inside the provided workspace, make only the smallest viable progress, and do not ask for user confirmation.",
    "This loop is intentionally incremental. You must finish this turn with a JSON answer even if the task is not fully complete.",
    "In this turn, do at most one focused file edit and at most two validation commands.",
    "If the full task is large, create or update an intermediate artifact, record the remaining work in openRisks, and stop.",
    "Treat the memory markdown as the complete durable history for this task.",
    "Update the returned plan markdown so it reflects the current progress after your work.",
    "The worker message must be concise and include business outcome, files touched, checks run, and open risks.",
    "",
    `Task:\n${input.task}`,
    "",
    `Reviewer Instruction:\n${input.reviewerInstruction}`,
    "",
    "Current Plan Markdown:",
    input.planMarkdown,
    "",
    "Full Memory Markdown:",
    input.memoryMarkdown,
    "",
    "Return only JSON that matches the required schema.",
  ].join("\n");
}

function collectItems<T extends ThreadItem["type"]>(items: ThreadItem[], type: T): Extract<ThreadItem, { type: T }>[] {
  return items.filter((item): item is Extract<ThreadItem, { type: T }> => item.type === type);
}

function mergeUnique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export async function runWorker(input: WorkerRunInput): Promise<WorkerResult> {
  const codex = new Codex();
  const thread = input.workerThreadId
    ? codex.resumeThread(input.workerThreadId, {
        model: input.workerModel,
        sandboxMode: "workspace-write",
        workingDirectory: input.workspaceRoot,
        approvalPolicy: "never",
        skipGitRepoCheck: true,
        networkAccessEnabled: false,
        webSearchEnabled: false,
        modelReasoningEffort: "high",
      })
    : codex.startThread({
        model: input.workerModel,
        sandboxMode: "workspace-write",
        workingDirectory: input.workspaceRoot,
        approvalPolicy: "never",
        skipGitRepoCheck: true,
        networkAccessEnabled: false,
        webSearchEnabled: false,
        modelReasoningEffort: "high",
      });

  const turn = await thread.run(buildWorkerPrompt(input), { outputSchema: workerOutputSchema });
  const parsedOutput = workerResultSchema.parse(JSON.parse(turn.finalResponse));

  const fileChanges = collectItems(turn.items, "file_change").flatMap((item) => item.changes.map((change) => change.path));
  const commands = collectItems(turn.items, "command_execution").map((item) => item.command);

  return {
    ...parsedOutput,
    filesTouched: mergeUnique([...parsedOutput.filesTouched, ...fileChanges]),
    checksRun: mergeUnique([...parsedOutput.checksRun, ...commands]),
    threadId: thread.id,
  };
}
