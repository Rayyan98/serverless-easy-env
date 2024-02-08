import chalk from "chalk";

export class ConfigPlugin {
  configurationVariablesSources;

  env: string;
  envNameInitializedPromise?: Promise<void>;

  envResolutions: Record<string, any>;
  envResolutionsPromises = new Map<string, Promise<unknown>>();
  envResolutionsResponses = new Map<
    string,
    {
      status: "resolved" | "failed";
      value: unknown;
      error?: unknown;
    }
  >();

  firstCall = true;

  constructor(serverless: any, options: any) {
    const pluginConfiguration =
      serverless.service.custom["serverless-easy-env"];

    this.envResolutions = pluginConfiguration?.envResolutions ?? {};
    this.env = pluginConfiguration?.env;

    this.configurationVariablesSources = {
      easyenv: {
        resolve: async (input: {
          address: any;
          params: any;
          resolveVariable: any;
          options: any;
        }) => {
          await this.initializePlugin(input.resolveVariable, input.address);

          const variableResult = this.envResolutionsResponses!.get(
            input.address
          );
          if (!variableResult) {
            console.error(
              chalk.green("Serverless Easy Env =>"),
              chalk.red(`Env resolution not defined for`),
              chalk.blue(`\${${input.address}}`)
            );
            throw new Error(
              `Variable resolution not defined for ${input.address}`
            );
          }
          if (variableResult!.status === "failed") {
            console.error(
              chalk.green("Serverless Easy Env =>"),
              chalk.red(`Env resolution failed for`),
              chalk.blue(`\${${input.address}}`)
            );
            console.error(variableResult.error);
            throw new Error(variableResult.error as never);
          }
          return { value: variableResult.value };
        },
      },
    };
  }

  private async initializeEnvName(
    resolveVariable: (key: string) => Promise<any>
  ) {
    if (this.env) {
      return;
    }

    const defaultEnvSource = "opt:stage";

    if (!this.envNameInitializedPromise) {
      this.envNameInitializedPromise = resolveVariable(defaultEnvSource).then(
        (value) => {
          this.env = value;
        }
      );
    }
    try {
      await this.envNameInitializedPromise;
    } catch (err) {
      console.error(
        chalk.green("Serverless Easy Env =>"),
        chalk.red(`Could not infer env name from source`),
        chalk.blue(`\${${defaultEnvSource}}`)
      );
      console.error(err);
      throw err;
    }
  }

  private async resolveEnvVariables(resolveVariable: any, key?: string) {
    await this.setupPlugin(async (resolutionString) => {
      try {
        const resp = await resolveVariable(resolutionString);
        return resp;
      } catch (err) {
        console.error(
          chalk.green("Serverless Easy Env =>"),
          chalk.red(`Unable to resolve env`),
          chalk.blue(`\${${resolutionString}}`)
        );
        throw err;
      }
    }, key);
  }

  private async initializePlugin(resolveVariable: any, key: string) {
    await this.initializeEnvName(resolveVariable);

    if (this.firstCall) {
      this.firstCall = false;
      await this.resolveEnvVariables(resolveVariable);
    }
    await this.resolveEnvVariables(resolveVariable, key);
  }

  private async resolveConfiguration(
    confValue: any,
    resolveVariable: (keyToResolve: string) => Promise<string>
  ): Promise<any> {
    if (Array.isArray(confValue)) {
      return await Promise.all(
        confValue.map(
          async (val) => await this.resolveConfiguration(val, resolveVariable)
        )
      );
    } else if (typeof confValue === "object" && confValue != null) {
      const value: any = {};
      const promises: any[] = [];
      const keys = Object.keys(confValue);
      for (const key of keys) {
        promises.push(
          this.resolveConfiguration(confValue[key], resolveVariable)
        );
      }
      const values = await Promise.all(promises);
      for (const [index, key] of keys.entries()) {
        value[key] = values[index];
      }
      return value;
    } else if (typeof confValue === "string" && confValue.includes(":")) {
      return await resolveVariable(confValue);
    } else {
      return confValue;
    }
  }

  private async setupPlugin(
    resolveVariable: (keyToResolve: string) => Promise<string>,
    singleKey?: string
  ) {
    const promises: any[] = [];
    const keys = Object.keys(this.envResolutions);

    for (const key of keys.filter((k) => !singleKey || k === singleKey)) {
      if (this.envResolutionsResponses.has(key)) {
        continue;
      }

      if (this.envResolutionsPromises.has(key)) {
        promises.push(this.envResolutionsPromises.get(key));
        continue;
      }

      const value = this.envResolutions[key];

      if (!(this.env in value || "default" in value)) {
        throw new Error(
          `Resolution string not found for ${key} for env ${this.env}. Default not found either.`
        );
      }

      const resolvableValue = value[this.env in value ? this.env : "default"];

      const promise = this.resolveConfiguration(
        resolvableValue,
        resolveVariable
      )
        .then((resolvedValue) => {
          this.envResolutionsResponses.set(key, {
            status: "resolved",
            value: resolvedValue,
          });
        })
        .catch((err) => {
          this.envResolutionsResponses.set(key, {
            status: "failed",
            value: undefined,
            error: err,
          });
        });

      this.envResolutionsPromises.set(key, promise);
      promises.push(promise);
    }

    await Promise.all(promises);
  }
}
