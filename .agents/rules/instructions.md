# Agent Instructions & Constraints

## Critical Operational Rules

1. **Deployment Restriction**:
   - **DO NOT** deploy live unless explicitly requested by the user.
   - Never push code (`git push`, deploying to Netlify production, etc.) without direct, explicit confirmation and request from the user.

2. **Strict Scope Enforcement**:
   - **Change ONLY what is requested**: Modify only the specific code, logic, or file explicitly asked for by the user.
   - **No Out-of-Scope Modifications**: Do not add unsolicited redesigns, refactors, extra styles, or changes beyond the user's explicit instruction.
   - Do not modify files unnecessarily.

3. **Rendering & Scenes**:
   - Do not render until explicitly requested.
   - When creating or modifying scenes, strictly follow what is instructed; do not add or animate elements that are not explicitly requested.

4. **Safety & Verification**:
   - Test, validate, and verify changes locally.
   - Keep responses concise, clear, and focused on the requested tasks.
