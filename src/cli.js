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
    const args = yargs
        .command({
          command: 'init',
          desc: 'Initialise a gallery. By default, this will ask questions for each of the options.',
          builder: yargs => yargs
            .option('quiet', {
              type: 'boolean',
              describe: 'When set, the tool will not ask questons for each of the options.',
              default: false
            })
            .option('name', {
              type: 'string',
              describe: 'The name of the gallery. If not specified, the directory name will be used.'
            })
            .option('description', {
              type: 'string',
              describe: 'The description of the gallery.'
            })
        })
        .command({
          command: 'type',
          desc: 'Manage the types of images',
          builder: yargs => yargs
            .command({
              command: 'add <aspect-ratio> <sizes...>',
              desc: 'Add a new image type',
              builder: yargs => buildTypeSpecifier(yargs)
            })
            .command({
              command: 'set <aspect-ratio> <sizes...>',
              desc: 'Set the sizes for an image type',
              builder: yargs => buildTypeSpecifier(yargs),
            })
            .command({
              command: 'list',
              desc: 'List image types',
              builder: yargs => yargs,
            })
            .command({
              command: 'remove <aspect-ratio>',
              desc: 'Remove image type',
              builder: yargs => yargs,
            })
            .demandCommand(1, 'Please provide a "type" command.')
        })
        .command({
          command: 'gallery',
          desc: 'Manage the galleries',
          builder: (yargs) => yargs
            .command({
              command: 'create <name>',
              desc: 'Creates a new gallery',
              builder: (yargs) => yargs
                .option('description'),
            })
            .command({
              command: 'list',
              desc: 'List the galleries',
              builder: (yargs) => yargs,
            })
            .command({
              command: 'remove <name>',
              desc: 'Remove gallery',
              builder: (yargs) => yargs,
            })
            .demandCommand(1, 'Please provide a "gallery" command.'),
        })
        .command({
          command: 'image',
          desc: 'Manage the images in a gallery',
          builder: (yargs) => yargs
            .command({
              command: 'add <gallery> <image-path>',
              desc: 'Add a new image to a gallery',
              builder: (yargs) => yargs
                .option('name', {
                  type: 'string',
                  describe: 'The name of the image. By default, it will be the file basename.'
                })
                .option('type', {
                  type: 'string',
                  describe: 'The image type to use. By default, this will be inferred by the image dimensions and available types.'
                })
                .option('description'),
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
            .demandCommand(1, 'Please provide an "image" command.'),
        })
        .demandCommand(1, 'Please provide a command.')
        .strict()
        .argv;

    return await run(this.app, args);
  }
}

async function run(app, args) {
  const COMMAND_HANDLERS = {
    "init": (args) => app.init.init(args),
    "type": {
      "add": (args) => app.type.add(args),
      "set": (args) => app.type.set(args),
      "list": (args) => app.type.list(args),
      "remove": (args) => app.type.remove(args)
    },
    "gallery": {
      "create": (args) => app.gallery.create(args),
      "list": (args) => app.gallery.list(args),
      "remove": (args) => app.gallery.remove(args)
    },
    "image": {
      "add": (args) => app.image.add(args),
      "list": (args) => app.image.list(args),
      "remove": (args) => app.image.remove(args)
    }

  }

  let providedCommands = Array.from(args._);
  let commandMap = COMMAND_HANDLERS;

  let fn = null;

  while (providedCommands.length !== 0) {
    const thisCommand = providedCommands.shift();

    const nextCommandMap = commandMap[thisCommand];

    if (nextCommandMap === undefined) {
      throw new Error(`Could not find handler for command "${args._.join(' ')}".`)
    } else if (typeof nextCommandMap === 'object') {
      commandMap = nextCommandMap;
    } else if (typeof nextCommandMap === 'function') {
      fn = nextCommandMap;
      break;
    }

  }

  if (fn === null) {
    throw new Error(`Could not find handler for command "${args._.join(' ')}".`)
  }

  return await fn(args);

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