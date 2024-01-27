import { EOL } from "os";
import { ConfigManager } from "./config-manager.js";

export type TypeAddCommandArgs = {
  aspectRatio: {
    x: number;
    y: number;
  };
  sizes: {
    x: number;
    y: number;
  }[];
};

export type TypeUpdateCommandArgs = {
  aspectRatio: {
    x: number;
    y: number;
  };
  sizes: {
    x: number;
    y: number;
  }[];
};

export type TypeRemoveCommandArgs = {
  aspectRatio:
    | {
        x: number;
        y: number;
      }
    | string;
};

export class GaimaTypeCommand {
  configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  add({ aspectRatio, sizes }: TypeAddCommandArgs) {
    this.configManager.addType(aspectRatio, sizes);
  }

  set({ aspectRatio, sizes }: TypeUpdateCommandArgs) {
    this.configManager.setType(aspectRatio, sizes);
  }

  remove({ aspectRatio }: TypeRemoveCommandArgs) {
    this.configManager.removeType(aspectRatio);
  }

  list() {
    const types = this.configManager.getTypes();

    if (types.length === 0) {
      console.log(
        "There are no types specified for this gallery, use \"gaima types add\" to add a new type."
      );
    } else {
      console.log(types.map(formatType).join(EOL));
    }
  }
}

function formatType({
  aspectRatio: ar,
  sizes,
}: {
  aspectRatio: { x: number; y: number };
  sizes: { x: number; y: number }[];
}) {
  const stringifiedSizes = sizes.map(({ x, y }) => x + "x" + y).join(" ");
  return `${ar.x}:${ar.y} - ${stringifiedSizes} `;
}
