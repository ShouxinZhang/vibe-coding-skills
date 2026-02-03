# Repository Structure

This document defines the high-level repository layout and placement rules for new work.

## Top-level
- AGENTS.md: Contributor and agent rules.
- .gitignore: Git ignore rules for dependencies, builds, and local files.
- README.md: Repository overview and core value statements.
- README.zh-CN.md: Chinese repository overview and core value statements.
- LICENSE: License.
- BasicKnowledge/: Foundational notes and references.
- ExamplesStudio/: Small, focused examples and experiments.
- MyThought/: Personal essays and reflections.
- Problems/: Problem statements and notes.
- docs/architecture/: Architecture documentation.

## Placement Rules
- **No new code at repository root.**
- New experiments must be placed in a **leaf module** under the most relevant top-level area.
- Examples and experiments go under **ExamplesStudio/**.
- **ExamplesStudio/BrowserAutomation/**: Browser automation examples (userscripts, extensions, etc.).
- **ExamplesStudio/BrowserAutomation/TampermonkeySidebarMarkdownExporter/**: Export docs sidebar-linked pages into Markdown (ZIP).
- Architecture and design documents go under **docs/architecture/**.
- Keep modules isolated; avoid cross-module dependencies unless necessary.
