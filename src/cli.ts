import yargs, { Arguments, Argv } from "yargs";
import { GaimaApp } from "./app.js";

import { hideBin } from "yargs/helpers";

export class GaimaCli {
  app: GaimaApp;
  constructor(app: GaimaApp) {
    this.app = app;
  }

  async run() {
    /*
     * Wraps this in a promise to handle the onFinishCommand
     * resolution asynchronously to make yargs async.
     */
    await (yargs(hideBin(process.argv))
      .command({
        command: "type",
        describe: "Manage the types of images",
        builder: (yargs) =>
          yargs
            .command({
              command: "add <aspect-ratio> <sizes...>",
              describe: "Add a new image type",
              builder: (yargs) => buildTypeSpecifier(yargs),
              handler: async (args) => this.app.type.add(args),
            })
            .command({
              command: "set <aspect-ratio> <sizes...>",
              describe: "Set the sizes for an image type",
              builder: (yargs) => buildTypeSpecifier(yargs),
              handler: async (args) => this.app.type.set(args),
            })
            .command({
              command: "list",
              describe: "List image types",
              handler: async () => this.app.type.list(),
            })
            .command({
              command: "remove <aspect-ratio>",
              describe: "Remove image type",
              builder: (yargs) =>
                yargs.positional("aspect-ratio", {
                  type: "string",
                  coerce: coerceAspectRatio,
                  description:
                    "the aspect ratio in the format <x>:<y> where <x> and <y> are positive integers, e.g. 3:2",
                  demandOption: true,
                }),
              handler: async (args) => this.app.type.remove(args),
            })
            .demandCommand(1, "Please provide a \"type\" command."),
        handler: async () => {},
      })
      .command({
        command: "init",
        describe:
          "Initialise a gallery. By default, this will ask questions for each of the options.",
        builder: (yargs) =>
          yargs
            .option("quiet", {
              type: "boolean",
              describe:
                "When set, the tool will not ask questons for each of the options.",
              default: false,
            })
            .option("name", {
              type: "string",
              describe:
                "The name of the gallery. If not specified, the directory name will be used.",
            })
            .option("description", {
              type: "string",
              describe: "The description of the gallery.",
            })
            .option("build-dir", {
              type: "string",
              describe:
                "The build directory. This can be relative to the current directory.",
            }),
        handler: async (args) => await this.app.init.init(args),
      })
      .command({
        command: "gallery",
        describe: "Manage the galleries",
        builder: (yargs) =>
          yargs
            .command({
              command: "create <name>",
              describe: "Creates a new gallery",
              builder: (yargs) =>
                yargs
                  .positional("name", {
                    type: "string",
                    demandOption: true,
                  })
                  .option("description", {
                    type: "string",
                    demandOption: true,
                  }),
              handler: (args) => this.app.gallery.create(args),
            })
            .command({
              command: "list",
              describe: "List the galleries",
              builder: (yargs) => yargs,
              handler: () => this.app.gallery.list(),
            })
            .command({
              command: "set <name>",
              describe: "List the galleries",
              builder: (yargs) =>
                yargs
                  .positional("name", {
                    type: "string",
                    demandOption: true,
                  })
                  .option("description", {
                    type: "string",
                    demandOption: true,
                  }),
              handler: (args) => this.app.gallery.set(args),
            })
            .command({
              command: "remove <name>",
              describe: "Remove gallery",
              builder: (yargs) =>
                yargs.positional("name", {
                  type: "string",
                  demandOption: true,
                }),
              handler: (args) => this.app.gallery.remove(args),
            })
            .demandCommand(1, "Please provide a \"gallery\" command."),
        handler: () => {},
      })
      .command({
        command: "image",
        describe: "Manage the images in a gallery",
        builder: (yargs) =>
          yargs
            .command({
              command: "add <gallery> <image-path>",
              describe: "Add a new image to a gallery",
              builder: (yargs) =>
                yargs
                  .positional("gallery", {
                    type: "string",
                    demandOption: true,
                  })
                  .positional("image-path", {
                    type: "string",
                    demandOption: true,
                  })
                  .option("name", {
                    type: "string",
                    describe:
                      "The name of the image. By default, it will be the file basename.",
                    demandOption: true,
                  })
                  .option("type", {
                    type: "string",
                    describe:
                      "The image type to use. By default, this will be inferred by the image dimensions and available types.",
                  })
                  .option("description", {
                    type: "string",
                    describe:
                      "The description of the image used to give any background information about the image.",
                    demandOption: true,
                  })
                  .option("favourite", {
                    type: "boolean",
                    describe:
                      "Whether the image should be included in favourites.",
                    default: false,
                  })
                  .option("alt", {
                    type: "string",
                    describe:
                      "An alternative description for if the image fails to load in the gallery or for screen reader users.",
                    demandOption: true,
                  })
                  .option("favourite-gallery", {
                    type: "string",
                    describe:
                      "Which favourite gallery this belongs to.",
                    demandOption: true,
                  })
                  .option("overwrite", {
                    type: "boolean",
                    describe: "Overwrite an existing image",
                    default: false,
                  }),
              handler: (args) => this.app.image.add(args),
            })
            .command({
              command: "list <gallery>",
              describe: "Lists the images in a gallery",
              builder: (yargs) =>
                yargs.positional("gallery", {
                  type: "string",
                  demandOption: true,
                }),
              handler: (args) => this.app.image.list(args),
            })
            .command({
              command: "remove <gallery> <image-name>",
              describe: "Removes the gallery",
              builder: (yargs) =>
                yargs
                  .positional("gallery", {
                    type: "string",
                    demandOption: true,
                  })
                  .positional("image-name", {
                    type: "string",
                    demandOption: true,
                  }),
              handler: (args) => this.app.image.remove(args),
            })
            .command({
              command: "patch <gallery> <image-name>",
              describe: "Updates specified values of an image",
              builder: (yargs) =>
                yargs
                  .positional("gallery", {
                    type: "string",
                    demandOption: true,
                  })
                  .positional("image-name", {
                    type: "string",
                    demandOption: true
                  })
                  .option("name", {
                    type: "string",
                    describe:
                      "The name of the image.",
                  })
                  .option("type", {
                    type: "string",
                    describe:
                      "The image type to use. By default, this will be inferred by the image dimensions and available types.",
                  })
                  .option("description", {
                    type: "string",
                    describe:
                      "The description of the image used to give any background information about the image.",
                  })
                  .option("favourite", {
                    type: "boolean",
                    describe:
                      "Whether the image should be included in favourites.",
                  })
                  .option("alt", {
                    type: "string",
                    describe:
                      "An alternative description for if the image fails to load in the gallery or for screen reader users.",
                  })
                  .option("favourite-gallery", {
                    type: "string",
                    describe:
                      "Which favourite gallery this belongs to.",
                  })
                  .option("overwrite", {
                    type: "boolean",
                    describe: "Overwrite an existing image",
                  }),
              handler: (args) => this.app.image.patch(args)
            })
            .command({
              command: "list-favourites",
              describe: "List images marked as favourite",
              builder: (yargs) =>
                yargs
                  .option("filter-no-favourite-gallery", {
                    type: "boolean",
                    describe: "Filter by favourites without a favourite gallery",
                    default: false
                  }),
              handler: (args) => this.app.image.listFavourites(args)
            })
            .demandCommand(1, "Please provide an \"image\" command."),
        handler: () => {},
      })
      .command({
        command: "build",
        describe: "Builds the gallery",
        builder: (yargs) => yargs,
        handler: () => this.app.build.build(),
      })
      .demandCommand(1, "Please provide a command.")
      .strict()
      .parse()
    );
  }
}

