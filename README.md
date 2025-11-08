# serverless-aws-otel

[![npm version](https://badge.fury.io/js/serverless-aws-otel.svg)](https://www.npmjs.com/package/serverless-aws-otel)
[![npm downloads](https://img.shields.io/npm/dm/serverless-aws-otel.svg)](https://www.npmjs.com/package/serverless-aws-otel)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-126%20passing-brightgreen.svg)](https://github.com/krcpr007/serverless-aws-otel)

A Serverless plugin to automatically configure AWS OpenTelemetry layer and environment variables for Python Lambda functions.

## Installation

```bash
npm install serverless-aws-otel
```

## Usage

Add the plugin to your `serverless.yml`:

```yaml
plugins:
  - serverless-aws-otel
```

## Configuration

### Basic Usage (No Configuration Required)

```yaml
plugins:
  - serverless-aws-otel
```

The plugin works out of the box with sensible defaults.

### Custom Configuration

You can customize the plugin behavior through the `custom.otelPlugin` section:

```yaml
custom:
  otelPlugin:
    # Override the default OpenTelemetry layer ARN
    layerArn: 'arn:aws:lambda:us-west-2:615299751070:layer:AWSOpenTelemetryDistroPython:18'

    # Add or override environment variables
    # You can configure ANY OpenTelemetry environment variable supported by AWSOpenTelemetryDistroPython
    envVars:
      # REQUIRED: Configure OTLP endpoints for traces, metrics, and logs
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://your-collector.example.com/v1/traces'
      OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://your-collector.example.com/v1/metrics'
      OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'https://your-collector.example.com/v1/logs'

      # Change exporter settings
      OTEL_LOGS_EXPORTER: 'otlp'
      OTEL_TRACES_EXPORTER: 'otlp'
      OTEL_EXPORTER_OTLP_PROTOCOL: 'grpc'

      # Customize instrumentations
      OTEL_PYTHON_DISABLED_INSTRUMENTATIONS: 'logging,requests'

      # Override resource attributes
      OTEL_RESOURCE_ATTRIBUTES: 'service.name=${self:service},service.version=2.0.0,service.environment=${self:custom.stage}'

      # Any other OTEL_ environment variable...
```

> **Important:** When exporting telemetry data to an OTLP collector, the following environment variables are **mandatory** and must be configured either in `envVars` or `globalVariables`:
> - `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
> - `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`
> - `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`

> **Note:** The `envVars` section supports all OpenTelemetry environment variables that are compatible with the AWS OpenTelemetry Distro for Python layer. See the [AWS ADOT Python documentation](https://aws-otel.github.io/docs/getting-started/lambda/lambda-python/) and [OpenTelemetry Python documentation](https://opentelemetry.io/docs/languages/python/) for a complete list of available configuration options.

### Integration with Global Variables (Optional)

If your organization uses `custom.globalVariables` in your `serverless.yml`, the plugin will automatically pick up OTLP endpoint configurations:

```yaml
custom:
  globalVariables:
    # REQUIRED: Configure OTLP endpoints
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://your-collector.example.com/v1/traces'
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://your-collector.example.com/v1/metrics'
    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'https://your-collector.example.com/v1/logs'

plugins:
  - serverless-aws-otel
```

**Note:** Values specified in `otelPlugin.envVars` will override values from `globalVariables`.

## Default Configuration

The plugin automatically adds the following configuration to your Lambda functions:

### Layer
- **ARN**: `arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:18`

### Environment Variables

| Variable | Default Value | Description |
|----------|--------------|-------------|
| `AWS_LAMBDA_EXEC_WRAPPER` | `/opt/otel-instrument` | Enables auto-instrumentation |
| `OTEL_LOGS_EXPORTER` | `none` | Disables log export by default |
| `OTEL_PYTHON_DISABLED_INSTRUMENTATIONS` | `logging` | Disables logging instrumentation |
| `OTEL_RESOURCE_ATTRIBUTES` | `service.name=<service>,service.version=1.0.0,service.environment=<stage>,deployment.environment=<stage>` | Resource attributes for telemetry |
| `OTEL_SERVICE_NAME` | `<service-name>` | Service name from serverless.yml |
| `OTEL_PROPAGATORS` | `tracecontext,baggage,xray` | Context propagation formats |

**Additional endpoints** (if configured via `globalVariables` or `envVars`):
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`
- `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`

## Examples

### Example 1: Basic Usage with X-Ray

```yaml
plugins:
  - serverless-aws-otel
```

By default, traces are exported to AWS X-Ray using the embedded OpenTelemetry Collector.

### Example 2: Custom OTLP Collector

```yaml
custom:
  otelPlugin:
    envVars:
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://otel-collector.mycompany.com:4317'
      OTEL_EXPORTER_OTLP_PROTOCOL: 'grpc'

plugins:
  - serverless-aws-otel
```

### Example 3: Debug with Console Export

```yaml
custom:
  otelPlugin:
    envVars:
      OTEL_TRACES_EXPORTER: 'console'
      OTEL_LOGS_EXPORTER: 'console'

plugins:
  - serverless-aws-otel
```

### Example 4: Different Region Layer

```yaml
custom:
  otelPlugin:
    layerArn: 'arn:aws:lambda:eu-west-1:615299751070:layer:AWSOpenTelemetryDistroPython:18'

plugins:
  - serverless-aws-otel
```

## How It Works

1. The plugin adds the AWS OpenTelemetry Distro Python layer to your Lambda functions
2. It sets the required environment variables for auto-instrumentation
3. It optionally reads OTLP endpoints from `custom.globalVariables` (backward compatible)
4. It merges default values with your custom `envVars` configuration
5. Environment variables specified in `envVars` take precedence over defaults and `globalVariables`

## Requirements

- Serverless Framework v3.x or later
- Python Lambda functions
- AWS Lambda runtime compatible with the OpenTelemetry layer

## License

MIT