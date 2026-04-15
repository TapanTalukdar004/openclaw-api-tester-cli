# OpenClaw API Tester CLI

[![npm version](https://img.shields.io/npm/v/openclaw-api-tester-cli.svg)](https://www.npmjs.com/package/openclaw-api-tester-cli)
[![npm downloads](https://img.shields.io/npm/dm/openclaw-api-tester-cli.svg)](https://www.npmjs.com/package/openclaw-api-tester-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A **Universal Global Installer** that packages an OpenClaw Skill into a globally executable tool compatible with Windows, macOS, Linux, Docker, WSL, and VPS environments.

> **Published on npm**: `openclaw-api-tester-cli@1.0.0`

## 🚀 Universal Compatibility

The installer is engineered for true cross‑platform operation:

- **Windows**: Detects `APPDATA`, `LOCALAPPDATA`, and user home directories
- **macOS/Linux**: Uses standard `~/.openclaw` with fallback discovery
- **Docker/VPS**: Auto‑detects workspace in current directory and environment variables
- **WSL**: Handles Windows‑Linux path translation and mount points
- **Permission‑aware**: Validates write access and suggests fixes

## What It Does

This CLI tool installs the **Universal Autonomous API Tester** skill into your OpenClaw workspace using intelligent discovery. The skill provides three tools for systematic API testing:

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

- **Node.js 18 or higher**
- **OpenClaw** installed and initialized (workspace directory can be anywhere)
- **Network access** for downloading dependencies (optional, with local fallback)

## How It Works: Intelligent Installation

1. **Workspace Discovery** (prioritized):
   - Command‑line argument: `openclaw-api-tester /custom/path`
   - Environment variables: `OPENCLAW_HOME` or `OPENCLAW_WORKSPACE`
   - Current directory scan (for Docker/VPS)
   - System defaults: `~/.openclaw/workspace` (Linux/macOS) or `%APPDATA%/openclaw/workspace` (Windows)

2. **Permission Validation**:
   - Checks write access to target directory
   - Suggests `sudo` or alternative paths if permission denied

3. **Skill Installation**:
   - Creates `api-tester-skill` and `api-tester-skill/tools` directories
   - Writes four files:
     - `tools/ingest_api.js` – Compile OpenAPI specs
     - `tools/read_docs.js` – Read documentation files
     - `tools/execute_test.js` – Perform HTTP requests (with **local** `node-fetch`)
     - `SKILL.md` – Complete operating procedure

4. **Dependency Safety**:
   - Installs `node-fetch` **locally** inside the skill folder (no global pollution)
   - Checks for `openapi-to-skills` availability (uses `npx` when needed)
   - Works offline if dependencies are pre‑installed

5. **Success Guidance**:
   - Prints installation location and next steps
   - Provides line to add to your OpenClaw `TOOLS.md`

## Usage Examples

### Basic Installation
```bash
# Install globally
npm install -g openclaw-api-tester-cli

# Run the installer (auto‑discovers workspace)
openclaw-api-tester
```

### Custom Workspace Location
```bash
# Specify workspace path directly
openclaw-api-tester /path/to/my/openclaw/workspace

# Using environment variable
export OPENCLAW_HOME=/custom/path
openclaw-api-tester
```

### Docker / VPS Installation
```bash
# Inside container or remote server
cd /app
npx openclaw-api-tester-cli
# The installer will scan current directory for .openclaw/
```

### Windows Installation
```bash
# PowerShell or CMD
npm install -g openclaw-api-tester-cli
openclaw-api-tester
# Automatically detects APPDATA or user profile
```

## Usage After Installation

Add the following line to your OpenClaw `TOOLS.md`:

```
- **API Tester:** Located at `./api-tester-skill`. Read `./api-tester-skill/SKILL.md` to use.
```

Then, in your OpenClaw agent, you can invoke the skill's tools as described in `SKILL.md`.

## Skill Operating Procedure

The skill enforces a **silent execution** workflow:

- No intermediate logging or progress output.
- All test results are stored in an internal audit table.
- After all tests complete, the agent outputs a single markdown table with columns:
  - Endpoint, Method, Test Case, Status, Response Time, Error.

See `SKILL.md` for the full specification.

## Development

The installer is built with modular, cross‑platform architecture:

### Core Modules:
1. **Path Handler** (`getPlatformInfo()`, `getSystemDefaultOpenClawDir()`)
   - Platform‑aware path resolution
   - Windows drive detection and Unix path normalization

2. **Workspace Discoverer** (`discoverOpenClawWorkspace()`)
   - Prioritized discovery: CLI args → env vars → directory scan → system defaults
   - Handles Docker, VPS, and custom mount points

3. **Permission Validator** (`validateWritePermissions()`, `handlePermissionError()`)
   - Checks write access before installation
   - Provides actionable error messages

4. **Dependency Manager** (`installDependenciesSafely()`)
   - Local installation to avoid global pollution
   - Fallback to manual instructions if package manager missing

### To Modify:
1. Clone the repository.
2. Edit `index.js` – the refactored code is well‑documented.
3. Update tool files directly in the `createSkillFiles()` function.
4. Test with `node index.js` (no mock workspace needed – uses discovery).
5. Publish updates: `npm version patch && npm publish`.

## Author

**Tapan Talukdar**
- Email: tapan.talukdar.cse@gmail.com
- GitHub: [TapanTalukdar004](https://github.com/TapanTalukdar004)

## Repository

- GitHub: https://github.com/TapanTalukdar004/openclaw-api-tester-cli
- Issues: https://github.com/TapanTalukdar004/openclaw-api-tester-cli/issues

## License

MIT License - see [LICENSE](LICENSE) file for details.
