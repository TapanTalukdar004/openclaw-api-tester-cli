#!/usr/bin/env node

import { homedir, platform } from 'os';
import { join, resolve, normalize, dirname, sep } from 'path';
import { 
  mkdirSync, 
  writeFileSync, 
  existsSync, 
  accessSync, 
  constants 
} from 'fs';
import { execSync } from 'child_process';

/**
 * Universal Global Installer for OpenClaw API Tester Skill
 * 
 * Features:
 * 1. Cross-platform path handling (Windows, macOS, Linux, Docker, WSL, VPS)
 * 2. Recursive workspace discovery with priority system
 * 3. Permission validation before installation
 * 4. Dependency safety with local installation
 * 5. Graceful error handling with actionable suggestions
 */

// ============================================================================
// 1. CROSS-PLATFORM PATH HANDLING SYSTEM
// ============================================================================

/**
 * Detect the operating system and return appropriate path strategies
 */
function getPlatformInfo() {
  const osPlatform = platform();
  const isWindows = osPlatform === 'win32';
  const isMac = osPlatform === 'darwin';
  const isLinux = osPlatform === 'linux';
  
  return {
    platform: osPlatform,
    isWindows,
    isMac,
    isLinux,
    pathSeparator: sep
  };
}

/**
 * Get system-specific default OpenClaw directory
 */
function getSystemDefaultOpenClawDir() {
  const { isWindows } = getPlatformInfo();
  const home = homedir();
  
  if (isWindows) {
    // Windows: Try APPDATA first, then LOCALAPPDATA, then home directory
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || join(home, 'AppData', 'Local');
    
    // Priority: APPDATA > LOCALAPPDATA > home directory
    const candidates = [
      join(appData, 'openclaw'),
      join(localAppData, 'openclaw'),
      join(home, '.openclaw')
    ];
    
    // Return the first candidate that exists, or the first one as default
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    return candidates[0]; // Default to APPDATA location
  }
  
  // Unix-like systems (Linux, macOS, WSL, Docker)
  return join(home, '.openclaw');
}

// ============================================================================
// 2. RECURSIVE WORKSPACE DISCOVERY
// ============================================================================

/**
 * Find OpenClaw workspace using prioritized discovery
 * @returns {string} Path to OpenClaw workspace
 */
function discoverOpenClawWorkspace() {
  const discoveryPriority = [
    // 1. Command-line argument (manual override)
    () => process.argv[2] ? resolve(process.argv[2]) : null,
    
    // 2. Environment variables
    () => process.env.OPENCLAW_HOME ? resolve(process.env.OPENCLAW_HOME) : null,
    () => process.env.OPENCLAW_WORKSPACE ? resolve(process.env.OPENCLAW_WORKSPACE) : null,
    
    // 3. Current working directory check (for VPS, Docker, custom mounts)
    () => {
      const cwd = process.cwd();
      const candidates = [
        join(cwd, '.openclaw', 'workspace'),
        join(cwd, 'openclaw', 'workspace'),
        join(cwd, 'workspace', '.openclaw'),
        cwd // The directory itself might be the workspace
      ];
      
      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          return candidate;
        }
      }
      return null;
    },
    
    // 4. System defaults with workspace subdirectory
    () => {
      const baseDir = getSystemDefaultOpenClawDir();
      const workspacePath = join(baseDir, 'workspace');
      return workspacePath;
    }
  ];
  
  // Execute discovery in priority order
  for (const discoverFn of discoveryPriority) {
    try {
      const result = discoverFn();
      if (result && existsSync(result)) {
        console.log(`✓ Discovered OpenClaw workspace at: ${result}`);
        return normalize(result);
      }
    } catch (error) {
      // Continue to next discovery method
      continue;
    }
  }
  
  // No workspace found
  return null;
}

// ============================================================================
// 3. VALIDATION & PERMISSION CHECKING
// ============================================================================

