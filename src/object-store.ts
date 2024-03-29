import crypto from "crypto";

import path from "path";

import { promises as fs } from "fs";

const OBJECTS_DIR = "objects";

export class ObjectStore {
  location: string;

  constructor(location: string) {
    this.location = location;
  }

  async setup() {
    await fs.mkdir(path.join(this.location, OBJECTS_DIR), {
      recursive: true,
    });
  }

  async store(buffer: Buffer) {
    const hasher = crypto.createHash("sha1");
    hasher.update(buffer);
    const hash = hasher.digest("hex");

    const outPath = path.join(this.location, OBJECTS_DIR, hash);

    try {
      await fs.writeFile(outPath, buffer, {
        flag: "wx",
      });
    } catch (e: unknown) {
      /*
       * Assume that, if it already exists, it's the same file.
       * The risk of collision is very low.
       */
      if (e instanceof Error) {
        if ("code" in e && e.code !== "EEXIST") {
          throw e;
        }
      }
    }

    return hash;
  }

  async get(hash: string) {
    const inPath = path.join(this.location, OBJECTS_DIR, hash);
    return await fs.readFile(inPath);
  }
}
