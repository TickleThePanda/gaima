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

export class GaimaInitCommand {
  constructor(configManager) {
    this.configManager = configManager;
  }

  async init() {
    const enquirer = new Enquirer();

    const directoryName = path.basename(process.cwd());

    const questions = [
      {
        type: 'input',
        name: 'name',
        message: 'name',
        initial: findFirstNonNull([this.configManager.config.name, directoryName])
      },
      {
        type: 'input',
        name: 'description',
        message: 'description',
        initial: this.configManager.config.description
      }
    ];

    const answers = await enquirer.prompt(questions);

    Object.assign(this.configManager.config, answers)

  }

}