import yargs from 'yargs';

export class GaimaCli {

  constructor(app) {
    this.app = app;
  }

  async run() {
    /*
     * Wraps this in a promise to handle the onFinishCommand
     * resolution asynchronously to make yargs async.
     */
    return await new Promise((resolve, reject) => {
      yargs
        .command({
          command: 'init',
          desc: 'Initialise a gallery',
          builder: yargs => yargs,
          handler: args => this.app.init.init(args)
        })
        .command({
          command: 'type',
          desc: 'Manage the types of images',
          builder: yargs => yargs
            .command({
              command: 'add <aspect-ratio> <sizes...>',
              desc: 'Add a new image type',
              builder: yargs => buildTypeSpecifier(yargs),
              handler: args => this.app.type.add(args)
            })
            .command({
              command: 'set <aspect-ratio> <sizes...>',
              desc: 'Set the sizes for an image type',
              builder: yargs => buildTypeSpecifier(yargs),
              handler: args => this.app.type.set(args)
            })
            .command({
              command: 'list',
              desc: 'List image types',
              builder: yargs => yargs,
              handler: args => this.app.type.list(args)
            })
            .command({
              command: 'remove <aspect-ratio>',
              desc: 'Remove image type',
              builder: yargs => yargs,
              handler: args => this.app.type.remove(args)
            })
            .demandCommand()
        })
        .command({
          command: 'gallery',
          desc: 'Manage the galleries',
          builder: (yargs) => yargs
            .command({
              command: 'add <name>',
              desc: 'Add a new gallery',
              builder: (yargs) => yargs
                .option('description')
            })
            .command({
              command: 'list',
              desc: 'List the galleries',
              builder: (yargs) => yargs,
            })
            .command({
              command: 'remove <name>',
              desc: 'Remove gallery',
              builder: (yargs) => yargs
            })
            .demandCommand(),
        })
        .command({
          command: 'image',
          desc: 'Manage the images in a gallery',
          builder: (yargs) => yargs
            .command({
              command: 'add <gallery> <image-name> <image-path>',
              desc: 'Add a new image to a gallery',
              builder: (yargs) => yargs
                .option('description')
            })
            .command({
              command: 'list <gallery>',
              desc: 'Lists the images in a gallery',
              builder: (yargs) => yargs
            })
            .command({
              command: 'remove <gallery> <image-name>',
              desc: 'Removes the image from the gallery',
              builder: (yargs) => yargs
            })
            .demandCommand(),
        })
        .demandCommand()
        .onFinishCommand(resolve)
        .argv;
    });
  }
}

function coerceAspectRatio(arg) {
  const aspectRatioTuple = arg.split(':');
  if (aspectRatioTuple.length !== 2) {
    throw new Error('Aspect ratio must be in the format <x>:<y> where <x> and <y> are positive integers, e.g. 3:2');
  }
  if (!aspectRatioTuple.every(ar => /^[0-9]+$/.test(ar))) {
    throw new Error('Aspect ratio must be in the format <x>:<y> where <x> and <y> are positive integers, e.g. 3:2');
  }
  const [aspectRatioX, aspectRatioY] = aspectRatioTuple.map(ar => parseInt(ar));

  return {
    x: aspectRatioX,
    y: aspectRatioY
  };
}

function coerceSizes(arg) {
  const convertedSizes = [];

  for (let size of arg) {
    const sizeTuple = size.split('x');
    if (sizeTuple.length !== 2) {
      throw new Error('All sizes must be in the format <x>x<y> where <x> and <y> are positive integers, e.g. 150:100');
    }
    if (!sizeTuple.every(ar => /^[0-9]+$/.test(ar))) {
      throw new Error('All sizes must be in the format <x>x<y> where <x> and <y> are positive integers, e.g. 150:100');
    }
    const [sizeX, sizeY] = sizeTuple.map(s => parseInt(s));

    convertedSizes.push({
      x: sizeX,
      y: sizeY
    });
  }

  return convertedSizes;
}

function checkSizesMatchAspectRatio(argv) {
  const { x: arX, y: arY } = argv.aspectRatio;

  for (let { x, y } of argv.sizes) {
    if (x / arX !== y / arY) {
      throw new Error(x + 'x' + y + ' does not have an aspect ratio of ' + arX + ':' + arY);
    }
  }

  return true;
}

function buildTypeSpecifier(yargs) {
  return yargs
    .positional('aspect-ratio', {
      type: 'string',
      coerce: coerceAspectRatio,
      description: 'the aspect ratio in the format <x>:<y> where <x> and <y> are positive integers, e.g. 3:2'
    })
    .positional('sizes', {
      type: 'array',
      coerce: coerceSizes,
      description: 'a list of sizes in the format <x>x<y> where <x> and <y> are positive integers and must have the correct aspect ratio, e.g. 150x100'
    })
    .option('description')
    .check(checkSizesMatchAspectRatio);
}