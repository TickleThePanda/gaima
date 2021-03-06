import Enquirer from 'enquirer';
import path from 'path';
import process from 'process';

function findFirstNonNull(items) {
  for (let item of items) {
    if (item !== undefined && item !== null) {
      return item;
    }
  }
  return null;
}

const INITIAL_BUILD_DIR = 'dist';

export class GaimaInitCommand {
  constructor(configManager) {
    this.configManager = configManager;
  }

  async init({
    quiet,
    name,
    description,
    buildDir
  }) {
    const directoryName = path.basename(process.cwd());

    await this.configManager.objectStore.setup();

    if (quiet) {

      Object.assign(this.configManager.config, {
        name: findFirstNonNull([name, this.configManager.config.name, directoryName]),
        description: findFirstNonNull([description, this.configManager.config.description]),
        buildDir: findFirstNonNull([buildDir, this.configManager.config.buildDir, INITIAL_BUILD_DIR])
      })
    } else {
      const enquirer = new Enquirer();

      const questions = [
        {
          type: 'input',
          name: 'name',
          message: 'name',
          initial: findFirstNonNull([name, this.configManager.config.name, directoryName])
        },
        {
          type: 'input',
          name: 'description',
          message: 'description',
          initial: findFirstNonNull([description, this.configManager.config.description])
        },
        {
          type: 'input',
          name: 'buildDir',
          message: 'build-dir',
          initial: findFirstNonNull([buildDir, this.configManager.config.buildDir, INITIAL_BUILD_DIR])
        }
      ];

      const answers = await enquirer.prompt(questions);

      Object.assign(this.configManager.config, answers)

    }

  }

}