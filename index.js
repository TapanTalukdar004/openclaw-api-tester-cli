#!/usr/bin/env node

import { homedir, platform } from 'os';
import { join, resolve, normalize, dirname, sep } from 'path';
import { 
  mkdirSync, 
  writeFileSync, 
  existsSync, 
  accessSync, 
  constants,
  readFileSync
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
 * 6. Stateful QA Engine with memory persistence
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

  // File 3: tools/state_manager.js
  writeFileSync(join(toolsDir, 'state_manager.js'), `import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'session_state.json');

/**
 * Save a variable to persistent session state
 * @param {string} key - Variable name
 * @param {any} value - Value to store (must be JSON-serializable)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function saveVariable(key, value) {
    try {
        let state = {};
        if (fs.existsSync(STATE_FILE)) {
            const content = fs.readFileSync(STATE_FILE, 'utf-8');
            state = JSON.parse(content);
        }
        
        state[key] = value;
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        return { success: true, message: \`Variable "\${key}" saved successfully.\` };
    } catch (error) {
        return { success: false, message: \`Failed to save variable: \${error.message}\` };
    }
}

/**
 * Retrieve a variable from persistent session state
 * @param {string} key - Variable name
 * @returns {Promise<{success: boolean, value: any, message: string}>}
 */
export async function getVariable(key) {
    try {
        if (!fs.existsSync(STATE_FILE)) {
            return { success: false, value: null, message: 'Session state file does not exist.' };
        }
        
        const content = fs.readFileSync(STATE_FILE, 'utf-8');
        const state = JSON.parse(content);
        
        if (key in state) {
            return { success: true, value: state[key], message: \`Variable "\${key}" retrieved successfully.\` };
        } else {
            return { success: false, value: null, message: \`Variable "\${key}" not found in session state.\` };
        }
    } catch (error) {
        return { success: false, value: null, message: \`Failed to retrieve variable: \${error.message}\` };
    }
}

/**
 * Clear all session state
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function clearState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            fs.unlinkSync(STATE_FILE);
        }
        return { success: true, message: 'Session state cleared successfully.' };
    } catch (error) {
        return { success: false, message: \`Failed to clear state: \${error.message}\` };
    }
}
`);

  // File 4: tools/execute_test.js
  writeFileSync(join(toolsDir, 'execute_test.js'), `import fetch from 'node-fetch';
import { getVariable } from './state_manager.js';

/**
 * Replace {{VARIABLE_NAME}} patterns in URL or payload with values from session state
 * @param {string} input - URL or payload string
 * @returns {Promise<string>} - Input with variables replaced
 */
async function replaceVariables(input) {
    if (typeof input !== 'string') return input;
    
    const variablePattern = /\\{\\{([^}]+)\\}\\}/g;
    let result = input;
    let match;
    
    while ((match = variablePattern.exec(input)) !== null) {
        const fullMatch = match[0];
        const varName = match[1].trim();
        
        const { success, value } = await getVariable(varName);
        if (success && value !== null && value !== undefined) {
            result = result.replace(fullMatch, value);
        }
    }
    
    return result;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Poll a status URL up to maxAttempts with delay between attempts
 * @param {string} statusUrl - URL to poll
 * @param {object} options - Fetch options
 * @param {number} maxAttempts - Maximum polling attempts (default: 3)
 * @param {number} delayMs - Delay between attempts in ms (default: 2000)
 * @returns {Promise<Response>} - Final response
 */
async function pollStatusUrl(statusUrl, options, maxAttempts = 3, delayMs = 2000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await sleep(delayMs);
        
        const pollResponse = await fetch(statusUrl, options);
        const pollBody = await pollResponse.text();
        
        // If status is no longer 202, return the response
        if (pollResponse.status !== 202) {
            return pollResponse;
        }
        
        console.log(\`Polling attempt \${attempt}/\${maxAttempts}: Still processing...\`);
    }
    
    // If we exhaust all attempts, return the last 202 response
    return await fetch(statusUrl, options);
}

export async function run({ url, method, headers = {}, payload = null }) {
    try {
        // Replace variables in URL and payload
        const processedUrl = await replaceVariables(url);
        let processedPayload = payload;
        
        if (payload) {
            if (typeof payload === 'string') {
                processedPayload = await replaceVariables(payload);
            } else if (typeof payload === 'object') {
                // Deep clone and process string values
                processedPayload = JSON.parse(JSON.stringify(payload));
                const processObject = async (obj) => {
                    for (const key in obj) {
                        if (typeof obj[key] === 'string') {
                            obj[key] = await replaceVariables(obj[key]);
                        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                            await processObject(obj[key]);
                        }
                    }
                };
                await processObject(processedPayload);
            }
        }
        
        const options = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        if (processedPayload && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
            options.body = JSON.stringify(processedPayload);
        }
        
        const response = await fetch(processedUrl, options);
        const bodyText = await response.text();
        
        // Handle 202 Accepted with polling
        if (response.status === 202) {
            console.log('Received 202 Accepted - starting async polling...');
            
            // Try to extract status URL from Location header or response body
            let statusUrl = response.headers.get('Location');
            if (!statusUrl) {
                try {
                    const bodyJson = JSON.parse(bodyText);
                    statusUrl = bodyJson.status_url || bodyJson.location || bodyJson.url;
                } catch {
                    // If no URL found, return the 202 response as-is
                    console.log('No status URL found for polling, returning 202 response');
                }
            }
            
            if (statusUrl) {
                console.log(\`Polling status URL: \${statusUrl}\`);
                // Use GET for polling (or same method as original if specified)
                const pollOptions = { ...options, method: 'GET' };
                delete pollOptions.body; // GET requests shouldn't have body
                
                const finalResponse = await pollStatusUrl(statusUrl, pollOptions, 3, 2000);
                const finalBodyText = await finalResponse.text();
                
                return JSON.stringify({
                    status: finalResponse.status,
                    ok: finalResponse.ok,
                    headers: Object.fromEntries(finalResponse.headers.entries()),
                    body: finalBodyText.substring(0, 1000),
                    note: 'Result after async polling'
                });
            }
        }
        
        return JSON.stringify({
            status: response.status,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
            body: bodyText.substring(0, 1000)
        });
    } catch (error) {
        return \`EXECUTION ERROR: \${error.message}\`;
    }
}
`);

  // File 5: SKILL.md (completely rewritten with high-authority language)
  writeFileSync(join(targetDir, 'SKILL.md'), `# Stateful QA Engine - API Tester Skill
## MANDATORY WORKFLOW FOR DATA PERSISTENCE

### THE MISSION
You are a Senior Software Engineer performing systematic API testing. This skill enforces a **State-Machine Workflow** to eliminate "Brute-Force" errors (415s, 404s) caused by memory volatility and dependency ignorance.

## PHASE 1: MEMORY INJECTION (MANDATORY)

### State Manager Tool
You MUST use the \`state_manager.js\` tool for all data persistence:
- \`saveVariable(key, value)\`: Store IDs, tokens, or any test-generated data
- \`getVariable(key)\`: Retrieve stored values for dependent requests
- \`clearState()\`: Reset session (use with caution)

**RULE:** After any POST request that returns a unique identifier (e.g., petId, userId, orderId), you MUST call \`saveVariable('saved_pet_id', id)\` to persist it to \`session_state.json\`.

## PHASE 2: DEPENDENCY MAPPING (FORBIDDEN TO SKIP)

### The Dependency Map Contract
After running \`ingest_api\`, you MUST generate a JSON plan that links:

| Producer Endpoint | Consumer Endpoint | Data Flow |
|-------------------|-------------------|-----------|
| POST /pets        | GET /pets/{id}    | petId     |
| POST /users       | PUT /users/{id}   | userId    |
| POST /orders      | DELETE /orders/{id}| orderId   |

**MANDATORY:** You MUST output this table before executing any tests. Failure to do so is a workflow violation.

### The 415 Guardrail
You are **FORBIDDEN** from sending a POST/PUT/PATCH request without first verifying the \`consumes\` type from the OpenAPI schema.

**CHECKLIST:**
1. Read the schema documentation from \`./api_workspace/SKILL.md\`
2. Identify the \`consumes\` field for each endpoint
3. If \`consumes\` includes \`application/json\`, set \`Content-Type: application/json\`
4. If \`consumes\` includes \`application/x-www-form-urlencoded\`, encode payload accordingly
5. If unsure, default to \`application/json\` but log the assumption

## PHASE 2.5: AUTHENTICATION FLOW PRIORITIZATION

### Dynamic Auth Token Management
The hardcoded \`TEST_TOKEN_123\` is a fallback. If the OpenAPI schema contains an authentication endpoint (e.g., \`/auth/login\`, \`/oauth/token\`), you **MUST** execute it first and save the returned token.

**MANDATORY WORKFLOW:**
1. Scan the generated \`./api_workspace/SKILL.md\` for authentication-related endpoints
2. If found, execute the authentication endpoint with valid credentials (use test credentials from schema or environment)
3. Extract the token from the response (commonly in \`access_token\`, \`token\`, or \`Authorization\` header)
4. Save the token using \`saveVariable('AUTH_TOKEN', tokenValue)\`
5. For all subsequent requests requiring authentication, use \`{{AUTH_TOKEN}}\` in the \`Authorization\` header

**Example Header Configuration:**
\`\`\`javascript
headers: {
  'Authorization': 'Bearer {{AUTH_TOKEN}}'
}
\`\`\`

**Security Note:** Never hardcode production tokens. Use test credentials or environment variables.

## PHASE 2.6: PAGINATION TESTING REQUIREMENT

### Comprehensive List Endpoint Testing
Brute-force testing often misses pagination logic. You **MUST** test list endpoints with query parameters to verify pagination works correctly.

**MANDATORY TEST CASES for List Endpoints (e.g., \`/pets\`, \`/users\`):**
1. **Default pagination:** Call endpoint without parameters to establish baseline
2. **Limit parameter:** Test with \`?limit=1\` to verify single-item response
3. **Offset/Page parameter:** Test with \`?page=2\` or \`?offset=10\` to verify pagination navigation
4. **Combined parameters:** Test with \`?limit=5&page=3\` to verify complex pagination

**Validation Rules:**
- Response MUST include pagination metadata (e.g., \`total\`, \`page\`, \`limit\`, \`next\`, \`prev\`)
- Items count MUST match the limit parameter
- Different pages MUST return different items (when data exists)

**Failure Detection:** If pagination parameters are ignored (same results for all pages), mark test as **FAIL** with note "Pagination not functional".

## PHASE 3: STATEFUL EXECUTION

### Variable Substitution Pattern
The \`execute_test.js\` tool automatically detects and replaces \`{{VARIABLE_NAME}}\` patterns:

**URL Example:** \`http://api.example.com/pets/{{saved_pet_id}}\`
- Automatically replaces \`{{saved_pet_id}}\` with value from \`session_state.json\`

**Payload Example:** \`{ "userId": "{{user_id}}" }\`
- Automatically replaces \`{{user_id}}\` with stored value

**RULE:** If a required variable is missing (returns null), the test MUST fail with a clear error message: "Missing required variable: {{VARIABLE_NAME}}".

### Stop-on-Failure Logic
In a real-world project, if a producer endpoint fails, testing dependent consumers is a waste of resources.

**MANDATORY LOGIC FLOW:**
1. Execute producer (POST) endpoint
2. If status ≥ 400, **STOP** the entire test sequence
3. Extract generated ID from response body
4. Save to state with \`saveVariable\`
5. Proceed to consumer (GET/PUT/DELETE) endpoints

## PHASE 4: THE EXECUTION GATE

### Pre-Execution Table Requirement
You are **PROHIBITED** from running \`execute_test\` until you have outputted this table:

| Step # | Endpoint | Method | Input Variable Source | Output Variable to Store |
|--------|----------|--------|----------------------|--------------------------|
| 1 | /pets | POST | Hardcoded test data | saved_pet_id |
| 2 | /pets/{id} | GET | {{saved_pet_id}} | (none) |
| 3 | /pets/{id} | PUT | {{saved_pet_id}} + payload | (none) |
| 4 | /pets/{id} | DELETE | {{saved_pet_id}} | (none) |

**MANDATORY:** This table MUST be generated programmatically based on the dependency map.

## TOOLS REFERENCE

### ingest_api
- **Input:** \`{ "swagger_url": "http://example.com/openapi.json" }\`
- **Action:** Downloads and compiles OpenAPI spec to \`./api_workspace\`
- **Output:** Success/error message

### read_docs  
- **Input:** \`{ "file_path": "./api_workspace/SKILL.md" }\`
- **Action:** Reads documentation file
- **Output:** File content as string

### state_manager
- **Input:** \`saveVariable(key, value)\` or \`getVariable(key)\`
- **Action:** Persistent key-value storage in \`session_state.json\`
- **Output:** Success/error with value

### execute_test
- **Input:** \`{ "url": "...", "method": "...", "headers": {}, "payload": null }\`
- **Action:** HTTP request with automatic variable substitution
- **Output:** JSON with status, ok, headers, and truncated body

## USAGE EXAMPLE (PetStore API)

\`\`\`javascript
// Phase 1: Ingest and Plan
await ingest_api({ swagger_url: "https://petstore.swagger.io/v2/swagger.json" });
const docs = await read_docs({ file_path: "./api_workspace/SKILL.md" });

// Phase 2: Generate Dependency Map
const dependencyMap = [
  { producer: "POST /pet", consumer: "GET /pet/{petId}", variable: "petId" },
  { producer: "POST /pet", consumer: "PUT /pet", variable: "petId" },
  { producer: "POST /pet", consumer: "DELETE /pet/{petId}", variable: "petId" }
];

// Phase 3: Output Execution Gate Table
console.log("| Step # | Endpoint | Method | Input Variable Source | Output Variable to Store |");
console.log("|--------|----------|--------|----------------------|--------------------------|");
console.log("| 1 | /pet | POST | Hardcoded | saved_pet_id |");
console.log("| 2 | /pet/{petId} | GET | {{saved_pet_id}} | (none) |");

// Phase 4: Execute with State Management
// Step 1: Create pet
const createResult = await execute_test({
  url: "http://petstore.swagger.io/v2/pet",
  method: "POST",
  payload: { name: "doggie", status: "available" }
});

const petId = JSON.parse(createResult).body.id;
await saveVariable('saved_pet_id', petId);

// Step 2: Retrieve pet (uses variable substitution)
const getResult = await execute_test({
  url: \`http://petstore.swagger.io/v2/pet/{{saved_pet_id}}\`,
  method: "GET"
});
\`\`\`

## CRITICAL RULES SUMMARY

1. **MEMORY VOLATILITY FIX:** NEVER rely on chat context for IDs. ALWAYS use \`state_manager\`.
2. **DEPENDENCY AWARENESS:** ALWAYS map producers to consumers before execution.
3. **415 PREVENTION:** ALWAYS verify \`consumes\` type before sending POST/PUT/PATCH.
4. **STOP-ON-FAILURE:** If a producer fails (≥400), STOP the test sequence.
5. **EXECUTION GATE:** NEVER execute tests without the pre-execution table.

## FAILURE MODES AND RECOVERY

- **Missing Variable Error:** Use \`saveVariable\` to store the missing value from a previous step.
- **415 Unsupported Media Type:** Check schema \`consumes\` field and adjust \`Content-Type\`.
- **404 Not Found:** Verify the variable substitution worked correctly in the URL.
- **State Corruption:** Use \`clearState()\` and restart the test sequence.

## PHASE 5: EPHEMERAL CLEANUP PROTOCOL

### Zero-Knowledge Persistence Principle
The \`session_state.json\` file acts as **Intermediate Memory** – it exists only during execution and MUST be deleted immediately after the test session completes.

### Mandatory Cleanup Step
After outputting the final audit table, you are **MANDATED** to delete \`session_state.json\` using the \`clearState()\` function.

**Security Rule:** No intermediate test data (IDs, names, tokens) should persist in the workspace after the session ends. This ensures "Zero-Knowledge" persistence – the workspace returns to a clean state.

### Cleanup Implementation
\`\`\`javascript
// After final table output:
await clearState();
console.log("✓ session_state.json deleted – Zero-Knowledge cleanup complete.");
\`\`\`

**VERIFICATION:** Confirm the file no longer exists in the workspace directory. If \`clearState()\` fails, manually delete the file using \`fs.unlinkSync('session_state.json')\`.

### Rationale
1. **Security:** Prevents accidental exposure of test data (API keys, user IDs) in version control or shared environments.
2. **Reproducibility:** Ensures each test run starts with a clean state, eliminating stale variable contamination.
3. **Compliance:** Meets enterprise security standards for ephemeral test environments.

---
*This skill transforms the AI from a "Passive Installer" to a "Stateful QA Engine." Follow the MANDATORY workflow or risk Brute-Force errors.*
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
  console.log('\nThe skill now includes:');
  console.log('  • ingest_api.js     - Compile OpenAPI specs');
  console.log('  • read_docs.js      - Read documentation files');
  console.log('  • state_manager.js  - Persistent session state management');
  console.log('  • execute_test.js   - HTTP requests with variable substitution');
  console.log('  • SKILL.md          - Stateful QA Engine workflow (MANDATORY)');
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
