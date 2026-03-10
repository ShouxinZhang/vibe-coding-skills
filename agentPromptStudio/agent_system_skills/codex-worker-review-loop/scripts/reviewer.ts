import { readFile } from "node:fs/promises";

import { Codex } from "@openai/codex-sdk";
import { z } from "zod";

import { memoryPath, planPath } from "./loop_state.js";
import type { ReviewerResult } from "./loop_types.js";

const reviewerResultSchema = z.object({
  decision: z.enum(["approve", "rework"]),
  reviewMessageMarkdown: z.string().min(1),
  workerInstruction: z.string().min(1),
});

const reviewerOutputSchema = {
  type: "object",
  properties: {
    decision: { type: "string", enum: ["approve", "rework"] },
    reviewMessageMarkdown: { type: "string" },
    workerInstruction: { type: "string" },
  },
  required: ["decision", "reviewMessageMarkdown", "workerInstruction"],
  additionalProperties: false,
} as const;

type ReviewerInput = {
  task: string;
  runDir: string;
  workspaceRoot: string;
  latestWorkerMessagePath: string;
  reviewerModel: string;
};

async function buildReviewerPrompt(input: ReviewerInput): Promise<string> {
  const planMarkdown = await readFile(planPath(input.runDir), "utf-8");
  const latestWorkerMessage = await readFile(input.latestWorkerMessagePath, "utf-8");

  return [
    "You are the reviewer in a single-thread worker-reviewer loop.",
    "You are stateless by default.",
    "Start from the task, current plan, and latest worker message below.",
    "If those are insufficient, you may inspect memory.md or any relevant workspace file on your own before deciding.",
    "Do not assume hidden context that you did not inspect.",
    "Decide quickly. This is a lightweight review pass, not a full rewrite.",
    "Return approve only when the task outcome is good enough to stop now.",
    "Return rework when the worker should continue, and include a direct next instruction.",
    "Keep the review concise and business-focused.",
    "",
    `Task:\n${input.task}`,
    "",
    "Current Plan Markdown:",
    planMarkdown,
    "",
    "Latest Worker Message:",
    latestWorkerMessage,
    "",
    "Optional evidence you may reference in a rework instruction if needed:",
    `- Full memory file: ${memoryPath(input.runDir)}`,
    `- Workspace root: ${input.workspaceRoot}`,
    "",
    "Return only JSON that matches the required schema.",
  ].join("\n");
}

export async function runReviewer(input: ReviewerInput): Promise<ReviewerResult> {
  const codex = new Codex();
  const thread = codex.startThread({
    model: input.reviewerModel,
    sandboxMode: "read-only",
    workingDirectory: input.workspaceRoot,
    approvalPolicy: "never",
    additionalDirectories: [input.runDir],
    skipGitRepoCheck: true,
    networkAccessEnabled: false,
    webSearchEnabled: false,
    modelReasoningEffort: "high",
  });

  const turn = await thread.run(await buildReviewerPrompt(input), { outputSchema: reviewerOutputSchema });
  return reviewerResultSchema.parse(JSON.parse(turn.finalResponse));
}
