# Technical Documentation

This document provides technical details about how the `serverless-aws-otel` plugin works internally, including the Serverless Framework lifecycle hooks, architecture decisions, and implementation details.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Serverless Framework Lifecycle Hooks](#serverless-framework-lifecycle-hooks)
- [Hook Selection Rationale](#hook-selection-rationale)
- [Plugin Execution Flow](#plugin-execution-flow)
- [Configuration Injection](#configuration-injection)
- [Design Decisions](#design-decisions)
- [Contributing](#contributing)

## Architecture Overview

The plugin is a Serverless Framework plugin that automatically injects AWS OpenTelemetry configuration into Lambda functions during the deployment process. It works by:

1. Hooking into the Serverless Framework lifecycle events
2. Modifying the service configuration object before packaging
3. Adding the OpenTelemetry Lambda layer ARN
4. Injecting required environment variables
5. Allowing the standard deployment process to continue with the modified configuration

## Serverless Framework Lifecycle Hooks

Serverless Framework uses a **lifecycle hooks system** that allows plugins to execute code at specific points during commands like `serverless deploy` or `serverless package`.

### Hook Format

Hooks follow the format: `<timing>:<command>:<subcommand>`

- **Timing**: `before`, `after`, or nothing (during)
- **Command**: The main command (e.g., `package`, `deploy`)
- **Subcommand**: Specific action within the command (e.g., `createDeploymentArtifacts`, `finalize`)

### Hooks Used by This Plugin

This plugin uses two hooks:

```javascript
this.hooks = {
  'before:package:createDeploymentArtifacts': this.addOtelConfiguration.bind(this),
  'before:aws:package:finalize': this.addOtelConfiguration.bind(this),
};
```

#### 1. `before:package:createDeploymentArtifacts`

**Type**: Provider-agnostic (generic) lifecycle hook

**When It Fires**: Before Serverless creates deployment artifacts (ZIP files)

**Execution Order in Deploy Process**:
```
serverless deploy
  ├─ before:package:initialize
  ├─ package:initialize
  ├─ before:package:setupProviderConfiguration
  ├─ package:setupProviderConfiguration
  ├─ before:package:createDeploymentArtifacts  ← ✓ FIRES HERE
  ├─ package:createDeploymentArtifacts         (creates ZIP files)
  ├─ after:package:createDeploymentArtifacts
  └─ ...continues with deployment
```

**What's Available at This Point**:
- ✅ Service configuration is fully loaded from `serverless.yml`
- ✅ All functions are defined in `service.provider.functions`
- ✅ Provider configuration exists (`service.provider`)
- ✅ Service object is still mutable
- ❌ ZIP files not yet created
- ❌ CloudFormation templates not yet generated

**Why It's Used**:
This is the **standard, recommended hook** for plugins that need to modify provider-level configuration. It runs early enough to ensure changes are included in the deployment package, but late enough that all service configuration is loaded.

#### 2. `before:aws:package:finalize`

**Type**: AWS-specific lifecycle hook

**When It Fires**: Before AWS CloudFormation template finalization

**Execution Order in AWS Packaging**:
```
aws:package:initialize
  ├─ aws:package:setupProviderConfiguration
  ├─ aws:package:compileFunctions               (Lambda resources created)
  ├─ aws:package:compileLayers                  (Layer resources created)
  ├─ aws:package:compileEvents                  (Event sources created)
  ├─ before:aws:package:finalize                ← ✓ FIRES HERE
  ├─ aws:package:finalize                       (CloudFormation finalized)
  └─ after:aws:package:finalize
```

**What's Available at This Point**:
- ✅ CloudFormation template resources are compiled
- ✅ Lambda function resources exist in the template
- ✅ Service configuration is still mutable
- ✅ Provider configuration can still be modified
- ❌ CloudFormation template not yet written to disk
- ❌ Not yet deployed to AWS

**Why It's Used**:
This is the **last safe point** to inject provider-level configuration before the AWS CloudFormation template is finalized. It's AWS-specific and runs during the CloudFormation compilation phase, ensuring changes propagate to all Lambda resources.

### Why Both Hooks?

The plugin uses **both hooks** for maximum compatibility:

```javascript
// Prevent running twice if both hooks are triggered
if (this.configurationApplied) {
  return;
}
```

**Reasons for dual hooks**:
1. **Framework Version Compatibility**: Different Serverless Framework versions may trigger different hooks
2. **Command Compatibility**: Different commands (`deploy`, `package`) may use different hook sequences
3. **Provider Compatibility**: Generic hook works across providers, AWS-specific hook ensures AWS compatibility
4. **Safety Net**: Guarantees the configuration is added regardless of which deployment path is taken

The `configurationApplied` flag (index.js:17-19) prevents the method from running twice if both hooks fire.

## Hook Selection Rationale

### Why Not Other Hooks?

| Hook | Why Not Used |
|------|-------------|
| `before:deploy:deploy` | Too late - packaging already complete |
| `after:package:createDeploymentArtifacts` | Too late - ZIP files already created |
| `before:package:initialize` | Too early - service config might not be fully loaded |
| `after:aws:package:finalize` | Too late - CloudFormation template already finalized |

### Why These Hooks Are Perfect

| Hook | Benefit |
|------|---------|
| `before:package:createDeploymentArtifacts` | Standard plugin hook, runs before packaging |
| `before:aws:package:finalize` | AWS-specific safety net, last chance to modify CFN |

## Plugin Execution Flow

Here's the complete flow from plugin initialization to deployment:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Plugin Initialization                                     │
│    serverless deploy → Plugin constructor called             │
│    this.hooks = { ... } registered                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Hook: before:package:createDeploymentArtifacts           │
│    addOtelConfiguration() called                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Configuration Check                                       │
│    if (this.configurationApplied) return;                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Read Configuration                                        │
│    - service.custom.otelPlugin (user config)                │
│    - service.custom.globalVariables (optional)              │
│    - service.custom.version (for resource attributes)       │
│    - service.custom.stage (for resource attributes)         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Layer Injection                                           │
│    service.provider.layers = [...]                          │
│    service.provider.layers.push(otelLayerArn)               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Environment Variable Injection                            │
│    service.provider.environment = {                         │
│      AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-instrument',      │
│      OTEL_SERVICE_NAME: '...',                              │
│      OTEL_RESOURCE_ATTRIBUTES: '...',                       │
│      ...defaultOtelEnvVars,                                 │
│      ...pluginConfig.envVars                                │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Mark Configuration Applied                                │
│    this.configurationApplied = true                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Hook: before:aws:package:finalize (may fire)             │
│    Exits early due to configurationApplied = true           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. Packaging                                                 │
│    - Creates ZIP files with modified config                 │
│    - Generates CloudFormation template                      │
│    - Includes OTEL layer and env vars in all functions      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. Deployment                                               │
│     Uploads to AWS with OpenTelemetry configuration         │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Injection

### Layer Injection (index.js:27-41)

```javascript
if (!service.provider.layers) {
  service.provider.layers = [];
}

const otelLayerArn = pluginConfig.layerArn || defaultLayerArn;

if (!service.provider.layers.includes(otelLayerArn)) {
  service.provider.layers.push(otelLayerArn);
}
```

**How It Works**:
1. Checks if `service.provider.layers` array exists, creates if not
2. Gets layer ARN from user config or uses default
3. Validates the layer ARN contains 'AWSOpenTelemetryDistroPython'
4. Adds layer ARN if not already present (prevents duplicates)

**Result**: All Lambda functions in the service get the OpenTelemetry layer

### Environment Variable Injection (index.js:43-88)

```javascript
if (!service.provider.environment) {
  service.provider.environment = {};
}

const defaultOtelEnvVars = { ... };

// Merge: defaults < globalVariables < user envVars
const otelEnvVars = {
  ...defaultOtelEnvVars,
  ...(pluginConfig.envVars || {})
};

// Only add if not already set
Object.keys(otelEnvVars).forEach(key => {
  if (!service.provider.environment[key]) {
    service.provider.environment[key] = otelEnvVars[key];
  }
});
```

**Merge Priority** (highest to lowest):
1. **Existing `service.provider.environment`** - Never overwritten
2. **User `custom.otelPlugin.envVars`** - User-specified values
3. **Default plugin values** - Plugin defaults

**Result**: All Lambda functions get OTEL environment variables with proper precedence

## Design Decisions

### 1. Dual Hook Strategy

**Decision**: Use both `before:package:createDeploymentArtifacts` and `before:aws:package:finalize`

**Rationale**:
- Ensures compatibility across different Serverless Framework versions
- Provides safety net for different deployment commands
- Covers both generic and AWS-specific packaging flows

**Trade-off**: Requires `configurationApplied` flag to prevent duplicate execution

### 2. Provider-Level Configuration

**Decision**: Inject configuration at `service.provider` level, not per-function

**Rationale**:
- Applies to all Lambda functions automatically
- Simpler configuration - users don't need per-function setup
- Follows Serverless Framework best practices
- Users can override at function level if needed

**Trade-off**: All functions get OpenTelemetry (but that's typically desired)

### 3. Non-Destructive Injection

**Decision**: Only add configuration if not already present

```javascript
if (!service.provider.layers.includes(otelLayerArn)) {
  service.provider.layers.push(otelLayerArn);
}

if (!service.provider.environment[key]) {
  service.provider.environment[key] = otelEnvVars[key];
}
```

**Rationale**:
- Respects existing user configuration
- Prevents duplicates
- Allows users to override at function level
- Safe for multiple plugin runs

### 4. Configuration Precedence

**Decision**: User config > Plugin defaults

**Rationale**:
- Users can customize any OpenTelemetry setting
- Plugin provides sensible defaults
- Flexibility without complexity

### 5. Global Variables Support

**Decision**: Support optional `custom.globalVariables` for OTLP endpoints

```javascript
const globalVariables = service.custom?.globalVariables || {};

if (globalVariables.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) {
  defaultOtelEnvVars.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = globalVariables.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
}
```

**Rationale**:
- Allows organizations to centralize OTLP endpoint configuration
- Backward compatible with internal company usage
- Optional - doesn't affect standard use cases

### 6. Layer ARN Validation

**Decision**: Validate layer ARN contains 'AWSOpenTelemetryDistroPython'

```javascript
if (!otelLayerArn.includes('AWSOpenTelemetryDistroPython')) {
  throw new Error('Invalid layer ARN...');
}
```

**Rationale**:
- Prevents configuration errors
- Ensures correct layer is used
- Fails fast with clear error message

## Service Object Structure

Understanding the Serverless service object is key to how this plugin works:

```javascript
service = {
  service: 'my-service',              // Service name
  provider: {
    name: 'aws',
    runtime: 'python3.9',
    region: 'us-east-1',
    layers: [],                       // ← Plugin adds layer here
    environment: {}                   // ← Plugin adds env vars here
  },
  functions: {
    myFunction: {
      handler: 'handler.main',
      // Individual function config inherits from provider
    }
  },
  custom: {
    otelPlugin: {                     // ← Plugin reads config from here
      layerArn: '...',
      envVars: {}
    },
    globalVariables: {},              // ← Optional OTLP endpoints
    version: '1.0.0',                 // ← Used in resource attributes
    stage: 'dev'                      // ← Used in resource attributes
  }
}
```

**Key Points**:
- `provider` level config applies to all functions
- Individual functions inherit from `provider`
- Individual functions can override `provider` settings
- Plugin modifies `provider` to affect all functions

## Contributing

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Make changes to `index.js`
4. Run tests: `npm test`
5. Test in a real Serverless project by linking:
   ```bash
   npm link
   cd /path/to/test-project
   npm link serverless-aws-otel
   ```

### Testing Changes

Create a test `serverless.yml`:

```yaml
service: otel-test

provider:
  name: aws
  runtime: python3.9

plugins:
  - serverless-aws-otel

functions:
  hello:
    handler: handler.hello
```

Run with verbose logging to see hook execution:

```bash
serverless deploy --verbose
```

Look for log messages:
```
Service name: otel-test
OpenTelemetry configuration added successfully
```

### Debugging Hooks

Add debug logging to `addOtelConfiguration()`:

```javascript
addOtelConfiguration() {
  console.log('Hook triggered:', new Error().stack);
  console.log('Configuration applied:', this.configurationApplied);
  // ... rest of method
}
```

Run `serverless package --verbose` to see which hooks fire.

## Additional Resources

- [Serverless Framework Plugin Documentation](https://www.serverless.com/framework/docs/guides/plugins/creating-plugins)
- [Serverless Framework Lifecycle Events](https://www.serverless.com/framework/docs/guides/plugins/custom-plugins#lifecycle-events)
- [AWS OpenTelemetry Lambda Layers](https://aws-otel.github.io/docs/getting-started/lambda)
- [OpenTelemetry Python Documentation](https://opentelemetry.io/docs/languages/python/)

## License

MIT
