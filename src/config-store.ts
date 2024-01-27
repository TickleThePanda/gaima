import { promises as fs } from "fs";
import { GaimaConfig } from "./config-manager.js";

export class ConfigStore {
  location: string;
  constructor(location: string) {
    this.location = location;
  }

  async load(): Promise<GaimaConfig | undefined> {
    try {
      const content = await fs.readFile(this.location, {
        encoding: "utf-8",
      });
      return JSON.parse(content) as GaimaConfig;
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error("Unable to parse config file");
      }

      if (err instanceof Error && "code" in err) {
        if (err.code === "ENOENT") {
          return undefined;
        } else {
          throw new Error(
            "Config file " + this.location + " could not be read: " + err.code
          );
        }
      } else {
        throw new Error(
          `Unexpected error occurred while reading file ${this.location}`,
          {
            cause: err,
          }
        );
      }
    }
  }

  async save(config: GaimaConfig) {
    await fs.writeFile(this.location, JSON.stringify(config, null, 2));
  }
}
