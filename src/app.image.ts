import {
  GaimaAspectRatioTypeConfig,
  ConfigError,
  ConfigManager,
  GaimaImageConfig,
  GaimaGalleryConfig,
} from "./config-manager.js";
import { promises as fs, constants } from "fs";
import { EOL } from "os";
import path from "path";

import sharp from "sharp";

const AR_ERROR_WARNING_MIN = 0.001;

export type ImageAddCommandArgs = {
  gallery: string;
  imagePath: string;
  name: string;
  description: string;
  alt: string;
  type: string | undefined;
  overwrite: boolean;
  favourite: boolean;
  favouriteGallery: string | undefined;
};

export type ImagePatchCommandArgs = {
  gallery: string;
  imageName: string;
  name: string | undefined;
  description: string | undefined;
  alt: string | undefined;
  type: string | undefined;
  favourite: boolean | undefined;
  favouriteGallery: string | undefined;
}

export type ImageListCommandArgs = {
  gallery: string;
};

export type ImageRemoveCommandArgs = {
  gallery: string;
  imageName: string;
};

export class GaimaImageCommand {
  configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async add({
    gallery: galleryName,
    imagePath,
    name: imageName,
    description: imageDescription,
    favourite,
    alt: alt,
    type: typeName,
    overwrite,
    favouriteGallery
  }: ImageAddCommandArgs) {
    const gallery = this.configManager.getGallery(galleryName);

    if (gallery === undefined) {
      throw new ConfigError(
        `Could not add image to ${galleryName}: the gallery doesn't exist.`
      );
    }

    const imageBuffer = await getImageContent(imagePath);
    const imageMetadata = await sharp(imageBuffer).metadata();

    const type = await this.getType(imageMetadata, typeName);

    const isImageSpecified = imageName !== undefined;

    const actualImageName = isImageSpecified
      ? imageName
      : path.basename(imagePath, path.extname(imagePath));

    await this.configManager.addImage(galleryName, {
      name: actualImageName,
      type: type.name,
      buffer: imageBuffer,
      description: imageDescription,
      favourite,
      alt: alt,
      overwrite,
      favouriteGallery
    });
  }

  async patch({
    gallery: galleryName,
    imageName,
    name,
    description,
    alt,
    type,
    favourite,
    favouriteGallery,
  }: ImagePatchCommandArgs) {

    const gallery = this.configManager.getGallery(galleryName);

    if (gallery === undefined) {
      throw new ConfigError(
        `Could not add image to ${galleryName}: the gallery doesn't exist.`
      );
    }

    await this.configManager.updateImage(galleryName, imageName, {
      name,
      description,
      alt,
      type,
      favourite,
      favouriteGallery
    });

  }

  async list({ gallery: galleryName }: ImageListCommandArgs) {
    const images = this.configManager.getImages(galleryName);

    console.log(images.map(formatImage).join(EOL));
  }

  async listFavourites({
    filterNoFavouriteGallery: noFavouriteGallery
  }: {
    filterNoFavouriteGallery: boolean | undefined
  }) {
    const galleries = this.configManager.getGalleries();
    const images = galleries.flatMap(g => this.configManager.getImages(g.name).map(i => ({
      gallery: g,
      image: i
    })));

    const favourites = images.filter(i => i.image.favourite && (noFavouriteGallery ? i.image.favouriteGallery === undefined : true));

    console.log(favourites.map(formatImageFavourite).join(EOL));

  }

  async remove({
    gallery: galleryName,
    imageName: imageName,
  }: ImageRemoveCommandArgs) {
    await this.configManager.removeImage(galleryName, {
      name: imageName,
    });
  }

  async getType(imageMetadata: sharp.Metadata, typeName: string | undefined) {
    if (imageMetadata.width === undefined ||
      imageMetadata.height === undefined) {
      throw Error("Can't extract image width and height");
    }

    const isTypeSpecified = typeName !== undefined;

    const type = await (isTypeSpecified
      ? this.configManager.getType(typeName)
      : inferTypeFromDimensions(
        this.configManager.getTypes(),
        imageMetadata as { width: number; height: number; }
      ));

    if (type === undefined) {
      throw new Error(
        isTypeSpecified ?
          `Can't find type ${typeName}.` :
          "Can't infer image type."
      );
    }

    const imageArFraction = imageMetadata.width / imageMetadata.height;
    const typeArFraction = type.aspectRatio.x / type.aspectRatio.y;

    const error = Math.abs(
      (imageArFraction - typeArFraction) * imageArFraction
    );

    if (error > AR_ERROR_WARNING_MIN) {
      console.log(
        `Warning: Using the aspect ratio ${type.name} but the` +
        `percentage error between selected aspect ratio and actual aspect ratio is ${toPercent(
          error
        )} `
      );
    }
    return type;
  }
}


function formatImage({ name, hash, type, description }: GaimaImageConfig) {
  return `${name} - ${hash} - ${type} ${
    description !== undefined ? " - " + description : ""
  }`;
}

function formatImageFavourite({ gallery, image }: { gallery: GaimaGalleryConfig, image: GaimaImageConfig }) {
  return `${gallery.name} - ${image.name} - ${image.favouriteGallery ?? "not specified"}`;
}

function toPercent(error: number) {
  return `${(error * 100).toFixed(1)}%`;
}

async function inferTypeFromDimensions(
  types: GaimaAspectRatioTypeConfig[],
  imageMetadata: { width: number; height: number }
) {
  if (types.length === 0) {
    throw new ConfigError(
      "Could not infer dimension. There are no types specified."
    );
  }

  const arFraction = imageMetadata.width / imageMetadata.height;

  return findClosestMatchingAr(types, arFraction);
}

function findClosestMatchingAr(
  types: GaimaAspectRatioTypeConfig[],
  aspectRatioFraction: number
) {
  let typeWithClosestRatio: GaimaAspectRatioTypeConfig | undefined = undefined;

  for (const type of types) {
    if (typeWithClosestRatio === undefined) {
      typeWithClosestRatio = type;
    } else {
      const closestRatio =
        typeWithClosestRatio.aspectRatio.x / typeWithClosestRatio.aspectRatio.y;
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

async function getImageContent(imagePath: string): Promise<Buffer> {
  const imageFileHandle = await fs.open(imagePath, constants.O_RDONLY);

  return await imageFileHandle.readFile();
}
