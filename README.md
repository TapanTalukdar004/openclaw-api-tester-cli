# OpenClaw API Tester CLI

A CLI installer that packages an OpenClaw Skill into a globally executable `npx` tool.

## What It Does

This CLI tool installs the **Universal Autonomous API Tester** skill into your OpenClaw workspace (`~/.openclaw/workspace/api-tester-skill`). The skill provides three tools for systematic API testing:

1. **ingest_api** – Compiles an OpenAPI/Swagger spec into a local workspace.
2. **read_docs** – Reads documentation files (e.g., the generated SKILL.md).
3. **execute_test** – Performs HTTP requests and returns structured responses.

The skill follows **Phase 3: Silent Execution** rules: the agent runs tests silently and outputs only a final audit table.

## Installation

### As a Global CLI Tool

```bash
npm install -g openclaw-api-tester-cli
```

Then run:

```bash
openclaw-api-tester
```

### Using `npx` (One‑Time Execution)

```bash
npx openclaw-api-tester-cli
```

## Prerequisites

- Node.js 18 or higher
- OpenClaw installed and initialized (must have `~/.openclaw/workspace` directory)
- Network access to install global npm packages (`openapi-to-skills`, `node-fetch`)

## How It Works

1. The script checks for the existence of `~/.openclaw/workspace`.
2. Creates `api-tester-skill` and `api-tester-skill/tools` directories.
3. Writes four files:
   - `tools/ingest_api.js`
   - `tools/read_docs.js`
   - `tools/execute_test.js`
   - `SKILL.md` (the skill’s operating procedure)
4. Installs `openapi-to-skills` and `node-fetch` globally via `npm install -g`.
5. Prints a success message with instructions to add the skill to your `TOOLS.md`.

## Usage After Installation

Add the following line to your OpenClaw `TOOLS.md`:

```
- **API Tester:** Located at `./api-tester-skill`. Read `./api-tester-skill/SKILL.md` to use.
```

Then, in your OpenClaw agent, you can invoke the skill’s tools as described in `SKILL.md`.

## Skill Operating Procedure

The skill enforces a **silent execution** workflow:

- No intermediate logging or progress output.
- All test results are stored in an internal audit table.
- After all tests complete, the agent outputs a single markdown table with columns:
  - Endpoint, Method, Test Case, Status, Response Time, Error.

See `SKILL.md` for the full specification.

## Development

To modify or extend the CLI:

1. Clone the repository.
2. Edit `index.js` (the main installer logic).
3. Update the tool files in the `templates/` directory (if you want to change the skill’s implementation).
4. Test locally with `node index.js` (ensure you have a mock OpenClaw workspace).
5. Publish updates via `npm version patch` and `npm publish`.

## Author

**Tapan Talukdar**
- Email: tapan.talukdar.cse@gmail.com
- GitHub: [TapanTalukdar004](https://github.com/TapanTalukdar004)

## Repository

- GitHub: https://github.com/TapanTalukdar004/openclaw-api-tester-cli
- Issues: https://github.com/TapanTalukdar004/openclaw-api-tester-cli/issues

## License

MIT License - see [LICENSE](LICENSE) file for details.
