# Serverless Easy Env

[![NPM version](https://img.shields.io/npm/v/serverless-easy-env.svg?style=flat-square)](https://www.npmjs.com/package/serverless-easy-env)

Simplifying stage and environment wise variables and values

## Table of Contents

<!-- TOC -->

- [Installation](#installation)
- [Quick Usage](#quick-usage)
  - [Serverless ts](#serverless-ts)
  - [Serverless yml](#serverless-yml)
  - [Resolved Serverless File](#resolved-serverless-file)
- [Features](#features)

<!-- TOC END -->

## Installation

`npm install serverless-easy-env -D`

## Quick Usage

- The values that a variable should take on for each env or stage that you use can be specified under `custom.serverless-easy-env.envResolutions`.

- In addition to writing values directly you can also specify resolution or variable strings. They should be specified without the `${` and `}`, so the plugin will only resolve them if they are referenced by the current env or stage otherwise they will remain as simple strings.

  - For example if all your variables for the env `local` use `env:` prefix ([serverless environment variables](https://www.serverless.com/framework/docs/providers/aws/guide/variables)) then even if variables for other stages use `ssm:` prefix they will not be resolved so you won't need aws credentials to be configured run sls offline.
- You can ask the easy env plugin for the current value of the env variable using the `${easyenv:variable-name}` syntax

- The current env to use to resolve env variables is fetched using the `sls:stage` variable which is defined by serverless as `${opt:stage, self:provider.stage, "dev"}` ([reference](https://www.serverless.com/framework/docs/providers/aws/guide/variables))

- In addition to per env values for env variables, you can specify a `default` as well which increases convenience greatly. If an env specific value is not specified for some env variable then the default value is checked. If that is not found either then an error might be thrown

Sample usage for serverless.ts and serverless yaml follow, followed by the resolved sls file viewed by running sls print

### Serverless ts

```typescript
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
            local: [],
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
```

### Serverless yml

```yaml
service: sample-service
custom:
  serverless-easy-env:
    envResolutions:
      apiKeys:
        prod:
          - ssm:apiKeyOnSsm
          - ssm:apiKeyOnSsm2
        default:
          - env:API_KEY
      datadogEnabled:
        prod: true
        stg: true
        dev: false
        local: false
      someValueLikeSecurityGroups:
        local: []
        default:
          - ssm:abc
          - ssm:def
provider:
  name: aws
  runtime: nodejs18.x
  apiGateway:
    apiKeys:
      - ${easyenv:apiKeys}
  vpc:
    securityGroupIds: ${easyenv:someValueLikeSecurityGroups}
plugins:
  - serverless-easy-env
  - serverless-offline
package:
  patterns:
    - '!**/*'
    - src/**/*
    - .env.easy*
functions:
  main:
    handler: src/main.handler
    events:
      - http:
          method: GET
          path: /
          cors: true
```

### Resolved Serverless File

Running `sls print --stage local`

```yaml
service: sample-service
custom:
  serverless-easy-env:
    envResolutions:
      apiKeys:
        prod:
          - ssm:apiKeyOnSsm
          - ssm:apiKeyOnSsm2
        default:
          - env:API_KEY
      datadogEnabled:
        prod: true
        stg: true
        dev: false
        local: false
      someValueLikeSecurityGroups:
        local: []
        default:
          - ssm:abc
          - ssm:def
provider:
  name: aws
  runtime: nodejs18.x
  apiGateway:
    apiKeys:
      - some-api-key-that-exported-in-env
  vpc:
    securityGroupIds: []
  stage: dev
  region: us-east-1
  versionFunctions: true
plugins:
  - serverless-easy-env
  - serverless-offline
package:
  patterns:
    - '!**/*'
    - src/**/*
    - .env.easy*
  artifactsS3KeyDirname: serverless/sample-service/local/code-artifacts
functions:
  main:
    handler: src/main.handler
    events:
      - http:
          method: GET
          path: /
          cors: true
    name: sample-service-local-main
```

## Features
