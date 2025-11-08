const ServerlessAwsOtelPlugin = require('../index');
const { createMockServerless } = require('./helpers');

describe('Global Variables Integration Tests', () => {
  let serverless;
  let options;

  beforeEach(() => {
    serverless = createMockServerless();
    options = {};
  });

  describe('Basic functionality', () => {
    test('should work without globalVariables section', () => {
      delete serverless.service.custom.globalVariables;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      expect(() => plugin.addOtelConfiguration()).not.toThrow();
    });

    test.each([
      [null, 'null'],
      [undefined, 'undefined'],
      [{}, 'empty object']
    ])('should handle %s globalVariables gracefully', (value, description) => {
      serverless.service.custom.globalVariables = value;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      expect(() => plugin.addOtelConfiguration()).not.toThrow();
    });
  });

  describe('OTLP endpoint configuration', () => {
    test('should add all three OTLP endpoints from globalVariables', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://traces.example.com',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://metrics.example.com',
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'https://logs.example.com'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;
      expect(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('https://traces.example.com');
      expect(env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT).toBe('https://metrics.example.com');
      expect(env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT).toBe('https://logs.example.com');
    });

    test('should handle partial OTLP endpoints in globalVariables', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://traces.example.com'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;
      expect(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('https://traces.example.com');
      expect(env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT).toBeUndefined();
      expect(env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT).toBeUndefined();
    });

    test.each([
      ['traces', 'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'],
      ['metrics', 'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'],
      ['logs', 'OTEL_EXPORTER_OTLP_LOGS_ENDPOINT']
    ])('should handle single %s endpoint', (type, envKey) => {
      serverless.service.custom.globalVariables = {
        [envKey]: `https://${type}.example.com`
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment[envKey]).toBe(`https://${type}.example.com`);
    });

    test('should handle OTLP endpoints with ports', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://traces.example.com:4317',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'http://metrics.example.com:4318'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('https://traces.example.com:4317');
      expect(serverless.service.provider.environment.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT).toBe('http://metrics.example.com:4318');
    });

    test('should handle OTLP endpoints with paths', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://collector.example.com/v1/traces',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://collector.example.com/v1/metrics',
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'https://collector.example.com/v1/logs'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;
      expect(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('https://collector.example.com/v1/traces');
      expect(env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT).toBe('https://collector.example.com/v1/metrics');
      expect(env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT).toBe('https://collector.example.com/v1/logs');
    });
  });

  describe('Value filtering and validation', () => {
    test.each([
      [null, 'null'],
      [undefined, 'undefined'],
      ['', 'empty string']
    ])('should ignore %s values in globalVariables', (value, description) => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: value,
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://metrics.example.com'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBeUndefined();
      expect(serverless.service.provider.environment.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT).toBe('https://metrics.example.com');
    });

    test('should ignore non-OTLP variables in globalVariables', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://traces.example.com',
        SOME_OTHER_VAR: 'some-value',
        API_KEY: 'secret-key'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;
      expect(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('https://traces.example.com');
      expect(env.SOME_OTHER_VAR).toBeUndefined();
      expect(env.API_KEY).toBeUndefined();
    });

    test('should handle non-string values in globalVariables OTLP endpoints', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 12345,
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: true
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe(12345);
      expect(serverless.service.provider.environment.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT).toBe(true);
    });
  });

  describe('Precedence and interaction with envVars', () => {
    test('should prioritize envVars over globalVariables for same key', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://global-traces.example.com'
      };
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://envvars-traces.example.com'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('https://envvars-traces.example.com');
    });

    test('should allow envVars to override all OTLP endpoints from globalVariables', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://global-traces.example.com',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://global-metrics.example.com',
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'https://global-logs.example.com'
      };
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://override-traces.example.com',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://override-metrics.example.com',
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'https://override-logs.example.com'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;
      expect(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('https://override-traces.example.com');
      expect(env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT).toBe('https://override-metrics.example.com');
      expect(env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT).toBe('https://override-logs.example.com');
    });

    test('should handle both globalVariables and envVars simultaneously', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://global-traces.example.com',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://global-metrics.example.com'
      };
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_LOGS_EXPORTER: 'otlp',
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'https://custom-logs.example.com'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;
      expect(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('https://global-traces.example.com');
      expect(env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT).toBe('https://global-metrics.example.com');
      expect(env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT).toBe('https://custom-logs.example.com');
      expect(env.OTEL_LOGS_EXPORTER).toBe('otlp');
    });

    test('should respect existing provider environment over globalVariables', () => {
      serverless.service.provider.environment = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://existing-traces.example.com'
      };
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://global-traces.example.com'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('https://existing-traces.example.com');
    });

    test('should maintain correct precedence: provider > envVars > globalVariables > defaults', () => {
      serverless.service.provider.environment = {
        OTEL_LOGS_EXPORTER: 'provider-value'
      };
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://global-traces.example.com',
        OTEL_PYTHON_DISABLED_INSTRUMENTATIONS: 'global-instrumentations'
      };
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_PYTHON_DISABLED_INSTRUMENTATIONS: 'envvars-instrumentations',
        OTEL_PROPAGATORS: 'envvars-propagators'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;
      expect(env.OTEL_LOGS_EXPORTER).toBe('provider-value');
      expect(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('https://global-traces.example.com');
      expect(env.OTEL_PYTHON_DISABLED_INSTRUMENTATIONS).toBe('envvars-instrumentations');
      expect(env.OTEL_PROPAGATORS).toBe('envvars-propagators');
    });
  });

  describe('Backward compatibility and integration', () => {
    test('should work with only globalVariables without envVars', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://company-traces.internal',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://company-metrics.internal',
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'https://company-logs.internal'
      };
      delete serverless.service.custom.otelPlugin.envVars;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;
      expect(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('https://company-traces.internal');
      expect(env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT).toBe('https://company-metrics.internal');
      expect(env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT).toBe('https://company-logs.internal');
    });

    test('should not interfere with default OTEL variables', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://traces.example.com'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;
      expect(env.AWS_LAMBDA_EXEC_WRAPPER).toBe('/opt/otel-instrument');
      expect(env.OTEL_LOGS_EXPORTER).toBe('none');
      expect(env.OTEL_SERVICE_NAME).toBe('test-service');
    });

    test('should not duplicate OTLP endpoints on multiple runs', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://traces.example.com'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();
      const firstValue = serverless.service.provider.environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

      plugin.addOtelConfiguration();
      expect(serverless.service.provider.environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe(firstValue);
    });

    test('should preserve Serverless variable syntax in globalVariables', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: '${env:TRACES_ENDPOINT}',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: '${ssm:/metrics/endpoint}'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('${env:TRACES_ENDPOINT}');
      expect(serverless.service.provider.environment.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT).toBe('${ssm:/metrics/endpoint}');
    });
  });

  describe('Complex integration scenarios', () => {
    test('should correctly merge environment from all three sources', () => {
      serverless.service.provider.environment = {
        EXISTING_VAR: 'existing',
        OTEL_SERVICE_NAME: 'provider-service'
      };
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://global-traces.example.com',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://global-metrics.example.com',
        ANOTHER_GLOBAL_VAR: 'not-used'
      };
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_LOGS_EXPORTER: 'otlp',
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'https://envvars-logs.example.com',
        CUSTOM_OTEL_VAR: 'custom-value'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;

      // Provider wins
      expect(env.EXISTING_VAR).toBe('existing');
      expect(env.OTEL_SERVICE_NAME).toBe('provider-service');

      // globalVariables are used
      expect(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT).toBe('https://global-traces.example.com');
      expect(env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT).toBe('https://global-metrics.example.com');

      // envVars are used
      expect(env.OTEL_LOGS_EXPORTER).toBe('otlp');
      expect(env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT).toBe('https://envvars-logs.example.com');
      expect(env.CUSTOM_OTEL_VAR).toBe('custom-value');

      // Non-OTLP globalVariables are not used
      expect(env.ANOTHER_GLOBAL_VAR).toBeUndefined();

      // Defaults still apply
      expect(env.AWS_LAMBDA_EXEC_WRAPPER).toBe('/opt/otel-instrument');
    });

    test('should not affect non-OTLP default variables when globalVariables has endpoints', () => {
      serverless.service.custom.globalVariables = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://traces.example.com',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://metrics.example.com',
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: 'https://logs.example.com'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;
      expect(env.OTEL_PROPAGATORS).toBe('tracecontext,baggage,xray');
      expect(env.OTEL_PYTHON_DISABLED_INSTRUMENTATIONS).toBe('logging');
    });
  });
});
