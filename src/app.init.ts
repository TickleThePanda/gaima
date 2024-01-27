import Enquirer from "enquirer";
import path from "path";
import process from "process";
import { ConfigManager } from "./config-manager.js";

function findFirstNonNull<T>(items: T[]): T | undefined {
  for (const item of items) {
    if (item !== undefined && item !== null) {
      return item;
    }
  }
  return undefined;
}

const INITIAL_BUILD_DIR = "dist";

export type InitCommand = {
  quiet: boolean;
  name: string | undefined;
  description: string | undefined;
  buildDir: string | undefined;
};

export class GaimaInitCommand {
  configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async init({ quiet, name, description, buildDir }: InitCommand) {
    const directoryName = path.basename(process.cwd());

    await this.configManager.objectStore.setup();

    if (quiet) {
      Object.assign(this.configManager.config, {
        name: findFirstNonNull([
          name,
          this.configManager.config.name,
          directoryName,
        ]),
        description: findFirstNonNull([
          description,
          this.configManager.config.description,
        ]),
        buildDir: findFirstNonNull([
          buildDir,
          this.configManager.config.buildDir,
          INITIAL_BUILD_DIR,
        ]),
      });
    } else {
      const enquirer = new Enquirer();

      const questions = [
        {
          type: "input",
          name: "name",
          message: "name",
          initial: findFirstNonNull([
            name,
            this.configManager.config.name,
            directoryName,
          ]),
        },
        {
          type: "input",
          name: "description",
          message: "description",
          initial: findFirstNonNull([
            description,
            this.configManager.config.description,
          ]),
        },
        {
          type: "input",
          name: "buildDir",
          message: "build-dir",
          initial: findFirstNonNull([
            buildDir,
            this.configManager.config.buildDir,
            INITIAL_BUILD_DIR,
          ]),
        },
      ];

      const answers = await enquirer.prompt(questions);

      Object.assign(this.configManager.config, answers);
    }
  }
}
