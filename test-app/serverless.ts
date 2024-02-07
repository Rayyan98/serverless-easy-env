import type { AWS } from '@serverless/typescript';

const createServerlessConfiguration: () => Promise<AWS> = async () => {
  return {
    service: 'sample-service',
    custom: {
      configVariableSources: {},
      'serverless-offline': {
        noPrependStageInUrl: true,
        httpPort: 3060,
        websocketPort: 3061,
        lambdaPort: 3062,
        noTimeout: true,
        host: '0.0.0.0',
      },
    },
    provider: {
      name: 'aws',
      runtime: 'nodejs18.x',
      deploymentMethod: 'direct',
      region: 'us-east-1',
      timeout: 30,
      memorySize: 512,
    },
    plugins: [
      'serverless-easy-env',
      'serverless-offline',
    ],
    package: {
      patterns: ['config.json'],
    },
    functions: {
      main: {
        handler: 'src/main.handler',
        events: [
          {
            http: {
              method: 'GET',
              path: '/',
              cors: true,
            },
          },
        ],
      },
    },
  };
};

module.exports = createServerlessConfiguration();
