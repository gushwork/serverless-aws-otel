const ServerlessAwsOtelPlugin = require('../index');
const { createMockServerless } = require('./helpers');

describe('Environment Variables Tests', () => {
  let serverless;
  let options;

  beforeEach(() => {
    serverless = createMockServerless();
    options = {};
  });

  describe('Default environment variables', () => {
    test('should set all default OTEL environment variables', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;
      expect(env.AWS_LAMBDA_EXEC_WRAPPER).toBe('/opt/otel-instrument');
      expect(env.OTEL_LOGS_EXPORTER).toBe('none');
      expect(env.OTEL_PYTHON_DISABLED_INSTRUMENTATIONS).toBe('logging');
      expect(env.OTEL_SERVICE_NAME).toBe('test-service');
      expect(env.OTEL_PROPAGATORS).toBe('tracecontext,baggage,xray');
    });

    test('should set all expected environment variable keys', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const envKeys = Object.keys(serverless.service.provider.environment);
      expect(envKeys).toEqual(expect.arrayContaining([
        'AWS_LAMBDA_EXEC_WRAPPER',
        'OTEL_LOGS_EXPORTER',
        'OTEL_PYTHON_DISABLED_INSTRUMENTATIONS',
        'OTEL_RESOURCE_ATTRIBUTES',
        'OTEL_SERVICE_NAME',
        'OTEL_PROPAGATORS'
      ]));
    });
  });

  describe('OTEL_RESOURCE_ATTRIBUTES', () => {
    test('should include service name, version, and environment', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const resourceAttrs = serverless.service.provider.environment.OTEL_RESOURCE_ATTRIBUTES;
      expect(resourceAttrs).toContain('service.name=test-service');
      expect(resourceAttrs).toContain('service.version=1.0.0');
      expect(resourceAttrs).toContain('service.environment=dev');
      expect(resourceAttrs).toContain('deployment.environment=dev');
    });

    test('should use custom stage and version when provided', () => {
      serverless.service.custom.stage = 'production';
      serverless.service.custom.version = '2.3.4';

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const resourceAttrs = serverless.service.provider.environment.OTEL_RESOURCE_ATTRIBUTES;
      expect(resourceAttrs).toContain('service.version=2.3.4');
      expect(resourceAttrs).toContain('service.environment=production');
    });

    test('should allow complete override via envVars', () => {
      const customAttributes = 'service.name=custom,service.version=3.0.0,custom.attribute=value';
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_RESOURCE_ATTRIBUTES: customAttributes
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_RESOURCE_ATTRIBUTES).toBe(customAttributes);
    });
  });

  describe('Custom envVars configuration', () => {
    test('should override default values with custom envVars', () => {
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_LOGS_EXPORTER: 'otlp',
        OTEL_PYTHON_DISABLED_INSTRUMENTATIONS: 'logging,requests'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_LOGS_EXPORTER).toBe('otlp');
      expect(serverless.service.provider.environment.OTEL_PYTHON_DISABLED_INSTRUMENTATIONS).toBe('logging,requests');
    });

    test('should add new environment variables not in defaults', () => {
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_TRACES_EXPORTER: 'console',
        CUSTOM_VAR: 'custom_value'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_TRACES_EXPORTER).toBe('console');
      expect(serverless.service.provider.environment.CUSTOM_VAR).toBe('custom_value');
    });

    test('should override multiple default values simultaneously', () => {
      serverless.service.custom.otelPlugin.envVars = {
        AWS_LAMBDA_EXEC_WRAPPER: '/custom/wrapper',
        OTEL_LOGS_EXPORTER: 'otlp',
        OTEL_PYTHON_DISABLED_INSTRUMENTATIONS: 'urllib,httpx',
        OTEL_PROPAGATORS: 'b3,w3c'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const env = serverless.service.provider.environment;
      expect(env.AWS_LAMBDA_EXEC_WRAPPER).toBe('/custom/wrapper');
      expect(env.OTEL_LOGS_EXPORTER).toBe('otlp');
      expect(env.OTEL_PYTHON_DISABLED_INSTRUMENTATIONS).toBe('urllib,httpx');
      expect(env.OTEL_PROPAGATORS).toBe('b3,w3c');
    });
  });

  describe('Environment variable precedence', () => {
    test('should not override existing provider environment variables', () => {
      serverless.service.provider.environment = {
        OTEL_SERVICE_NAME: 'existing-service-name',
        CUSTOM_EXISTING_VAR: 'existing_value'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_SERVICE_NAME).toBe('existing-service-name');
      expect(serverless.service.provider.environment.CUSTOM_EXISTING_VAR).toBe('existing_value');
    });

    test('should respect precedence: existing provider > envVars > defaults', () => {
      serverless.service.provider.environment = {
        OTEL_LOGS_EXPORTER: 'provider-value'
      };
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_LOGS_EXPORTER: 'envVars-value',
        OTEL_SERVICE_NAME: 'envVars-service'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_LOGS_EXPORTER).toBe('provider-value');
      expect(serverless.service.provider.environment.OTEL_SERVICE_NAME).toBe('envVars-service');
    });

    test('should ensure envVars takes precedence over defaults when duplicate keys exist', () => {
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_SERVICE_NAME: 'overridden-service-name',
        OTEL_PROPAGATORS: 'custom-propagator'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_SERVICE_NAME).toBe('overridden-service-name');
      expect(serverless.service.provider.environment.OTEL_PROPAGATORS).toBe('custom-propagator');
    });
  });

  describe('envVars edge cases', () => {
    test.each([
      [null, 'null'],
      [undefined, 'undefined'],
      [{}, 'empty object']
    ])('should handle %s envVars gracefully', (value, description) => {
      serverless.service.custom.otelPlugin.envVars = value;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).not.toThrow();
      expect(serverless.service.provider.environment.AWS_LAMBDA_EXEC_WRAPPER).toBe('/opt/otel-instrument');
    });

    test.each([
      [true, false, 'boolean values'],
      [100, 5000, 'numeric values'],
      ['', 'value', 'empty string values']
    ])('should handle %s and %s (%s) in envVars', (value1, value2, description) => {
      serverless.service.custom.otelPlugin.envVars = {
        VAR1: value1,
        VAR2: value2
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.VAR1).toBe(value1);
      expect(serverless.service.provider.environment.VAR2).toBe(value2);
    });

    test('should handle special characters in envVars values', () => {
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_SPECIAL: 'value-with-dashes_and_underscores.and.dots',
        OTEL_URL: 'https://example.com:4317/v1/traces?query=param'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_SPECIAL).toBe('value-with-dashes_and_underscores.and.dots');
      expect(serverless.service.provider.environment.OTEL_URL).toBe('https://example.com:4317/v1/traces?query=param');
    });

    test('should handle complex string values in envVars', () => {
      const complexValue = 'key1=value1,key2=value2,key3="value with spaces"';
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_COMPLEX: complexValue
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_COMPLEX).toBe(complexValue);
    });

    test('should preserve Serverless variable syntax in envVars', () => {
      serverless.service.custom.otelPlugin.envVars = {
        OTEL_SERVICE_NAME: '${self:service}',
        OTEL_STAGE: '${self:custom.stage}'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_SERVICE_NAME).toBe('${self:service}');
      expect(serverless.service.provider.environment.OTEL_STAGE).toBe('${self:custom.stage}');
    });
  });

  describe('Configuration immutability', () => {
    test('should not mutate original envVars object in plugin config', () => {
      const originalEnvVars = {
        OTEL_LOGS_EXPORTER: 'otlp'
      };
      serverless.service.custom.otelPlugin.envVars = originalEnvVars;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(originalEnvVars).toEqual({ OTEL_LOGS_EXPORTER: 'otlp' });
      expect(Object.keys(originalEnvVars).length).toBe(1);
    });
  });

  describe('Service configuration', () => {
    test('should use service name from serverless config', () => {
      serverless.service.service = 'my-awesome-service';

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_SERVICE_NAME).toBe('my-awesome-service');
    });
  });
});
