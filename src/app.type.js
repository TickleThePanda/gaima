export class GaimaTypeCommand {

  constructor(configManager) {
    this.configManager = configManager;
  }

  add({ aspectRatio, sizes }) {
    this.configManager.addType(aspectRatio, sizes);
  }

  set({ aspectRatio, sizes }) {
    this.configManager.setType(aspectRatio, sizes);
  }

  remove({ aspectRatio }) {
    this.configManager.remove(aspectRatio);
  }

  list() {

    const types = this.configManager.getTypes();

    if (types.length === 0) {
      console.log('There are no types specified for this gallery, use "gaima types add" to add a new type.');
    } else {
      console.log(types.map(formatType).join('\n'));
    }
  }
}

function formatType({aspectRatio, sizes}) {
  return aspectRatio.x + ':' + aspectRatio.y
            + ' - '
            + sizes
                .map(({ x, y}) => x + 'x' + y)
                .join(' ')
}
