import SimpleModule from "./shaders/backup/simple.glsl?raw";
import Module from "./tools/module";
import ModuleRegistry from "./tools/module_registry";
import { ShaderUniform } from "./types";

/**
 * Default modules bundled with Sandbox.
 * These modules are available for import in shader source without needing to be registered manually.
 * This registry will grow when more modules are defined
 */
export const modules = new ModuleRegistry([
  new Module("sandbox", SimpleModule),
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
