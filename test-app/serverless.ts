import type { AWS } from '@serverless/typescript';

const createServerlessConfiguration: () => Promise<AWS> = async () => {
  return {
    service: 'sample-service',
    custom: {
      'serverless-easy-env': {
        envResolutions: {
          apiKeys: {
            prod: ['ssm:apiKeyOnSsm', 'ssm:apiKeyOnSsm2'],
            default: ['env:API_KEY']
          },
          datadogEnabled: {
            prod: true,
            stg: true,
            dev: false,
            local: false,
          },
          someValueLikeSecurityGroups: {
            local: ['random-name'],
            default: ['ssm:abc', 'ssm:def']
          },
        },
      },
    },
    provider: {
      name: 'aws',
      runtime: 'nodejs18.x',
      apiGateway: {
        apiKeys: '${easyenv:apiKeys}' as never,
      },
      vpc: {
        securityGroupIds: '${easyenv:someValueLikeSecurityGroups}',
      } as never,
    },
    plugins: [
      'serverless-easy-env',
      'serverless-offline',
    ],
    package: {
      patterns: ['!**/*', 'src/**/*', '.env.easy*'],
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
