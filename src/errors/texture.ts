import { SandboxError } from "./base";

export class SandboxTextureCreationError extends SandboxError {
  public readonly name = "SandboxTextureCreationError";
  constructor(public readonly textureName: string) {
    super(
      `Failed to create WebGL texture for "${textureName}".`,
      "TEXTURE_ERROR",
    );
  }
}

export class SandboxTextureUnitLimitError extends SandboxError {
  public readonly name = "SandboxTextureUnitLimitError";
  constructor(
    public readonly textureName: string,
    public readonly maxUnits: number,
  ) {
    super(
      `Cannot bind texture "${textureName}": all ${maxUnits} texture units are in use.`,
      "TEXTURE_ERROR",
    );
  }
}
