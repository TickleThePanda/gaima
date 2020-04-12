import crypto from 'crypto';

import path from 'path';

import { promises as fs } from 'fs';

const OBJECTS_DIR = 'objects';

export class ObjectStore {
  constructor(location) {
    this.location = location;
  }

  async setup() {
    await fs.mkdir(path.join(this.location, OBJECTS_DIR), {
      recursive: true
    });
  }

  async store(buffer) {

    const hasher = crypto.createHash('sha1');
    hasher.update(buffer);
    const hash = hasher.digest('hex');

    const outPath = path.join(this.location, OBJECTS_DIR, hash)

    try {
      await fs.writeFile(outPath, buffer, {
        flag: 'wx'
      });
    } catch (e) {
      /*
       * Assume that, if it already exists, it's the same file.
       * The risk of collision is very low.
       */
      if (e.code !== 'EEXIST') {
        throw e;
      }
    }

    return hash;

  }

  async get(hash) {

  }
}