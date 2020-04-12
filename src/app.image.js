import { ConfigError } from "./config-manager.js";
import { promises as fs, constants } from 'fs';
import { EOL } from 'os';
import path from 'path';

import sharp from 'sharp';

const AR_ERROR_WARNING_MIN = 0.001;

export class GaimaImageCommand {
  constructor(configManager) {
    this.configManager = configManager;
  }

  async add({
    gallery: galleryName,
    imagePath,
    name: imageName,
    description: imageDescription,
    type: typeName
  }) {
    const gallery = this.configManager.getGallery(galleryName);

    if (gallery === undefined) {
      throw new ConfigError(`Could not add image to ${galleryName}: the gallery doesn't exist.`);
    }

    const imageBuffer = await getImageContent(imagePath);
    const imageMetadata = await sharp(imageBuffer).metadata();

    const isTypeSpecified = typeName !== undefined;

    const type = await (
      isTypeSpecified
        ? this.configManager.getType(typeName)
        : inferTypeFromDimensions(this.configManager.getTypes(), imageMetadata)
    );

    const imageArFraction = imageMetadata.width / imageMetadata.height;
    const typeArFraction = type.aspectRatio.x / type.aspectRatio.y;

    const error = Math.abs((imageArFraction - typeArFraction) * imageArFraction);

    if (error > AR_ERROR_WARNING_MIN) {
      console.log(
        `Warning: Using the aspect ratio ${type.name} but the`
        + `percentage error between selected aspect ratio and actual aspect ratio is ${toPercent(error)} `)
    }

    const isImageSpecified = imageName !== undefined;

    const actualImageName = isImageSpecified
      ? imageName
      : path.basename(imagePath);

    await this.configManager.addImage(galleryName, {
      name: actualImageName,
      type: type.name,
      buffer: imageBuffer,
      description: imageDescription
    });

  }

  async list({
    gallery: galleryName
  }) {
    const images = this.configManager.getImages(galleryName);

    console.log(images.map(formatImage).join(EOL));
  }

}

function formatImage({name, hash, type, description}) {
  return `${name} - ${hash} - ${type}${description !== undefined ? " - " + description : ""}`
}

function toPercent(error) {
  return `${(error * 100).toFixed(1)}%`
}

async function inferTypeFromDimensions(types, imageMetadata) {

  if (types.length === 0) {
    throw new ConfigError(`Could not infer dimension. There are no types specified.`);
  }

  const arFraction = imageMetadata.width / imageMetadata.height;

  return findClosestMatchingAr(types, arFraction);
}

function findClosestMatchingAr(types, aspectRatioFraction) {

  let typeWithClosestRatio = null;

  for (let type of types) {
    if (typeWithClosestRatio === null) {
      typeWithClosestRatio = type;
    } else {
      const closestRatio = typeWithClosestRatio.aspectRatio.x / typeWithClosestRatio.aspectRatio.y;
      const closestRatioDiff = Math.abs(closestRatio - aspectRatioFraction);

      const thisRatio = type.aspectRatio.x / type.aspectRatio.y;
      const thisRatioDiff = Math.abs(thisRatio - aspectRatioFraction);

      if (thisRatioDiff < closestRatioDiff) {
        typeWithClosestRatio = type;
      }
    }
  }

  return typeWithClosestRatio;

}

async function getImageContent(imagePath) {

  const imageFileHandle = await fs.open(imagePath, constants.O_RDONLY);

  return await imageFileHandle.readFile(imageFileHandle);

}