/**
 * Validate write permissions for target directory
 * @param {string} targetDir - Directory to check
 * @returns {boolean} True if writable, false otherwise
 */
function validateWritePermissions(targetDir) {
  try {
    // Check if directory exists, create if it doesn't
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    
    // Test write permission
    accessSync(targetDir, constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Handle permission errors with actionable suggestions
 * @param {string} targetDir - Target directory that failed permission check
 */
function handlePermissionError(targetDir) {
  const { isWindows } = getPlatformInfo();
  
  console.error('\n❌ PERMISSION DENIED');
  console.error(`Cannot write to directory: ${targetDir}`);
  console.error('\nPossible solutions:');
  
  if (!isWindows) {
    console.error('1. Run with elevated privileges:');
    console.error(`   sudo ${process.argv.join(' ')}`);
    console.error('\n2. Change ownership of the directory:');
    console.error(`   sudo chown -R $USER "${targetDir}"`);
  }
  
  console.error('\n3. Specify a different directory with write access:');
  console.error(`   ${process.argv[1]} /path/to/writable/directory`);
  
  console.error('\n4. Set OPENCLAW_HOME environment variable:');
  console.error(`   export OPENCLAW_HOME="${homedir()}/my-openclaw"`);
  console.error(`   ${process.argv[1]}`);
  
  process.exit(1);
}

// ============================================================================
// 4. DEPENDENCY SAFETY
// ============================================================================

/**
 * Check if package manager is available
 * @param {string} manager - 'npm' or 'yarn'
 * @returns {boolean} True if available
 */
function isPackageManagerAvailable(manager) {
  try {
    execSync(`${manager} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Install dependencies locally within skill folder
 * @param {string} targetDir - Target directory for skill
 */
function installDependenciesSafely(targetDir) {
  const toolsDir = join(targetDir, 'tools');
  const packageJsonPath = join(toolsDir, 'package.json');
  
  // Create package.json for local dependencies
  const packageJson = {
    name: 'openclaw-api-tester-tools',
    version: '1.0.0',
    type: 'module',
    dependencies: {
      'node-fetch': '^3.3.2'
    },
    private: true
  };
  
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log('Installing dependencies locally...');
  
  // Check for package manager
  const useNpm = isPackageManagerAvailable('npm');
  const useYarn = !useNpm && isPackageManagerAvailable('yarn');
  
  if (!useNpm && !useYarn) {
    console.warn('⚠️  No package manager (npm or yarn) found. Dependencies must be installed manually.');
    console.warn('   Run the following in the skill directory:');
    console.warn(`   cd "${toolsDir}" && npm install node-fetch`);
    return;
  }
  
  try {
    const command = useNpm ? 'npm install' : 'yarn install';
    execSync(command, { 
      cwd: toolsDir, 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('✓ Dependencies installed locally');
  } catch (error) {
    console.warn('⚠️  Failed to install dependencies locally. Manual installation required.');
    console.warn(`   Please run "npm install" in: ${toolsDir}`);
  }
}

// ============================================================================
// 5. SKILL FILES CREATION
// ============================================================================

/**
 * Create the skill files in the target directory
 * @param {string} targetDir - Target directory for skill
 */
function createSkillFiles(targetDir) {
  const toolsDir = join(targetDir, 'tools');
  
  // Create directories
  mkdirSync(toolsDir, { recursive: true });
  
  console.log(`Installing API Tester Skill to ${targetDir}...`);
  
  // File 1: tools/ingest_api.js
  writeFileSync(join(toolsDir, 'ingest_api.js'), `import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

export async function run({ swagger_url }) {
    const outputDir = './api_workspace';
    try {
        await execPromise(\`npx openapi-to-skills "\${swagger_url}" -o \${outputDir} --force\`);
        return \`SUCCESS: Compiled to \${outputDir}. Read \${outputDir}/SKILL.md next.\`;
    } catch (error) { 
        return \`ERROR: \${error.message}\`; 
    }
}
`);

  // File 2: tools/read_docs.js
  writeFileSync(join(toolsDir, 'read_docs.js'), `import fs from 'fs';
import path from 'path';

export async function run({ file_path }) {
    try {
        const safePath = path.resolve(file_path);
        return fs.readFileSync(safePath, 'utf-8');
    } catch (error) { 
        return \`ERROR: \${error.message}\`; 
    }
}
`);

  // File 3: tools/execute_test.js
  writeFileSync(join(toolsDir, 'execute_test.js'), `import fetch from 'node-fetch';

export async function run({ url, method, headers = {}, payload = null }) {
    try {
        const options = { 
            method: method.toUpperCase(), 
            headers: { 
                'Content-Type': 'application/json', 
                ...headers 
            } 
        };
        
        if (payload && (options.method === 'POST' || options.method === 'PUT')) { 
            options.body = JSON.stringify(payload); 
        }
        
        const response = await fetch(url, options);
        const bodyText = await response.text();
        
        return JSON.stringify({ 
            status: response.status, 
            ok: response.ok, 
            body: bodyText.substring(0, 1000) 
        });
    } catch (error) { 
        return \`EXECUTION ERROR: \${error.message}\`; 
    }
}
`);

  // File 4: SKILL.md (same content as before)
  writeFileSync(join(targetDir, 'SKILL.md'), `# Universal Autonomous API Tester

## Purpose
This skill enables an agent to test any REST API systematically, using a three‑phase approach that ensures thoroughness, safety, and actionable reporting.

## Operating Procedure (Phase 3: Silent Execution)

### 1. Initialization
- Read the API specification (OpenAPI/Swagger) via **ingest_api** tool.
- Parse the SKILL.md generated by openapi‑to‑skills to understand endpoints, parameters, and expected behaviors.
- Build a test matrix covering all endpoints with varied payloads (valid, edge‑case, invalid).

### 2. Silent Execution & Selective Authentication Rules
- **The Auth Token:** Assume you have been provided a standard test token (e.g., \`Bearer TEST_TOKEN_123\`).
- **Safe Endpoints (GET, POST, PUT, PATCH):** If the API schema requires authentication, you MUST include the \`Authorization\` header in your \`execute_test\` request.
- **Destructive Endpoints (DELETE):** You MUST NOT send the \`Authorization\` header. Test these unauthenticated to verify the server's security. If the server returns a \`401 Unauthorized\` or \`403 Forbidden\`, mark this test as a **PASS** in your audit table, because the security is working correctly.
- **No intermediate output:** The agent must not log, print, or stream any test-step details or progress.
- **Execute sequentially:** Run each test case, capture results into the audit table, and proceed.

### 3. Final Audit Table
After all tests complete, the agent must output **exactly one** structured markdown table summarizing the entire test run.

**Format:**
| Endpoint | Method | Test Case | Status | Response Time (ms) | Error |
|----------|--------|-----------|--------|-------------------|-------|
| /users   | GET    | Valid request | PASS  | 145 | – |
| /users   | POST   | Missing required field | FAIL | 89 | "400 Bad Request" |

### 4. Post‑Execution
- If any critical failures (e.g., 5xx errors, authentication broken) are detected, append a brief recommendation section after the table.
- Do not add any extra commentary, summaries, or logs beyond the table and the optional recommendation.

## Tools

### ingest_api
- **Input:** { "swagger_url": "http://example.com/openapi.json" }
- **Action:** Downloads and compiles the OpenAPI spec into a local api_workspace directory.
- **Output:** Success message or error.

### read_docs
- **Input:** { "file_path": "./api_workspace/SKILL.md" }
- **Action:** Reads the content of a documentation file.
- **Output:** File content as string or error.

### execute_test
- **Input:** { "url": "http://api.example.com/users", "method": "GET", "headers": {}, "payload": null }
- **Action:** Performs an HTTP request and returns the response.
- **Output:** JSON string with status, ok, and truncated body.

## Usage Example
\`\`\`javascript
// Agent internal flow
1. await ingest_api({ swagger_url: "https://petstore.swagger.io/v2/swagger.json" });
2. const docs = await read_docs({ file_path: "./api_workspace/SKILL.md" });
3. For each endpoint in docs:
   await execute_test({ url: "...", method: "GET" });
4. Output final audit table.
\`\`\`

## Notes
- Ensure the environment has \`openapi-to-skills\` and \`node-fetch\` installed (the installer takes care of this).
- The agent must respect rate limits and use appropriate test data.
- All tests are non‑destructive where possible (use mock endpoints or sandbox environments).
`);
}

// ============================================================================
// 6. MAIN INSTALLATION LOGIC
// ============================================================================

function main() {
  console.log('🚀 Universal OpenClaw API Tester Installer');
  console.log('===========================================\n');
  
  // Display platform info
  const platformInfo = getPlatformInfo();
  console.log(`Platform: ${platformInfo.platform} (${platformInfo.isWindows ? 'Windows' : platformInfo.isMac ? 'macOS' : 'Unix-like'})`);
  console.log(`Current directory: ${process.cwd()}\n`);
  
  // Discover OpenClaw workspace
  const workspacePath = discoverOpenClawWorkspace();
  
  if (!workspacePath) {
    console.error('❌ OpenClaw workspace not found.');
    console.error('\nPlease install OpenClaw first or specify the workspace location:');
    console.error(`   ${process.argv[1]} /path/to/openclaw/workspace`);
    console.error('\nOr set environment variable:');
    console.error('   export OPENCLAW_HOME=/path/to/openclaw');
    console.error(`   ${process.argv[1]}`);
    process.exit(1);
  }
  
  // Define target directory
  const targetDir = join(workspacePath, 'api-tester-skill');
  
  // Validate write permissions
  if (!validateWritePermissions(targetDir)) {
    handlePermissionError(targetDir);
  }
  
  // Create skill files
  createSkillFiles(targetDir);
  
  // Install dependencies locally
  installDependenciesSafely(targetDir);
  
  // Check for openapi-to-skills globally (optional)
  console.log('\nChecking for openapi-to-skills...');
  try {
    execSync('npx openapi-to-skills --version', { stdio: 'ignore' });
    console.log('✓ openapi-to-skills is available via npx');
  } catch {
    console.warn('⚠️  openapi-to-skills not found globally.');
    console.warn('   It will be downloaded via npx when needed (requires internet).');
  }
  
  // Success message
  console.log('\n✅ API Tester Skill installed successfully!');
  console.log(`\nLocation: ${targetDir}`);
  console.log('\nAdd the following line to your OpenClaw TOOLS.md:');
  console.log('- **API Tester:** Located at `./api-tester-skill`. Read `./api-tester-skill/SKILL.md` to use.');
  console.log('\nThe skill includes:');
  console.log('  • ingest_api.js   - Compile OpenAPI specs');
  console.log('  • read_docs.js    - Read documentation files');
  console.log('  • execute_test.js - Perform HTTP requests (with local node-fetch)');
  console.log('  • SKILL.md        - Complete operating procedure');
  console.log('\nYou can now use the skill in your OpenClaw workspace.');
}

// ============================================================================
// EXECUTION
// ============================================================================

try {
  main();
} catch (error) {
  console.error('\n💥 INSTALLATION FAILED');
  console.error(`Error: ${error.message}`);
  console.error('\nDebug information:');
  console.error(`Platform: ${platform()}`);
  console.error(`Node.js: ${process.version}`);
  console.error(`Command: ${process.argv.join(' ')}`);
  console.error('\nPlease report this issue at:');
  console.error('https://github.com/TapanTalukdar004/openclaw-api-tester-cli/issues');
  process.exit(1);
}
