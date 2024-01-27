import { promises as fs } from "fs";
import { GaimaConfig } from "./config-manager.js";

import { z } from "zod";

const GaimaConfigValidation = z.object({
  name: z.string(),
  description: z.string(),
  buildDir: z.string(),
  types: z.array(z.object({
    name: z.string(),
    aspectRatio: z.object({
      x: z.number(),
      y: z.number()
    }),
    sizes: z.array(z.object({
      x: z.number(),
      y: z.number()
    }))
  })),
  galleries: z.array(z.object({
    name: z.string(),
    description: z.string(),
    images: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      originalFileExtension: z.string().optional(),
      meta: z.string().optional(),
      hash: z.string(),
      type: z.string(),
      alt: z.string(),
      favourite: z.boolean().optional(),
      favouriteGallery: z.string().optional()
    }))
  }))

});

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
      return GaimaConfigValidation.parse(JSON.parse(content));
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
