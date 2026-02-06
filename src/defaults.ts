import SandboxModule from "./shaders/sandbox.frag?raw";
import { ModuleDefinition } from "./types";

export const modules: any = new Set<ModuleDefinition>([
  { name: "sandbox", source: SandboxModule },
]);

export const uniforms = new Set<string>([
  "u_resolution",
  "u_time",
  "u_delta",
  "u_mouse",
  "u_frame",
]);
