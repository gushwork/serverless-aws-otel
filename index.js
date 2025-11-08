class ServerlessAwsOtelPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      'before:package:createDeploymentArtifacts': this.addOtelConfiguration.bind(this),
      'before:aws:package:finalize': this.addOtelConfiguration.bind(this),
    };

  }

  addOtelConfiguration() {
    try {
      // Prevent running twice if both hooks are triggered
      if (this.configurationApplied) {
        return;
      }

      const service = this.serverless.service;
      const pluginConfig = service.custom?.otelPlugin || {};

      if (!service.provider.layers) {
        service.provider.layers = [];
      }

      const defaultLayerArn = 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:18';
      const otelLayerArn = pluginConfig.layerArn || defaultLayerArn;

      if (!otelLayerArn.includes('AWSOpenTelemetryDistroPython')) {
        throw new Error('Invalid layer ARN. Please use the correct layer ARN for AWS OpenTelemetry Distro Python.');
      }

      if (!service.provider.layers.includes(otelLayerArn)) {
        service.provider.layers.push(otelLayerArn);
      }

      if (!service.provider.environment) {
        service.provider.environment = {};
      }

      const globalVariables = service.custom?.globalVariables || {};
      const version = service.custom?.version || '1.0.0';
      const stage = service.custom?.stage || 'dev';

      const defaultOtelEnvVars = {
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-instrument',
        OTEL_LOGS_EXPORTER: 'none',
        OTEL_PYTHON_DISABLED_INSTRUMENTATIONS: 'logging',
        OTEL_RESOURCE_ATTRIBUTES: `service.name=${this.serverless.service.service},service.version=${version},service.environment=${stage},deployment.environment=${stage}`,
        OTEL_SERVICE_NAME: this.serverless.service.service,
        OTEL_PROPAGATORS: 'tracecontext,baggage,xray'
      };

      if (globalVariables.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT) {
        defaultOtelEnvVars.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = globalVariables.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
      }
      if (globalVariables.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
        defaultOtelEnvVars.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = globalVariables.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
      }
      if (globalVariables.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT) {
        defaultOtelEnvVars.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = globalVariables.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;
      }

      // User-configured values take precedence over defaults
      const otelEnvVars = {
        ...defaultOtelEnvVars,
        ...(pluginConfig.envVars || {})
      };

      Object.keys(otelEnvVars).forEach(key => {
        if (!service.provider.environment[key]) {
          service.provider.environment[key] = otelEnvVars[key];
        }
      });

      this.serverless.cli.log(`Service name: ${this.serverless.service.service}`);
      this.serverless.cli.log(`OpenTelemetry configuration added successfully`);

      this.configurationApplied = true;
      
    } catch (error) {
      this.serverless.cli.log(`Error in OpenTelemetry plugin: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ServerlessAwsOtelPlugin;