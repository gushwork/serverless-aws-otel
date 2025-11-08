const createMockServerless = (overrides = {}) => {
  const defaults = {
    service: {
      service: 'test-service',
      provider: {
        layers: [],
        environment: {}
      },
      custom: {
        stage: 'dev',
        version: '1.0.0',
        otelPlugin: {}
      }
    },
    cli: {
      log: jest.fn()
    }
  };

  return deepMerge(defaults, overrides);
};

const deepMerge = (target, source) => {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
};

const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

module.exports = {
  createMockServerless
};
