import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { LoopConfig, LoopState, LoopStatus } from "./loop_types.js";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(SKILL_ROOT, "..", "..", "..", "..");
const CACHE_ROOT = path.join(REPO_ROOT, ".agent_cache", "codex-worker-review-loop");

export function skillRoot(): string {
  return SKILL_ROOT;
}

export function cacheRoot(): string {
  return CACHE_ROOT;
}

export function defaultRunDir(task: string): string {
  const timestamp = new Date().toISOString().replaceAll(":", "").replaceAll(".", "");
  const slug = task
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "task";
  return path.join(CACHE_ROOT, `${timestamp}-${slug}`);
}

export function messagesDir(runDir: string): string {
  return path.join(runDir, "messages");
}

export function planPath(runDir: string): string {
  return path.join(runDir, "plan.md");
}

export function memoryPath(runDir: string): string {
  return path.join(runDir, "memory.md");
}

export function statePath(runDir: string): string {
  return path.join(runDir, "state.json");
}

export function workerMessagePath(runDir: string, iteration: number): string {
  return path.join(messagesDir(runDir), `worker-${String(iteration).padStart(2, "0")}.md`);
}

export function reviewerMessagePath(runDir: string, iteration: number): string {
  return path.join(messagesDir(runDir), `reviewer-${String(iteration).padStart(2, "0")}.md`);
}

export async function ensureRunLayout(config: LoopConfig): Promise<void> {
  await mkdir(config.runDir, { recursive: true });
  await mkdir(messagesDir(config.runDir), { recursive: true });

  const initialPlan = [
    "# Objective",
    config.task,
    "",
    "# Plan",
    "- [ ] Understand the task and constraints",
    "- [ ] Implement the smallest viable change",
    "- [ ] Validate the result",
    "- [ ] Obtain reviewer approval",
    "",
    "# Latest Status",
    "Initialized. No worker output yet.",
    "",
  ].join("\n");

  const initialMemory = [
    "# Memory",
    "",
    "## Session",
    `- Task: ${config.task}`,
    `- Workspace Root: ${config.workspaceRoot}`,
    `- Max Reworks: ${config.maxReworks}`,
    `- Worker Model: ${config.workerModel}`,
    `- Reviewer Model: ${config.reviewerModel}`,
    "",
  ].join("\n");

  await writeFile(planPath(config.runDir), initialPlan, { encoding: "utf-8", flag: "wx" }).catch(async () => {
    const current = await readFile(planPath(config.runDir), "utf-8");
    if (!current.trim()) {
      await writeFile(planPath(config.runDir), initialPlan, "utf-8");
    }
  });

  await writeFile(memoryPath(config.runDir), initialMemory, { encoding: "utf-8", flag: "wx" }).catch(async () => {
    const current = await readFile(memoryPath(config.runDir), "utf-8");
    if (!current.trim()) {
      await writeFile(memoryPath(config.runDir), initialMemory, "utf-8");
    }
  });
}

export async function readText(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}

export async function writePlan(runDir: string, markdown: string): Promise<void> {
  await writeFile(planPath(runDir), markdown.trimEnd() + "\n", "utf-8");
}

export async function writeWorkerMessage(runDir: string, iteration: number, markdown: string): Promise<string> {
  const filePath = workerMessagePath(runDir, iteration);
  await writeFile(filePath, markdown.trimEnd() + "\n", "utf-8");
  return filePath;
}

export async function writeReviewerMessage(runDir: string, iteration: number, markdown: string): Promise<string> {
  const filePath = reviewerMessagePath(runDir, iteration);
  await writeFile(filePath, markdown.trimEnd() + "\n", "utf-8");
  return filePath;
}

export async function appendMemory(runDir: string, heading: string, markdown: string): Promise<void> {
  const current = await readText(memoryPath(runDir));
  const next = `${current.trimEnd()}\n\n## ${heading}\n\n${markdown.trimEnd()}\n`;
  await writeFile(memoryPath(runDir), next, "utf-8");
}

export async function saveState(runDir: string, state: LoopState): Promise<void> {
  await writeFile(statePath(runDir), JSON.stringify(state, null, 2) + "\n", "utf-8");
}

export function newState(config: LoopConfig): LoopState {
  const now = new Date().toISOString();
  return {
    task: config.task,
    workspaceRoot: config.workspaceRoot,
    runDir: config.runDir,
    maxReworks: config.maxReworks,
    status: "init",
    iteration: 0,
    reworkCount: 0,
    reviewerInstruction: "Start by understanding the task, then produce the smallest viable implementation.",
    workerThreadId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function withStatus(state: LoopState, status: LoopStatus): LoopState {
  return {
    ...state,
    status,
    updatedAt: new Date().toISOString(),
  };
}

export function resolveReadablePath(baseDir: string, candidate: string, workspaceRoot: string): string {
  const roots = [path.resolve(baseDir), path.resolve(workspaceRoot)];
  const resolved = path.resolve(candidate);
  if (!roots.some((root) => resolved === root || resolved.startsWith(root + path.sep))) {
    throw new Error(`path is outside allowed roots: ${candidate}`);
  }
  return resolved;
}
