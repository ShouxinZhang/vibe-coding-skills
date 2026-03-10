import path from "node:path";

import { appendMemory, defaultRunDir, ensureRunLayout, newState, readText, saveState, withStatus, writePlan, writeReviewerMessage, writeWorkerMessage } from "./loop_state.js";
import { runReviewer } from "./reviewer.js";
import { runWorker } from "./codex_worker.js";
import type { LoopConfig } from "./loop_types.js";

function parseArgs(argv: string[]): LoopConfig {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
    if (!part.startsWith("--")) {
      continue;
    }
    const key = part.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`missing value for --${key}`);
    }
    args.set(key, value);
    index += 1;
  }

  const task = args.get("task");
  const workspaceRoot = args.get("workspace-root");
  if (!task) {
    throw new Error("missing required argument: --task");
  }
  if (!workspaceRoot) {
    throw new Error("missing required argument: --workspace-root");
  }

  const maxReworks = Number(args.get("max-reworks") ?? "20");
  if (!Number.isInteger(maxReworks) || maxReworks < 0) {
    throw new Error("--max-reworks must be a non-negative integer");
  }

  return {
    task,
    workspaceRoot: path.resolve(workspaceRoot),
    runDir: path.resolve(args.get("run-dir") ?? defaultRunDir(task)),
    maxReworks,
    workerModel: args.get("worker-model") ?? "gpt-5.4",
    reviewerModel: args.get("reviewer-model") ?? "gpt-5.4",
  };
}

function formatWorkerMessage(iteration: number, messageMarkdown: string): string {
  return `# Worker Iteration ${iteration}\n\n${messageMarkdown.trim()}\n`;
}

function formatReviewerMessage(iteration: number, decision: string, reviewMessageMarkdown: string, workerInstruction: string): string {
  return [
    `# Reviewer Iteration ${iteration}`,
    "",
    `Decision: ${decision}`,
    "",
    reviewMessageMarkdown.trim(),
    "",
    "## Next Worker Instruction",
    workerInstruction.trim(),
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv.slice(2));
  await ensureRunLayout(config);

  let state = newState(config);
  await saveState(config.runDir, state);

  for (let iteration = 1; ; iteration += 1) {
    state = withStatus(
      {
        ...state,
        iteration,
      },
      "worker_running",
    );
    await saveState(config.runDir, state);

    const planMarkdown = await readText(path.join(config.runDir, "plan.md"));
    const memoryMarkdown = await readText(path.join(config.runDir, "memory.md"));

    const workerResult = await runWorker({
      task: config.task,
      workspaceRoot: config.workspaceRoot,
      planMarkdown,
      memoryMarkdown,
      reviewerInstruction: state.reviewerInstruction,
      workerModel: config.workerModel,
      workerThreadId: state.workerThreadId,
    });

    await writePlan(config.runDir, workerResult.planMarkdown);
    const workerMessage = formatWorkerMessage(iteration, workerResult.messageMarkdown);
    const latestWorkerMessagePath = await writeWorkerMessage(config.runDir, iteration, workerMessage);
    await appendMemory(config.runDir, `Worker ${iteration}`, workerMessage);

    state = withStatus(state, "reviewer_running");
    await saveState(config.runDir, state);

    const reviewerResult = await runReviewer({
      task: config.task,
      runDir: config.runDir,
      workspaceRoot: config.workspaceRoot,
      latestWorkerMessagePath,
      reviewerModel: config.reviewerModel,
    });

    const reviewerMessage = formatReviewerMessage(
      iteration,
      reviewerResult.decision,
      reviewerResult.reviewMessageMarkdown,
      reviewerResult.workerInstruction,
    );
    await writeReviewerMessage(config.runDir, iteration, reviewerMessage);
    await appendMemory(config.runDir, `Reviewer ${iteration}`, reviewerMessage);

    state = {
      ...state,
      reviewerInstruction: reviewerResult.workerInstruction,
      workerThreadId: workerResult.threadId,
      reworkCount: reviewerResult.decision === "rework" ? state.reworkCount + 1 : state.reworkCount,
    };

    if (reviewerResult.decision === "approve") {
      state = withStatus(state, "approved");
      await saveState(config.runDir, state);
      break;
    }

    if (state.reworkCount > config.maxReworks) {
      state = withStatus(state, "failed");
      await saveState(config.runDir, state);
      break;
    }

    state = withStatus(state, "plan_ready");
    await saveState(config.runDir, state);
  }

  console.log(
    JSON.stringify(
      {
        status: state.status,
        runDir: config.runDir,
        reworkCount: state.reworkCount,
        maxReworks: config.maxReworks,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
