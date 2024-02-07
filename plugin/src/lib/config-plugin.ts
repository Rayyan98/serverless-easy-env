import { writeFileSync } from 'fs';

export class ConfigPlugin {
  pluginInitialized = false;
  initializationPromise?: Promise<void>;
  configObj: Record<string, any> = {};
  configurationVariablesSources;
  configVariableSources: Record<string, any>;
  stageName?: string;
  envLoaded = false;
  localEnvPath: string;
  failedVariables: Map<string, any> = new Map();
  commands;
  hooks;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(serverless: any, options: any) {
    const service = serverless.service;
    this.configVariableSources = service.custom.configVariableSources;
    this.localEnvPath = service.custom.localEnvPath ?? '.env';

    this.commands = {
      'pull-config': {
        lifecycleEvents: ['create-config-json'],
      },
    };

    this.hooks = {
      'pull-config:create-config-json': () => {
        if (!this.configObj) {
          throw new Error(`Config variable not loaded`);
        } else {
          // eslint-disable-next-line no-console
          console.log('Config Variables loaded successfully');
        }
      },
    };

    this.configurationVariablesSources = {
      initializeConfigPlugin: {
        resolve: async (input: {
          address: any;
          params: any;
          resolveVariable: any;
          options: any;
        }) => {
          await this.initializePlugin(input.resolveVariable);
          return { value: true };
        },
      },
      environment: {
        resolve: async (input: {
          address: any;
          params: any;
          resolveVariable: any;
          options: any;
        }) => {
          return { value: process.env[input.address] };
        },
      },
      config: {
        resolve: async (input: {
          address: any;
          params: any;
          resolveVariable: any;
          options: any;
        }) => {
          await this.initializePlugin(input.resolveVariable);
          if (this.failedVariables.has(input.address)) {
            const error = this.failedVariables.get(input.address);
            throw new Error(
              `Error encountered in loading variable ${input.address}: ` +
                (error.message ?? ''),
            );
          }
          return { value: this.configObj[input.address] };
        },
      },
    };
  }

  private async initializePlugin(resolveVariable: any) {
    if (this.pluginInitialized) {
      return true;
    }
    if (!this.initializationPromise) {
      this.initializationPromise = this.setupPlugin(
        async (configKey, ...args) => {
          try {
            const resp = await resolveVariable(...args);
            return resp;
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(
              'Config Plugin => Unable to resolve variable',
              ...args,
            );
            this.failedVariables.set(configKey, err);
            return undefined;
          }
        },
      );
    }
    try {
      return await this.initializationPromise;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
      throw err;
    }
  }

  private async resolveConfiguration(
    configKey: string,
    confValue: any,
    resolveVariable: (
      configKey: string,
      keyToResolve: string,
    ) => Promise<string>,
  ): Promise<any> {
    if (Array.isArray(confValue)) {
      return await Promise.all(
        confValue.map(
          async (val) =>
            await this.resolveConfiguration(configKey, val, resolveVariable),
        ),
      );
    } else if (typeof confValue === 'object' && confValue != null) {
      const value: any = {};
      const promises: any[] = [];
      const keys = Object.keys(confValue);
      for (const key of keys) {
        promises.push(
          this.resolveConfiguration(configKey, confValue[key], resolveVariable),
        );
      }
      const values = await Promise.all(promises);
      for (const [index, key] of keys.entries()) {
        value[key] = values[index];
      }
      return value;
    } else if (typeof confValue === 'string' && confValue.includes(':')) {
      return await resolveVariable(configKey, confValue);
    } else {
      return confValue;
    }
  }

  private async setupPlugin(
    resolveVariable: (
      configKey: string,
      keyToResolve: string,
    ) => Promise<string>,
  ) {
    const stageName = await resolveVariable('', 'opt:stage');
    if (stageName.toLowerCase().includes('local')) {
      this.stageName = 'local';
    } else {
      this.stageName = stageName;
    }

    const configObj: any = {};
    configObj.IS_LOCAL = `${this.stageName === 'local'}`;

    const promises: any[] = [];
    const keys = Object.keys(this.configVariableSources);
    for (const key of keys) {
      const value = this.configVariableSources[key];
      const resolvableValue = value[this.stageName] ?? value['default'];
      promises.push(
        this.resolveConfiguration(key, resolvableValue, resolveVariable),
      );
    }
    const responses = await Promise.all(promises);
    for (const [index, key] of keys.entries()) {
      configObj[key] = responses[index];
    }

    this.configObj = configObj;
    writeFileSync('./config.json', JSON.stringify(this.configObj), 'utf8');
    // eslint-disable-next-line no-console
    console.log('Config Values Loaded');
  }
}