function coerceAspectRatio(arg: string) {
  const aspectRatioTuple = arg.split(":");
  if (aspectRatioTuple.length !== 2) {
    throw new Error(
      "Aspect ratio must be in the format <x>:<y> where <x> and <y> are positive integers, e.g. 3:2"
    );
  }
  if (!aspectRatioTuple.every((ar) => /^[0-9]+$/.test(ar))) {
    throw new Error(
      "Aspect ratio must be in the format <x>:<y> where <x> and <y> are positive integers, e.g. 3:2"
    );
  }
  const [aspectRatioX, aspectRatioY] = aspectRatioTuple.map((ar) =>
    parseInt(ar)
  );

  return {
    x: aspectRatioX,
    y: aspectRatioY,
  };
}

function coerceSizes(arg: string) {
  const convertedSizes: {
    x: number;
    y: number;
  }[] = [];

  for (const size of arg) {
    const sizeTuple = size.split("x");
    if (sizeTuple.length !== 2) {
      throw new Error(
        "All sizes must be in the format <x>x<y> where <x> and <y> are positive integers, e.g. 150:100"
      );
    }
    if (!sizeTuple.every((ar) => /^[0-9]+$/.test(ar))) {
      throw new Error(
        "All sizes must be in the format <x>x<y> where <x> and <y> are positive integers, e.g. 150:100"
      );
    }
    const [sizeX, sizeY] = sizeTuple.map((s) => parseInt(s));

    convertedSizes.push({
      x: sizeX,
      y: sizeY,
    });
  }

  return convertedSizes;
}

function checkSizesMatchAspectRatio(argv: Arguments<{
  "aspect-ratio": { 
    x: number,
    y: number
  },
  sizes: {
    x: number,
    y: number
  }[]
}>) {
  const { x: arX, y: arY } = argv["aspect-ratio"];

  const maxDelta = 5;

  for (const { x, y } of argv.sizes) {
    if (Math.abs(x * arY - y * arX) > maxDelta) {
      throw new Error(
        x + "x" + y + " does not have an aspect ratio of " + arX + ":" + arY
      );
    }
  }

  return true;
}

function buildTypeSpecifier(yargs: Argv<object>) {
  return yargs
    .positional("aspect-ratio", {
      type: "string",
      coerce: coerceAspectRatio,
      description:
        "the aspect ratio in the format <x>:<y> where <x> and <y> are positive integers, e.g. 3:2",
      demandOption: true,
    })
    .positional("sizes", {
      type: "string",
      coerce: coerceSizes,
      description:
        "a list of sizes in the format <x>x<y> where <x> and <y> are positive integers and must have the correct aspect ratio, e.g. 150x100",
      demandOption: true,
    })
    .option("description", {})
    .check(checkSizesMatchAspectRatio);
}
