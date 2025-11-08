const ServerlessAwsOtelPlugin = require('../index');
const { createMockServerless } = require('./helpers');

describe('Error Handling Tests', () => {
  let serverless;
  let options;

  beforeEach(() => {
    serverless = createMockServerless();
    options = {};
  });

  describe('Layer ARN validation errors', () => {
    test('should throw error with message when layer ARN is invalid', () => {
      serverless.service.custom.otelPlugin.layerArn = 'arn:aws:lambda:us-east-1:123:layer:InvalidLayer:1';
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow(
        'Invalid layer ARN. Please use the correct layer ARN for AWS OpenTelemetry Distro Python.'
      );
    });

    test.each([
      ['wrong layer name', 'arn:aws:lambda:us-east-1:615299751070:layer:WrongLayerName:18'],
      ['partial name match', 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetry:18'],
      ['SQL injection attempt', "arn'; DROP TABLE layers; --"]
    ])('should reject layer ARN with %s', (description, invalidArn) => {
      serverless.service.custom.otelPlugin.layerArn = invalidArn;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow();
    });
  });

  describe('Error logging and propagation', () => {
    test('should log error message to CLI when error occurs', () => {
      serverless.service.custom.otelPlugin.layerArn = 'invalid-arn';
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow();
      expect(serverless.cli.log).toHaveBeenCalledWith(expect.stringContaining('Error in OpenTelemetry plugin:'));
    });

    test('should re-throw error after logging', () => {
      serverless.service.custom.otelPlugin.layerArn = 'invalid-arn';
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow();
    });

    test('should preserve error stack trace', () => {
      serverless.service.custom.otelPlugin.layerArn = 'invalid-arn';
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      try {
        plugin.addOtelConfiguration();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.stack).toBeDefined();
        expect(typeof error.stack).toBe('string');
      }
    });
  });

  describe('Missing or invalid configuration', () => {
    test('should throw error when serverless.service is missing', () => {
      delete serverless.service;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow();
    });

    test('should throw error when serverless.service.provider is missing', () => {
      delete serverless.service.provider;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow();
    });

    test('should throw error when serverless.cli is missing', () => {
      delete serverless.cli;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow();
    });

    test('should handle missing service name without throwing', () => {
      delete serverless.service.service;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      plugin.addOtelConfiguration();
      expect(serverless.service.provider.environment.OTEL_SERVICE_NAME).toBeUndefined();
    });

    test('should handle malformed serverless object structure', () => {
      serverless.service = 'not-an-object';
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow();
    });

    test('should handle invalid custom section type with fallbacks', () => {
      serverless.service.custom = 'not-an-object';
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      plugin.addOtelConfiguration();
      expect(serverless.service.provider.environment.OTEL_RESOURCE_ATTRIBUTES).toContain('service.version=1.0.0');
      expect(serverless.service.provider.environment.OTEL_RESOURCE_ATTRIBUTES).toContain('service.environment=dev');
    });
  });

  describe('Error state management', () => {
    test('should not modify layers when error occurs during validation', () => {
      serverless.service.custom.otelPlugin.layerArn = 'invalid-arn';
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      const originalLayersLength = serverless.service.provider.layers.length;

      try {
        plugin.addOtelConfiguration();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(serverless.service.provider.layers.length).toBe(originalLayersLength);
      }
    });

    test('should not mark configuration as applied when error occurs', () => {
      serverless.service.custom.otelPlugin.layerArn = 'invalid-arn';
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      try {
        plugin.addOtelConfiguration();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(plugin.configurationApplied).toBeUndefined();
      }
    });

    test('should throw error consistently on multiple failed attempts', () => {
      serverless.service.custom.otelPlugin.layerArn = 'invalid-arn';
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow();
      expect(() => plugin.addOtelConfiguration()).toThrow();
    });

    test('should allow successful configuration after fixing error', () => {
      serverless.service.custom.otelPlugin.layerArn = 'invalid-arn';
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow();

      serverless.service.custom.otelPlugin.layerArn = 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:18';
      delete plugin.configurationApplied;

      expect(() => plugin.addOtelConfiguration()).not.toThrow();
    });
  });

  describe('Edge cases and special values', () => {
    test('should not allow prototype pollution through envVars', () => {
      const originalPrototype = Object.getPrototypeOf({});

      serverless.service.custom.otelPlugin.envVars = {
        '__proto__': { polluted: true },
        'constructor': { polluted: true }
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const testObj = {};
      expect(testObj.polluted).toBeUndefined();
      expect(Object.getPrototypeOf(testObj)).toBe(originalPrototype);
    });

    test('should handle very large environment variable values', () => {
      const largeValue = 'x'.repeat(10000);
      serverless.service.custom.otelPlugin.envVars = {
        LARGE_VAR: largeValue
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).not.toThrow();
      expect(serverless.service.provider.environment.LARGE_VAR).toBe(largeValue);
    });

    test.each([
      ['newlines', 'line1\nline2\nline3'],
      ['unicode characters', '🔥 テスト 测试 тест']
    ])('should handle environment variables with %s', (description, value) => {
      serverless.service.custom.otelPlugin.envVars = {
        TEST_VAR: value
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).not.toThrow();
      expect(serverless.service.provider.environment.TEST_VAR).toBe(value);
    });

    test('should handle function values in envVars', () => {
      serverless.service.custom.otelPlugin.envVars = {
        FUNCTION_VAR: function() { return 'test'; }
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).not.toThrow();
    });
  });

  describe('Error handling with circular references', () => {
    test('should handle circular references in custom configuration', () => {
      const circular = { a: {} };
      circular.a.b = circular;
      serverless.service.custom.circular = circular;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).not.toThrow();
    });
  });

  describe('Error handling with missing stage', () => {
    test('should handle missing stage gracefully in resource attributes', () => {
      delete serverless.service.custom.stage;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).not.toThrow();
      expect(serverless.service.provider.environment.OTEL_RESOURCE_ATTRIBUTES).toBeDefined();
    });
  });

  describe('Concurrent error scenarios', () => {
    test('should handle concurrent configuration attempts with errors', () => {
      const plugin1 = new ServerlessAwsOtelPlugin(serverless, options);

      const serverless2 = JSON.parse(JSON.stringify(serverless));
      serverless2.service.provider.layers = [];
      serverless2.cli = { log: jest.fn() };
      serverless2.service.custom.otelPlugin.layerArn = 'invalid-arn';
      const plugin2 = new ServerlessAwsOtelPlugin(serverless2, options);

      expect(() => plugin1.addOtelConfiguration()).not.toThrow();
      expect(() => plugin2.addOtelConfiguration()).toThrow();
      expect(plugin1.configurationApplied).toBe(true);
      expect(plugin2.configurationApplied).toBeUndefined();
    });
  });
});
