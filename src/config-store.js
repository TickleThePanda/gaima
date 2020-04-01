import { promises as fs } from 'fs';

export class ConfigStore {
  constructor(location) {
    this.location = location;
  }

  async load() {
    try {
      const content = await fs.readFile(this.location);
      return JSON.parse(content);
    } catch (err) {

      if (err instanceof SyntaxError) {
        throw new Error('Unable to parse config file');
      }

      if (err.code === 'ENOENT') {
        return {};
      } else {
        throw new Error('Config file ' + this.location + ' could not be read: ' + err.code);
      }
    }

  }

  async save(config) {
    await fs.writeFile(this.location, JSON.stringify(config, null, 2));
  }
}
