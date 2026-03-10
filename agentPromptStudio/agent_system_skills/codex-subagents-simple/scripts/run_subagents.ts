import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Codex, type ThreadItem, type ModelReasoningEffort } from "@openai/codex-sdk";
import { z } from "zod";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(SCRIPT_DIR, "..");

const subagentSchema = z.object({
  name: z.string().min(1),
  mission: z.string().min(1),
  ownedPaths: z.array(z.string().min(1)).min(1),
  readFiles: z.array(z.string().min(1)).default([]),
  extraInstructions: z.array(z.string().min(1)).default([]),
});

const specSchema = z.object({
  task: z.string().min(1),
  acceptanceCriteria: z.array(z.string().min(1)).min(1),
  sharedContextFiles: z.array(z.string().min(1)).default([]),
  subagents: z.array(subagentSchema).min(1),
});

const subagentOutputSchema = {
  type: "object",
  properties: {
    summaryMarkdown: { type: "string" },
    filesTouched: { type: "array", items: { type: "string" } },
    checksRun: { type: "array", items: { type: "string" } },
    openRisks: { type: "array", items: { type: "string" } },
  },
  required: ["summaryMarkdown", "filesTouched", "checksRun", "openRisks"],
  additionalProperties: false,
} as const;

const subagentResultSchema = z.object({
  summaryMarkdown: z.string().min(1),
  filesTouched: z.array(z.string()).default([]),
  checksRun: z.array(z.string()).default([]),
  openRisks: z.array(z.string()).default([]),
});

type ParsedArgs = {
  specPath: string;
  workspaceRoot: string;
  runDir: string;
  model: string;
  reasoningEffort: ModelReasoningEffort;
  maxParallel: number;
};

type SubagentSpec = z.infer<typeof subagentSchema>;
type RunSpec = z.infer<typeof specSchema>;
type SubagentRunResult = z.infer<typeof subagentResultSchema> & {
  name: string;
  mission: string;
  ownedPaths: string[];
  readFiles: string[];
  extraInstructions: string[];
  boundaryViolations: string[];
  threadId: string | null;
};

function parseArgs(argv: string[]): ParsedArgs {
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

  const specPath = args.get("spec");
  const workspaceRoot = args.get("workspace-root");
  if (!specPath) {
    throw new Error("missing required argument: --spec");
  }
  if (!workspaceRoot) {
    throw new Error("missing required argument: --workspace-root");
  }

  const reasoningEffort = (args.get("reasoning-effort") ?? "high") as ModelReasoningEffort;
  if (!["minimal", "low", "medium", "high", "xhigh"].includes(reasoningEffort)) {
    throw new Error("invalid --reasoning-effort");
  }

  const maxParallel = Number(args.get("max-parallel") ?? "0");
  if (!Number.isInteger(maxParallel) || maxParallel < 0) {
    throw new Error("--max-parallel must be a non-negative integer");
  }

  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);

  return {
    specPath: path.resolve(specPath),
    workspaceRoot: resolvedWorkspaceRoot,
    runDir: path.resolve(args.get("run-dir") ?? defaultRunDir(resolvedWorkspaceRoot, specPath)),
    model: args.get("model") ?? "gpt-5.4",
    reasoningEffort,
    maxParallel,
  };
}

