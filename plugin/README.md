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
  - [Read Dot Env](#read-dot-env)
  - [Deep Object and Array Resolution](#deep-object-and-array-resolution)
  - [Output Env File](#output-env-file)
  - [Env Matchers](#env-matchers)
- [All Options Example](#all-options-example)

<!-- TOC END -->

## Installation

`npm install serverless-easy-env -D`

## Quick Usage

- The values that a variable should take on for each env or stage that you use can be specified under `custom.serverless-easy-env.envResolutions`.

- In addition to writing values directly you can also specify resolution or variable strings. They should be specified without the `${` and `}`, so the plugin will only resolve them if they are referenced by the current env or stage otherwise they will remain as simple strings.

  - For example if all your variables for the env `local` use `env:` prefix ([serverless environment variables](https://www.serverless.com/framework/docs/providers/aws/guide/variables)) then even if variables for other stages use `ssm:` prefix they will not be resolved so you won't need aws credentials to be configured to run sls offline --stage local.

- You can ask the easy env plugin for the current value of the env variable using the `${easyenv:variable-name}` syntax

- The current env to use to resolve env variables is fetched using the `sls:stage` variable which is defined by serverless as `${opt:stage, self:provider.stage, "dev"}` ([reference](https://www.serverless.com/framework/docs/providers/aws/guide/variables)). You may override it using `custom.serverless-easy-env.env` or capture groups that are covered in features

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
        local:
          - random-name
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
        local:
          - random-name
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
    securityGroupIds:
      - random-name
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

### Read Dot Env

By default the plugin will read the `.env` file to supplement the env resolutions that are performed using the `env:` prefix. It will look for a .env file in the same directory as from which the node process was started (which is usually the same as the directory of the serverless file or from which the serverless command in invoked).

- You can disable this behavior using the `custom.serverless-easy-env.loadDotEnv` option which is true by default.

- The path to the env file can be explicitly specified via the `custom.serverless-easy-env.loadDotEnvFilePath` option. It is `.env` by default and resolved against the directory mentioned before.

### Deep Object and Array Resolution

Variable strings even when deeply nested will get resolved

In short,

```yml
envResolutions:
  someEnvVariable:
    prod:
      someKey1:
        - ssm:apiKeyOnSsm
        - ssm:apiKeyOnSsm2
      someKey2:
        nestedKey2:
          oneMoreNestedKey2:
            - ssm:arrayElementOne
    dev:
      - env:SOME_ENV_VARIABLE
```

or

```typescript
envResolutions: {
  someEnvVariable: {
    prod: {
      someKey1: [
        'ssm:apiKeyOnSsm',
        'ssm:apiKeyOnSsm2',
      ],
      someKey2: {
        nestedKey2: {
          oneMoreNestedKey2; ['ssm:arrayElementOne'],
        },
      },
    },
    default: ['env:SOME_ENV_VARIABLE']
  },
}
```

will work.

### Output Env File

This is useful if you have a lot of env variables that you want to become part of the lambda env variables and are not able to fit them into the 4 KB limit by AWS ([reference](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html)). You can include the file in the lambda code package using

```yaml
patterns:
  - .env.easy*
```

and then load in the lambda or cloud function using, for example

```typescript
import { config } from 'dotenv';
config({ path: '.env.easy'});
```

This file is generated during packaging and deployment using serverless hooks. It is also generated before start when using serverless offline start. You can also create it anytime using the serverless command `sls write-env`.

- By default the complete resolved values of all the variables in envResolutions are written to a `.env.easy` file. This file is created in the same folder from which the sls command is invoked or node process starts.

- You can turn of this behavior using `custom.serverless-easy-env.writeEnvFile: false`

- By default the file is written in a manner so that it can be read by [dotenv](https://www.npmjs.com/package/dotenv), however, this means that if the resolved value of some variable as an object or array, it can get written weirdly. To avoid this you can change env file type to JSON

- Env file type can be controlled using `custom.serverless-easy-env.envFileType`. The only two supported values are `json` and `dotenv`. When json is selected, the default file name is going to be `.env.easy.json`

- The file name of the env file can be controlled through `custom.serverless-easy-env.envFileName` and will override any default

### Env Matchers

This feature is useful if you want to be flexible with your stage name but want them to be mapped onto certain envs that you specified in the `envResolutions`. A case in point is when you want to deploy your stack under a different stage name like `prod-v2` but want to reuse all env variables from ssm from `prod`. The active env is then determined by first passing the value of `${sls:stage}` or `custom.serverless-easy-env.env` through the regex patterns specified under `custom.serverless-easy-env.envMatchers`. The first to match is taken as the active env, otherwise the value itself becomes the active env. The active env can always be fetched using `${easyenv:activeEnv}`.

The keys are the env names which should correspond to those under `envResolutions` and their values are regex patterns in a string. The regex pattern is tested for a full match meaning that if you want capture all stages that start with `local` (example: `local-my-name`) under the env `local` then a pattern of `local.*` must be supplied. Just `local` will not work.

```typescript
envMatchers: {
  local: 'local.*',
}
```

### All Options Example

```yaml
service: sample-service
custom:
  serverless-easy-env:
    writeEnvFile: true
    envFileType: json
    envFileName: .env.easy.generated.json
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
        local:
          - random-name
        default:
          - ssm:abc
          - ssm:def
      aSelfReference:
        default: easyenv:datadogEnabled
    envMatchers:
      local: 'local.*'
    loadDotEnv: true
    loadDotEnvFilePath: .env.with-non-normal-path
provider:
  name: aws
  runtime: nodejs18.x
  apiGateway:
    apiKeys:
      - ${easyenv:apiKeys}
  vpc:
    securityGroupIds: ${easyenv:someValueLikeSecurityGroups}
  randomValue: ${easyenv:aSelfReference}
  activeEnv: ${easyenv:activeEnv}
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
