const ServerlessAwsOtelPlugin = require('../index');
const { createMockServerless } = require('./helpers');

describe('Plugin Initialization Tests', () => {
  let serverless;
  let options;

  beforeEach(() => {
    serverless = createMockServerless();
    options = {};
  });

  describe('Constructor initialization', () => {
    test('should initialize with correct serverless instance and options', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(plugin.serverless).toBe(serverless);
      expect(plugin.options).toBe(options);
    });

    test('should register required hooks', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(plugin.hooks).toHaveProperty('before:package:createDeploymentArtifacts');
      expect(plugin.hooks).toHaveProperty('before:aws:package:finalize');
      expect(typeof plugin.hooks['before:package:createDeploymentArtifacts']).toBe('function');
      expect(typeof plugin.hooks['before:aws:package:finalize']).toBe('function');
    });

    test('should bind addOtelConfiguration to both hooks', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(plugin.hooks['before:package:createDeploymentArtifacts'].name).toBe('bound addOtelConfiguration');
      expect(plugin.hooks['before:aws:package:finalize'].name).toBe('bound addOtelConfiguration');
    });

    test('should not execute configuration during construction', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(serverless.service.provider.layers.length).toBe(0);
    });

    test('should create independent plugin instances', () => {
      const plugin1 = new ServerlessAwsOtelPlugin(serverless, options);
      const plugin2 = new ServerlessAwsOtelPlugin(serverless, options);

      plugin1.addOtelConfiguration();

      expect(plugin1.configurationApplied).toBe(true);
      expect(plugin2.configurationApplied).toBeUndefined();
    });

    test('should maintain mutable reference to serverless object', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      serverless.service.service = 'modified-service';
      expect(plugin.serverless.service.service).toBe('modified-service');
    });
  });

  describe('Configuration edge cases', () => {
    test('should not throw with minimal serverless configuration', () => {
      const minimalServerless = {
        service: {
          service: 'test',
          provider: {},
          custom: {}
        },
        cli: { log: jest.fn() }
      };

      expect(() => new ServerlessAwsOtelPlugin(minimalServerless, {})).not.toThrow();
    });

    test.each([
      ['missing custom section', (s) => { delete s.service.custom; }],
      ['undefined otelPlugin', (s) => { s.service.custom.otelPlugin = undefined; }],
      ['null otelPlugin', (s) => { s.service.custom.otelPlugin = null; }],
      ['missing stage', (s) => { delete s.service.custom.stage; }],
      ['missing version', (s) => { delete s.service.custom.version; }],
      ['empty provider', (s) => { s.service.provider = {}; }]
    ])('should handle %s gracefully', (description, modifier) => {
      modifier(serverless);
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      expect(() => plugin.addOtelConfiguration()).not.toThrow();
    });

    test('should use default version when custom.version is missing', () => {
      delete serverless.service.custom.version;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_RESOURCE_ATTRIBUTES).toContain('service.version=1.0.0');
    });

    test('should use custom version when provided', () => {
      serverless.service.custom.version = '2.5.3';
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.OTEL_RESOURCE_ATTRIBUTES).toContain('service.version=2.5.3');
    });
  });

  describe('Configuration idempotency', () => {
    test('should mark configuration as applied after execution', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(plugin.configurationApplied).toBe(true);
    });

    test('should prevent duplicate configuration application', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();
      const initialLayersCount = serverless.service.provider.layers.length;

      plugin.addOtelConfiguration();

      expect(serverless.service.provider.layers.length).toBe(initialLayersCount);
    });

    test('should run configuration only once when both hooks trigger', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);

      plugin.hooks['before:package:createDeploymentArtifacts']();
      plugin.hooks['before:aws:package:finalize']();

      expect(serverless.service.provider.layers.length).toBe(1);
    });
  });

  describe('Provider object initialization', () => {
    test('should create layers array when provider.layers is undefined', () => {
      delete serverless.service.provider.layers;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(Array.isArray(serverless.service.provider.layers)).toBe(true);
    });

    test('should create environment object when provider.environment is undefined', () => {
      delete serverless.service.provider.environment;
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(typeof serverless.service.provider.environment).toBe('object');
    });

    test('should preserve existing layers', () => {
      const existingLayer = 'arn:aws:lambda:us-east-1:123456789:layer:ExistingLayer:1';
      serverless.service.provider.layers = [existingLayer];

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.layers).toContain(existingLayer);
    });

    test('should preserve existing environment variables', () => {
      serverless.service.provider.environment = {
        EXISTING_VAR: 'existing_value',
        ANOTHER_VAR: 'another_value'
      };

      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.service.provider.environment.EXISTING_VAR).toBe('existing_value');
      expect(serverless.service.provider.environment.ANOTHER_VAR).toBe('another_value');
    });
  });

  describe('Logging', () => {
    test('should log service name and success message', () => {
      const plugin = new ServerlessAwsOtelPlugin(serverless, options);
      plugin.addOtelConfiguration();

      expect(serverless.cli.log).toHaveBeenCalledWith('Service name: test-service');
      expect(serverless.cli.log).toHaveBeenCalledWith('OpenTelemetry configuration added successfully');
    });
  });
});