function defaultRunDir(workspaceRoot: string, specPath: string): string {
  const timestamp = new Date().toISOString().replaceAll(":", "").replaceAll(".", "");
  const slug = path.basename(specPath, path.extname(specPath)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "subagents";
  return path.join(workspaceRoot, ".agent_cache", "codex-subagents-simple", `${timestamp}-${slug}`);
}

function toPosix(value: string): string {
  return value.split(path.sep).join(path.posix.sep);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function relativeToWorkspace(workspaceRoot: string, targetPath: string): string {
  const relative = path.relative(workspaceRoot, targetPath);
  return toPosix(relative || ".");
}

function ensureInsideWorkspace(workspaceRoot: string, candidate: string): string {
  const resolved = path.resolve(workspaceRoot, candidate);
  if (resolved !== workspaceRoot && !resolved.startsWith(workspaceRoot + path.sep)) {
    throw new Error(`path is outside workspace: ${candidate}`);
  }
  return resolved;
}

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "subagent";
}

async function ensureRunLayout(runDir: string): Promise<void> {
  await mkdir(runDir, { recursive: true });
  await mkdir(path.join(runDir, "agents"), { recursive: true });
}

async function readSpec(specPath: string): Promise<RunSpec> {
  const raw = await readFile(specPath, "utf-8");
  return specSchema.parse(JSON.parse(raw));
}

function normalizeSpec(spec: RunSpec, workspaceRoot: string): RunSpec {
  return {
    ...spec,
    sharedContextFiles: spec.sharedContextFiles.map((filePath) => relativeToWorkspace(workspaceRoot, ensureInsideWorkspace(workspaceRoot, filePath))),
    subagents: spec.subagents.map((subagent) => ({
      ...subagent,
      ownedPaths: subagent.ownedPaths.map((ownedPath) => relativeToWorkspace(workspaceRoot, ensureInsideWorkspace(workspaceRoot, ownedPath))),
      readFiles: subagent.readFiles.map((filePath) => relativeToWorkspace(workspaceRoot, ensureInsideWorkspace(workspaceRoot, filePath))),
    })),
  };
}

function buildPrompt(spec: RunSpec, subagent: SubagentSpec): string {
  const sharedContext = spec.sharedContextFiles.length > 0 ? spec.sharedContextFiles.map((filePath) => `- ${filePath}`).join("\n") : "- None";
  const readFiles = subagent.readFiles.length > 0 ? subagent.readFiles.map((filePath) => `- ${filePath}`).join("\n") : "- None";
  const ownedPaths = subagent.ownedPaths.map((ownedPath) => `- ${ownedPath}`).join("\n");
  const extraInstructions = subagent.extraInstructions.length > 0 ? subagent.extraInstructions.map((line) => `- ${line}`).join("\n") : "- None";
  const acceptanceCriteria = spec.acceptanceCriteria.map((line) => `- ${line}`).join("\n");

  return [
    "You are a Codex subagent launched by a primary agent.",
    "You have been assigned a scoped subtask with explicit owned paths.",
    "You are allowed to use danger-full-access, but you should only modify files inside your owned paths unless the primary agent explicitly told you otherwise.",
    "Read the listed files first, perform the task, run the smallest relevant checks, and stop without asking the user for confirmation.",
    "Return only JSON that matches the required schema.",
    "",
    `Global Task:\n${spec.task}`,
    "",
    `Subagent Name:\n${subagent.name}`,
    "",
    `Subagent Mission:\n${subagent.mission}`,
    "",
    "Acceptance Criteria:",
    acceptanceCriteria,
    "",
    "Shared Context Files:",
    sharedContext,
    "",
    "Read These Files First:",
    readFiles,
    "",
    "Owned Paths You May Modify:",
    ownedPaths,
    "",
    "Extra Instructions:",
    extraInstructions,
    "",
    "Your response must include:",
    "- summaryMarkdown: concise business-focused result",
    "- filesTouched: files you believe you changed or created",
    "- checksRun: checks or commands you ran",
    "- openRisks: anything incomplete, uncertain, or risky",
  ].join("\n");
}

function collectItems<T extends ThreadItem["type"]>(items: ThreadItem[], type: T): Extract<ThreadItem, { type: T }>[] {
  return items.filter((item): item is Extract<ThreadItem, { type: T }> => item.type === type);
}

function normalizeReportedPath(workspaceRoot: string, reportedPath: string): string {
  const absolute = path.isAbsolute(reportedPath) ? reportedPath : path.resolve(workspaceRoot, reportedPath);
  return relativeToWorkspace(workspaceRoot, absolute);
}

function isOwnedPath(filePath: string, ownedPaths: string[]): boolean {
  return ownedPaths.some((ownedPath) => filePath === ownedPath || filePath.startsWith(ownedPath + "/"));
}

async function runOneSubagent(spec: RunSpec, subagent: SubagentSpec, args: ParsedArgs): Promise<SubagentRunResult> {
  const codex = new Codex();
  const thread = codex.startThread({
    model: args.model,
    sandboxMode: "danger-full-access",
    workingDirectory: args.workspaceRoot,
    approvalPolicy: "never",
    modelReasoningEffort: args.reasoningEffort,
    networkAccessEnabled: true,
  });

  const turn = await thread.run(buildPrompt(spec, subagent), { outputSchema: subagentOutputSchema });
  const parsed = subagentResultSchema.parse(JSON.parse(turn.finalResponse));

  const filesFromTooling = collectItems(turn.items, "file_change").flatMap((item) => item.changes.map((change) => normalizeReportedPath(args.workspaceRoot, change.path)));
  const commands = collectItems(turn.items, "command_execution").map((item) => item.command);
  const filesTouched = unique([...parsed.filesTouched.map((filePath) => normalizeReportedPath(args.workspaceRoot, filePath)), ...filesFromTooling]);
  const checksRun = unique([...parsed.checksRun, ...commands]);
  const boundaryViolations = filesTouched.filter((filePath) => !isOwnedPath(filePath, subagent.ownedPaths));
  const openRisks = unique([
    ...parsed.openRisks,
    ...boundaryViolations.map((filePath) => `Boundary violation: ${filePath} is outside ownedPaths`),
  ]);

  return {
    ...parsed,
    name: subagent.name,
    mission: subagent.mission,
    ownedPaths: subagent.ownedPaths,
    readFiles: subagent.readFiles,
    extraInstructions: subagent.extraInstructions,
    filesTouched,
    checksRun,
    openRisks,
    boundaryViolations,
    threadId: thread.id,
  };
}

async function runWithLimit<T>(values: T[], limit: number, worker: (value: T, index: number) => Promise<void>): Promise<void> {
  const concurrency = limit > 0 ? limit : values.length;
  let nextIndex = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, values.length)) }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= values.length) {
        return;
      }
      await worker(values[currentIndex], currentIndex);
    }
  });
  await Promise.all(runners);
}

