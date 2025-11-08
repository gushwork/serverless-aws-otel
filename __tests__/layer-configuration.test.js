const ServerlessAwsOtelPlugin = require('../index');
const { createMockServerless } = require('./helpers');

describe('Layer Configuration Tests', () => {
  let serverless;
  let options;

  beforeEach(() => {
    serverless = createMockServerless();
    options = {};
  });

  describe('Default layer ARN', () => {
    test('should add default OTEL layer ARN when no custom layer is specified', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.layers).toContain(
        'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:18'
      );
    });

    test.each([
      [null, 'null'],
      [undefined, 'undefined'],
      ['', 'empty string']
    ])('should use default ARN when custom layerArn is %s', (value, description) => {
      serverless.service.custom.otelPlugin.layerArn = value;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const defaultArn = 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:18';
      expect(serverless.service.provider.layers).toContain(defaultArn);
    });
  });

  describe('Custom layer ARN', () => {
    test('should use custom layer ARN when provided', () => {
      const customArn = 'arn:aws:lambda:eu-west-1:615299751070:layer:AWSOpenTelemetryDistroPython:20';
      serverless.service.custom.otelPlugin.layerArn = customArn;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.layers).toContain(customArn);
    });

    test.each([
      ['different region', 'arn:aws:lambda:eu-west-1:615299751070:layer:AWSOpenTelemetryDistroPython:18'],
      ['different version', 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:20'],
      ['different account ID', 'arn:aws:lambda:us-east-1:999999999999:layer:AWSOpenTelemetryDistroPython:18'],
      ['hyphenated region', 'arn:aws:lambda:ap-southeast-2:615299751070:layer:AWSOpenTelemetryDistroPython:18'],
      ['AWS China', 'arn:aws-cn:lambda:cn-north-1:615299751070:layer:AWSOpenTelemetryDistroPython:18'],
      ['AWS GovCloud', 'arn:aws-us-gov:lambda:us-gov-west-1:615299751070:layer:AWSOpenTelemetryDistroPython:18'],
      ['version 0', 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:0'],
      ['high version', 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:999'],
      ['custom naming', 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython-Custom:18']
    ])('should accept layer ARN with %s', (description, arn) => {
      serverless.service.custom.otelPlugin.layerArn = arn;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).not.toThrow();
      expect(serverless.service.provider.layers).toContain(arn);
    });

    test('should handle layer ARN with surrounding whitespace', () => {
      const arnWithSpace = ' arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:18 ';
      serverless.service.custom.otelPlugin.layerArn = arnWithSpace;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.layers).toContain(arnWithSpace);
    });
  });

  describe('Layer ARN validation', () => {
    test('should throw error when layer ARN does not contain AWSOpenTelemetryDistroPython', () => {
      const invalidArn = 'arn:aws:lambda:us-east-1:123456789:layer:SomeOtherLayer:1';
      serverless.service.custom.otelPlugin.layerArn = invalidArn;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow(
        'Invalid layer ARN. Please use the correct layer ARN for AWS OpenTelemetry Distro Python.'
      );
    });

    test('should validate layer ARN with case sensitivity', () => {
      const wrongCaseArn = 'arn:aws:lambda:us-east-1:615299751070:layer:awsopentelemetrydistropython:18';
      serverless.service.custom.otelPlugin.layerArn = wrongCaseArn;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow();
    });

    test.each([
      ['incorrect layer name', 'arn:aws:lambda:us-east-1:615299751070:layer:WrongLayerName:18'],
      ['partial name', 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetry:18']
    ])('should reject layer ARN with %s', (description, arn) => {
      serverless.service.custom.otelPlugin.layerArn = arn;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).toThrow();
    });

    test('should accept layer ARN with hyphens if it contains required substring', () => {
      const malformedArn = 'arn-aws-lambda-us-east-1-615299751070-layer-AWSOpenTelemetryDistroPython-18';
      serverless.service.custom.otelPlugin.layerArn = malformedArn;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).not.toThrow();
      expect(serverless.service.provider.layers).toContain(malformedArn);
    });
  });

  describe('Layer deduplication', () => {
    test('should not add duplicate layer ARN if already present', () => {
      const layerArn = 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:18';
      serverless.service.provider.layers = [layerArn];

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.layers.filter(l => l === layerArn).length).toBe(1);
    });

    test('should add layer ARN even if different version exists', () => {
      const existingArn = 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:17';
      const newArn = 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:18';
      serverless.service.provider.layers = [existingArn];

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.layers).toContain(newArn);
      expect(serverless.service.provider.layers.length).toBe(2);
    });

    test('should add layer ARN even if different region exists', () => {
      const usEastArn = 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:18';
      const euWestArn = 'arn:aws:lambda:eu-west-1:615299751070:layer:AWSOpenTelemetryDistroPython:18';
      serverless.service.provider.layers = [usEastArn];
      serverless.service.custom.otelPlugin.layerArn = euWestArn;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.layers).toContain(euWestArn);
      expect(serverless.service.provider.layers.length).toBe(2);
    });

    test('should perform exact string match for layer deduplication', () => {
      const arn1 = 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:18';
      const arn2 = 'arn:aws:lambda:us-east-1:615299751070:layer:AWSOpenTelemetryDistroPython:18 ';
      serverless.service.provider.layers = [arn1];
      serverless.service.custom.otelPlugin.layerArn = arn2;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.layers.length).toBe(2);
    });
  });

  describe('Layer ordering and preservation', () => {
    test('should append OTEL layer to end of existing layers', () => {
      const layer1 = 'arn:aws:lambda:us-east-1:123:layer:Layer1:1';
      const layer2 = 'arn:aws:lambda:us-east-1:123:layer:Layer2:1';
      serverless.service.provider.layers = [layer1, layer2];

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.layers[0]).toBe(layer1);
      expect(serverless.service.provider.layers[1]).toBe(layer2);
      expect(serverless.service.provider.layers[2]).toContain('AWSOpenTelemetryDistroPython');
    });

    test('should maintain layer order consistency across runs', () => {
      const existingLayers = [
        'arn:aws:lambda:us-east-1:123:layer:Layer1:1',
        'arn:aws:lambda:us-east-1:123:layer:Layer2:1',
        'arn:aws:lambda:us-east-1:123:layer:Layer3:1'
      ];
      serverless.service.provider.layers = [...existingLayers];

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      for (let i = 0; i < existingLayers.length; i++) {
        expect(serverless.service.provider.layers[i]).toBe(existingLayers[i]);
      }
    });

    test('should handle null provider.layers gracefully', () => {
      serverless.service.provider.layers = null;

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(Array.isArray(serverless.service.provider.layers)).toBe(true);
      expect(serverless.service.provider.layers.length).toBeGreaterThan(0);
    });
  });

  describe('Layer configuration persistence', () => {
    test('should maintain layer configuration after JSON serialization', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      const serialized = JSON.stringify(serverless.service.provider.layers);
      const deserialized = JSON.parse(serialized);

      expect(deserialized[0]).toContain('AWSOpenTelemetryDistroPython');
    });
  });

  describe('Multiple plugin instances', () => {
    test('should handle multiple plugin instances with different layer ARNs', () => {
      const serverless2 = JSON.parse(JSON.stringify(serverless));
      serverless2.service.provider.layers = [];
      serverless2.cli = { log: jest.fn() };

      const customArn = 'arn:aws:lambda:eu-west-1:615299751070:layer:AWSOpenTelemetryDistroPython:20';
      serverless2.service.custom.otelPlugin.layerArn = customArn;

      const plugin1 = new ServerlessAwsOtelPlugin(serverless, options);
      const plugin2 = new ServerlessAwsOtelPlugin(serverless2, options);

      plugin1.addOtelConfiguration();
      plugin2.addOtelConfiguration();

      expect(serverless.service.provider.layers[0]).toContain('us-east-1');
      expect(serverless2.service.provider.layers[0]).toContain('eu-west-1');
    });
  });
});
