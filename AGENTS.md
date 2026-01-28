# Repo Agent Instructions

- Code should follow modular design principles as much as possible; different modules should avoid interfering with each other. Any experimental feature should place all its files within a single sub-module and must not generate junk files in larger modules.
- Before building new code, review existing code to reduce redundancy.
- Any new change should remain as simple as possible. Do not add extra branches or unauthorized feature planning.
- Business outcomes come first in any implementation. The top priority is delivering the required functionality, followed by long-term architecture planning, and then keeping the module style concise and efficient.
- Any new code is strictly forbidden from being stored in high-level modules (e.g., the repository root or other high-level module directories). It must be placed in a leaf module directory based on actual usage.
- docs/architecture/repository-structure.md is the repository architecture file. Before each code change, you must review this file to ensure the change follows the repository architecture. After modifications, update this file immediately to keep it consistent with the repository.

When explaining code to the user, always describe it from a business perspective. Even if the user is a developer, treat them as a management leader who only wants to know what the code can do for the business, its advantages, and its disadvantages.

Before performing any code changes, you must align your idea with the user. Only start work after the user confirms the idea is feasible.

Before any file deletion or rollback, you must create a backup.
