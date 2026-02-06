import MathModule from "./shaders/modules/math.glsl?raw";
import ColorModule from "./shaders/modules/color.glsl?raw";
import EasingModule from "./shaders/modules/easing.glsl?raw";
import EffectsModule from "./shaders/modules/effects.glsl?raw";
import InteractionModule from "./shaders/modules/interaction.glsl?raw";
import PhysicsModule from "./shaders/modules/physics.glsl?raw";
import SimpleModule from "./shaders/modules/simple.glsl?raw";
import { GLSLType, ModuleDefinition, ShaderUniform } from "./types";

/** Registry of all defined modules */
export const modules = new Map<string, ModuleDefinition>();

// Register built-in modules
modules.set("sandbox", { name: "sandbox", source: SimpleModule });

// modules.set("sandbox/math", { name: "sandbox/math", source: MathModule });
// modules.set("sandbox/color", { name: "sandbox/color", source: ColorModule });
// modules.set("sandbox/easing", { name: "sandbox/easing", source: EasingModule });
// modules.set("sandbox/effects", { name: "sandbox/effects", source: EffectsModule });
// modules.set("sandbox/interaction", { name: "sandbox/interaction", source: InteractionModule });
// modules.set("sandbox/physics", { name: "sandbox/physics", source: PhysicsModule });

/**
 * Global uniforms that are automatically provided by Sandbox.
 * These uniforms will NOT be renamed during preprocessing.
 */
export const uniforms = new Set<string>([
  "u_resolution",
  "u_time",
  "u_delta",
  "u_mouse",
  "u_frame",
]);

export const defaultUniforms = new Map<ShaderUniform['name'], ShaderUniform['type']>([
  ["u_resolution", "vec2"],
  ["u_time", "float"],
  ["u_delta", "float"],
  ["u_mouse", "vec2"],
  ["u_frame", "int"],
]);
