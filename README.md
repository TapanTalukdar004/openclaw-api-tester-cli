# OpenClaw API Tester CLI

[![npm version](https://img.shields.io/npm/v/openclaw-api-tester-cli.svg)](https://www.npmjs.com/package/openclaw-api-tester-cli)
[![npm downloads](https://img.shields.io/npm/dm/openclaw-api-tester-cli.svg)](https://www.npmjs.com/package/openclaw-api-tester-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A **Universal Global Installer** that packages an OpenClaw Skill into a globally executable tool compatible with Windows, macOS, Linux, Docker, WSL, and VPS environments.

> **Published on npm**: `openclaw-api-tester-cli@1.1.0`

## 🚀 Universal Compatibility

The installer is engineered for true cross‑platform operation:

- **Windows**: Detects `APPDATA`, `LOCALAPPDATA`, and user home directories
- **macOS/Linux**: Uses standard `~/.openclaw` with fallback discovery
- **Docker/VPS**: Auto‑detects workspace in current directory and environment variables
- **WSL**: Handles Windows‑Linux path translation and mount points
- **Permission‑aware**: Validates write access and suggests fixes

## What It Does

This CLI tool installs the **Stateful QA Engine - API Tester** skill into your OpenClaw workspace using intelligent discovery. The skill provides five tools for systematic, stateful API testing:

1. **ingest_api** – Compiles an OpenAPI/Swagger spec into a local workspace.
2. **read_docs** – Reads documentation files (e.g., the generated SKILL.md).
3. **state_manager** – Persistent session state management with `saveVariable()`, `getVariable()`, and `clearState()`.
4. **execute_test** – Performs HTTP requests with variable substitution, 202 polling, and async handling.
5. **SKILL.md** – Complete Stateful QA Engine workflow with mandatory execution gates.

The skill follows **Phase 3: Stateful Execution** rules: the agent runs tests with memory persistence, dependency mapping, and outputs only a final audit table.

## 🏗️ Stateful QA Engine Architecture

### **Core Innovations:**
- **Memory Injection**: Eliminates "Brute-Force" errors with persistent `session_state.json`
- **Dependency Mapping**: Mandatory producer-consumer linking before execution
- **415 Guardrail**: Verifies `consumes` type before POST/PUT requests
- **Stop-on-Failure**: Halts test sequences when producer endpoints fail (≥400)
- **Variable Substitution**: Automatic `{{VARIABLE_NAME}}` pattern replacement in URLs/payloads

### **Enterprise Expansion Pack:**
- **Async Handling**: 202 Accepted polling with 3 attempts and 2-second delays
- **Dynamic Auth-Flow**: Authentication endpoint prioritization and token storage
- **Recursive Pagination**: Comprehensive pagination parameter testing
- **Ephemeral Cleanup**: Zero-Knowledge persistence with automatic `session_state.json` deletion

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
   - Writes five files:
     - `tools/ingest_api.js` – Compile OpenAPI specs
     - `tools/read_docs.js` – Read documentation files
     - `tools/state_manager.js` – Persistent session state management
     - `tools/execute_test.js` – Perform HTTP requests with variable substitution and 202 polling
     - `SKILL.md` – Complete Stateful QA Engine operating procedure

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

The skill enforces a **stateful execution** workflow:

### **MANDATORY WORKFLOW:**
1. **Phase 1: Memory Injection** – Use `state_manager.js` for all data persistence
2. **Phase 2: Dependency Mapping** – Generate producer-consumer mapping table
3. **Phase 2.5: Authentication Flow** – Prioritize auth endpoints and store tokens
4. **Phase 2.6: Pagination Testing** – Test list endpoints with query parameters
5. **Phase 3: Stateful Execution** – Execute tests with variable substitution
6. **Phase 4: Execution Gate** – Output pre-execution table before running tests
7. **Phase 5: Ephemeral Cleanup** – Delete `session_state.json` after completion

### **Key Features:**
- **Variable Substitution**: `http://api.example.com/pets/{{saved_pet_id}}`
- **202 Polling**: Automatic async handling with configurable retries
- **415 Prevention**: Schema-based `Content-Type` validation
- **Stop-on-Failure**: Intelligent test sequence management
- **Zero-Knowledge Persistence**: No test data remains after session

## Development

The installer is built with modular, cross‑platform architecture:

### Core Modules:
1. **Path Handler** (`getPlatformInfo()`, `getSystemDefaultOpenClawDir()`)
   - Platform‑aware path resolution
2. **Workspace Discovery** (`discoverOpenClawWorkspace()`)
   - Recursive search with priority system
3. **Permission Validator** (`validateWritePermissions()`, `handlePermissionError()`)
   - User‑friendly permission error handling
4. **Dependency Installer** (`installDependenciesSafely()`)
   - Local npm installation with safety checks
5. **Skill File Generator** (`createSkillFiles()`)
   - Generates complete Stateful QA Engine with all enterprise features

### Testing

```bash
# Run syntax check
node --check index.js

# Create test installation
mkdir test_install && cd test_install && node ../index.js
```

## Version History

### v1.1.0 (Current) - Enterprise Stateful QA Engine
- **Complete Enterprise Expansion**: Full async handling, dynamic auth flow, pagination testing
- **Production-Ready Architecture**: Stateful execution with memory persistence
- **Enhanced Security**: Zero-Knowledge persistence with automatic cleanup
- **Robust Error Handling**: 202 polling with configurable retries, stop-on-failure logic
- **Comprehensive Documentation**: Updated README and SKILL.md with enterprise workflows

### v1.0.1 - Stateful QA Engine Beta
- **Deep-Core Refactor**: Transformed from "Passive Installer" to "Stateful QA Engine"
- **Memory Injection**: Added `state_manager.js` with persistent session state
- **Enterprise Expansion Pack**: 202 polling, dynamic auth flow, pagination testing
- **Ephemeral Cleanup Protocol**: Zero-Knowledge persistence with automatic cleanup
- **Dependency Mapping**: Mandatory producer-consumer linking
- **415 Guardrail**: Schema-based content type validation

### v1.0.0 - Initial Release
- Universal cross-platform installer
- Basic API testing tools (ingest_api, read_docs, execute_test)
- Silent execution workflow

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © Tapan Talukdar. See [LICENSE](LICENSE) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/TapanTalukdar004/openclaw-api-tester-cli/issues)
- **Email**: tapan.talukdar.cse@gmail.com
- **Documentation**: [GitHub Wiki](https://github.com/TapanTalukdar004/openclaw-api-tester-cli/wiki)