async function writeAgentResult(runDir: string, result: SubagentRunResult): Promise<void> {
  const outputPath = path.join(runDir, "agents", `${sanitizeName(result.name)}.json`);
  await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
}

function buildSummary(spec: RunSpec, results: SubagentRunResult[]): string {
  const lines = [
    "# Subagent Summary",
    "",
    "## Task",
    spec.task,
    "",
    "## Acceptance Criteria",
    ...spec.acceptanceCriteria.map((line) => `- ${line}`),
    "",
  ];

  for (const result of results) {
    lines.push(`## ${result.name}`);
    lines.push(`Mission: ${result.mission}`);
    lines.push("");
    lines.push(result.summaryMarkdown.trim());
    lines.push("");
    lines.push("Files Touched:");
    lines.push(...(result.filesTouched.length > 0 ? result.filesTouched.map((line) => `- ${line}`) : ["- None"]));
    lines.push("");
    lines.push("Checks Run:");
    lines.push(...(result.checksRun.length > 0 ? result.checksRun.map((line) => `- ${line}`) : ["- None"]));
    lines.push("");
    lines.push("Open Risks:");
    lines.push(...(result.openRisks.length > 0 ? result.openRisks.map((line) => `- ${line}`) : ["- None"]));
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await ensureRunLayout(args.runDir);

  const rawSpec = await readSpec(args.specPath);
  const spec = normalizeSpec(rawSpec, args.workspaceRoot);
  await writeFile(path.join(args.runDir, "spec.normalized.json"), JSON.stringify(spec, null, 2) + "\n", "utf-8");

  const results: SubagentRunResult[] = new Array(spec.subagents.length);
  await runWithLimit(spec.subagents, args.maxParallel, async (subagent, index) => {
    const result = await runOneSubagent(spec, subagent, args);
    results[index] = result;
    await writeAgentResult(args.runDir, result);
  });

  const summary = buildSummary(spec, results);
  await writeFile(path.join(args.runDir, "summary.md"), summary, "utf-8");

  const boundaryViolations = results.flatMap((result) => result.boundaryViolations.map((filePath) => `${result.name}: ${filePath}`));
  const status = boundaryViolations.length > 0 ? "completed_with_boundary_violations" : "completed";

  console.log(
    JSON.stringify(
      {
        status,
        runDir: args.runDir,
        subagents: results.map((result) => ({
          name: result.name,
          filesTouched: result.filesTouched,
          checksRun: result.checksRun,
          openRisks: result.openRisks,
          boundaryViolations: result.boundaryViolations,
        })),
      },
      null,
      2,
    ),
  );

  if (boundaryViolations.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
