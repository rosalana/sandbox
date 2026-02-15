import Module from "./tools/module";
import ModuleRegistry from "./tools/module_registry";
import { ShaderUniform } from "./types";

// Module GLSL sources
import sandboxSource from "./shaders/modules/sandbox.glsl?raw";
import colorsSource from "./shaders/modules/colors.glsl?raw";
import effectsSource from "./shaders/modules/effects.glsl?raw";
import filtersSource from "./shaders/modules/filters.glsl?raw";

/**
 * Default modules bundled with Sandbox.
 * These modules are available for import in shader source without needing to be registered manually.
 * This registry will grow when more modules are defined
 */
export const modules = new ModuleRegistry([
  new Module("sandbox", sandboxSource),
  new Module("sandbox/colors", colorsSource, {
    tri_mix: {
      sharpness: { uniform: "u_sharpness", default: 2.0 },
      tint: { uniform: "u_tint", default: 0.0 },
      highlight: { uniform: "u_highlight", default: 0.0 },
    },
  }),
  new Module("sandbox/effects", effectsSource, {
    twist: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
    organic: {
      intensity: { uniform: "u_intensity", default: 3.0 },
    },
    pixelate: {
      intensity: { uniform: "u_intensity", default: 20.0 },
    },
    posterize: {
      intensity: { uniform: "u_intensity", default: 30.0 },
    },
    grain: {
      intensity: { uniform: "u_intensity", default: 0.1 },
    },
    glow: {
      intensity: { uniform: "u_intensity", default: 0.5 },
    },
    vignette: {
      intensity: { uniform: "u_intensity", default: 1.4 },
    },
  }),
  new Module("sandbox/filters", filtersSource, {
    default: {
      intensity: { uniform: "u_intensity", default: 1.0 },
    },
  }),
]);

/**
 * A global registry of modules that are currently in use by the webGL context.
 * This is flushed on every shader switch.
 */
export const runtime_modules = new ModuleRegistry();

/**
 * Global uniforms that are automatically provided by Sandbox.
 * These uniforms will NOT be renamed during preprocessing.
 */
export const uniforms = new Map<ShaderUniform["name"], ShaderUniform["type"]>([
  ["u_resolution", "vec2"],
  ["u_time", "float"],
  ["u_delta", "float"],
  ["u_mouse", "vec2"],
  ["u_frame", "int"],
]);
