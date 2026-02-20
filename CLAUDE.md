# CLAUDE.md - Rosalana Sandbox

## Project Overview

**@rosalana/sandbox** is a lightweight WebGL wrapper for simple, beautiful shader effects. Focuses on clean API, type safety, and fast setup. Ideal for gradients, ambient backgrounds, and animated GLSL experiments.

- **Version**: 0.0.5
- **WebGL support**: WebGL1 and WebGL2 with automatic fallback
- **License**: MIT
- **npm**: `@rosalana/sandbox`

## Architecture

### Entry Point
- [src/index.ts](src/index.ts) - Exports `Sandbox` class and all types/errors

### Core Classes

| Class | File | Purpose |
|-------|------|---------|
| `Sandbox` | [src/index.ts](src/index.ts) | Main public API, orchestrates entire system |
| `WebGL` | [src/tools/web_gl.ts](src/tools/web_gl.ts) | Internal WebGL orchestrator - context, render loop |
| `Program` | [src/tools/program.ts](src/tools/program.ts) | Shader compilation, program linking |
| `Geometry` | [src/tools/geometry.ts](src/tools/geometry.ts) | Vertex buffers, VAO (WebGL1/2 compatibility) |
| `Uniforms` | [src/tools/uniforms.ts](src/tools/uniforms.ts) | Uniform collection, built-in uniforms management |
| `Uniform` | [src/tools/uniform.ts](src/tools/uniform.ts) | Single uniform - method inference, GPU upload |
| `Clock` | [src/tools/clock.ts](src/tools/clock.ts) | High-precision timing via requestAnimationFrame |
| `Hooks` | [src/tools/hooks.ts](src/tools/hooks.ts) | Hook system (before/after render callbacks) |
| `Listener` | [src/tools/listener.ts](src/tools/listener.ts) | Event listener helper with cleanup |

### Module System Classes

| Class | File | Purpose |
|-------|------|---------|
| `Shader` | [src/tools/shader.ts](src/tools/shader.ts) | Extends Compilable, adds built-in uniform injection |
| `Compilable` | [src/tools/compilable.ts](src/tools/compilable.ts) | Shader preprocessing pipeline - `#import` resolution, namespacing, tree-shaking |
| `Parser` | [src/tools/parser.ts](src/tools/parser.ts) | GLSL parser - extracts imports, uniforms, functions, dependencies |
| `Module` | [src/tools/module.ts](src/tools/module.ts) | Single module definition - extraction, dependency resolution, options |
| `ModuleRegistry` | [src/tools/module_registry.ts](src/tools/module_registry.ts) | Registry of modules - lookup, compilation, option resolution |

### Globals
File: [src/globals.ts](src/globals.ts)

- `modules` - Global `ModuleRegistry` with built-in sandbox modules (immutable, grows with `defineModule`)
- `runtime_modules` - `ModuleRegistry` of modules currently used by the active shader (flushed on shader switch)
- `uniforms` - Map of built-in uniform names → GLSL types (exempt from namespacing)

### Error Classes
Directory: [src/errors/](src/errors/)

| Class | File | Code | When |
|-------|------|------|------|
| `SandboxError` | [base.ts](src/errors/base.ts) | — | Base class for all errors |
| `SandboxWebGLNotSupportedError` | [context.ts](src/errors/context.ts) | `CONTEXT_ERROR` | WebGL not available |
| `SandboxContextCreationError` | [context.ts](src/errors/context.ts) | `CONTEXT_ERROR` | GPU unavailable |
| `SandboxGLSLShaderCompilationError` | [shader.ts](src/errors/shader.ts) | `SHADER_ERROR` | GLSL compilation failed |
| `SandboxShaderVersionMismatchError` | [shader.ts](src/errors/shader.ts) | `VALIDATION_ERROR` | Vertex/fragment version mismatch |
| `SandboxShaderRequirementMismatchError` | [shader.ts](src/errors/shader.ts) | `SHADER_ERROR` | Imported uniform type conflicts with existing |
| `SandboxShaderWithoutFunctionError` | [shader.ts](src/errors/shader.ts) | `SHADER_ERROR` | Shader has no functions |
| `SandboxShaderImportSyntaxError` | [shader.ts](src/errors/shader.ts) | `SHADER_ERROR` | Invalid `#import` syntax |
| `SandboxShaderDuplicateImportNameError` | [shader.ts](src/errors/shader.ts) | `SHADER_ERROR` | Same import name/alias used twice |
| `SandboxModuleNotFoundError` | [module.ts](src/errors/module.ts) | `MODULE_ERROR` | Module not registered |
| `SandboxModuleMethodNotFoundError` | [module.ts](src/errors/module.ts) | `MODULE_ERROR` | Function not found in module |
| `SandboxAttemptedToImportMainFunctionError` | [module.ts](src/errors/module.ts) | `MODULE_ERROR` | Importing `main` is forbidden |
| `SandboxAttemptedToImportDefaultFunctionError` | [module.ts](src/errors/module.ts) | `MODULE_ERROR` | `default` is reserved |
| `SandboxForbiddenModuleNameError` | [module.ts](src/errors/module.ts) | `MODULE_ERROR` | User module named `sandbox*` |
| `SandboxOverwriteModuleError` | [module.ts](src/errors/module.ts) | `MODULE_ERROR` | Duplicate module definition |
| `SandboxMentionUniformNotFoundError` | [module.ts](src/errors/module.ts) | `MODULE_ERROR` | `@func.uniform` — uniform not in module |
| `SandboxMentionFunctionNotFoundError` | [module.ts](src/errors/module.ts) | `MODULE_ERROR` | `@func.uniform` — function not imported |
| `SandboxMentionCouldNotBeReplacedError` | [module.ts](src/errors/module.ts) | `MODULE_ERROR` | `@mention` replacement failed |
| `SandboxProgramError` | [program.ts](src/errors/program.ts) | `PROGRAM_ERROR` | Program linking failed |
| `SandboxOnLoadCallbackError` | [unknown.ts](src/errors/unknown.ts) | `UNKNOWN_ERROR` | Error in onLoad callback |
| `SandboxOnHookCallbackError` | [unknown.ts](src/errors/unknown.ts) | `UNKNOWN_ERROR` | Error in hook callback |

Error codes: `CONTEXT_ERROR`, `VALIDATION_ERROR`, `PROGRAM_ERROR`, `SHADER_ERROR`, `MODULE_ERROR`, `UNKNOWN_ERROR`

### Types
File: [src/types.ts](src/types.ts)

Key types:
- `SandboxOptions` - Configuration for Sandbox creation
- `Vec2`, `Vec3`, `Vec4` - Vector types as tuples
- `Mat2`, `Mat3`, `Mat4` - Matrices (column-major order)
- `UniformValue`, `UniformArrayValue`, `AnyUniformValue` - Uniform value types
- `ClockState` - Clock state object (`time`, `delta`, `frame`, `running`, `fps`)
- `HookCallback` - `(clock: ClockState) => void | false`
- `ShaderImport`, `ShaderUniform`, `ShaderFunction`, `ShaderParseResult` - Parser output types
- `ModuleDefinition`, `ModuleMethodOption`, `ModuleFunctionExtraction` - Module types
- `GLSLType`, `GLSLVariable` - GLSL type system

## Shaders

### Default Shaders
| File | Version | Purpose |
|------|---------|---------|
| [src/shaders/webgl1_shader.vert](src/shaders/webgl1_shader.vert) | WebGL1 | Default vertex shader |
| [src/shaders/webgl1_shader.frag](src/shaders/webgl1_shader.frag) | WebGL1 | Default fragment shader |
| [src/shaders/webgl2_shader.vert](src/shaders/webgl2_shader.vert) | WebGL2 | Default vertex shader |
| [src/shaders/webgl2_shader.frag](src/shaders/webgl2_shader.frag) | WebGL2 | Default fragment shader |

### Built-in Module Shaders (beta)
| File | Module name | Purpose |
|------|-------------|---------|
| [src/shaders/modules/sandbox.glsl](src/shaders/modules/sandbox.glsl) | `sandbox` | Core math, UV transforms, noise, constants |
| [src/shaders/modules/colors.glsl](src/shaders/modules/colors.glsl) | `sandbox/colors` | Color conversion, gradients, palettes |
| [src/shaders/modules/time.glsl](src/shaders/modules/time.glsl) | `sandbox/time` | Time shapers, easing curves |
| [src/shaders/modules/effects.glsl](src/shaders/modules/effects.glsl) | `sandbox/effects` | UV-space modifiers (pixelate, twist, ripple...) |
| [src/shaders/modules/filters.glsl](src/shaders/modules/filters.glsl) | `sandbox/filters` | Color filters (contrast, grain, vignette...) |

### WebGL Version Detection
Logic in `Parser.detectVersion()`:
- `#version 300 es` at line start → WebGL2
- No version directive → WebGL1
- Automatic vertex/fragment shader matching when only one is provided

### Vertex Attributes (default shaders)
- `a_position` (vec2) - Vertex position in NDC [-1, 1]
- `a_texcoord` (vec2) - Texture coordinates [0, 1]

### Built-in Uniforms (auto-populated every frame)
| Uniform | Type | Description |
|---------|------|-------------|
| `u_resolution` | vec2 | Canvas size in pixels |
| `u_time` | float | Elapsed time in seconds |
| `u_delta` | float | Delta time since last frame |
| `u_mouse` | vec2 | Mouse position on canvas |
| `u_frame` | int | Frame counter |

Built-in uniforms are globally available and never namespaced — `u_time` is always `u_time`, even inside imported module functions. Defined in `globals.ts` `uniforms` map.

## Module System

### How it works

The module system lets users define reusable GLSL snippets and import them with `#import`. Only fragment shaders are processed — vertex shaders pass through untouched.

### Preprocessing Pipeline

When a shader containing `#import` statements is compiled (`Shader.compile()`), the pipeline:

1. **Parse** — `Parser` extracts imports, uniforms, functions, and dependencies from the source
2. **Resolve** — For each `#import`, look up the module in `MODULES` registry
3. **Extract** — `Module.extract()` pulls the requested function + its dependency tree (tree-shaking)
4. **Namespace** — All imported functions and uniforms get unique prefixes (`alias_randomSuffix_`) to avoid collisions
5. **Mentions** — `@func.uniform` references are resolved to actual namespaced uniform names
6. **Inject** — Built-in uniforms, module uniforms, helper functions, and main functions are inserted at correct positions
7. **Clean** — Triple+ newlines collapsed, import lines removed

### Import Syntax

```glsl
#import functionName from "moduleName"
#import functionName as alias from "moduleName"
```

Each import is fully isolated — importing the same function twice (with different aliases) creates independent copies with separate namespace and uniforms.

### Mention Syntax (`@`)

Uniforms declared in a module are only included when actually referenced. The `@` syntax lets users opt-in to a module's uniform from their shader code:

```glsl
#import effect from "my_module"

void main() {
  vec3 a = effect(uv, 2.0);                  // hardcoded
  vec3 b = effect(uv, @effect.intensity);     // dynamic — controlled via sandbox.module()
}
```

### Module Options

Modules can declare configurable options that map friendly names to GLSL uniforms:

```ts
Sandbox.defineModule("my_effects", source, {
  default: {                                              // shared by all functions
    intensity: { uniform: "u_intensity", default: 1.0 },
  },
  specialFunc: {                                          // overrides for specific function
    intensity: { uniform: "u_intensity", default: 2.0 },
  },
});
```

Runtime configuration via `sandbox.module("funcName", { intensity: 0.8 })` resolves through `RUNTIME_MODULES.resolveOptions()` → finds the uniform name → calls `setUniform()`.

### Key Invariants

- Module names starting with `"sandbox"` are reserved for built-in modules
- Each module can only be defined once (no overwrites)
- Importing `main` or `default` is forbidden
- Built-in uniforms are exempt from namespacing
- `runtime_modules` registry is flushed on every shader switch
- Options use `default` key for shared config, per-function keys override it

## Build System

### Scripts
```bash
npm run build        # Build: vite build + tsc declarations
npm run dev          # Watch mode build
npm run dev:vite     # Watch mode build with Vite only (no typecheck)
npm run dev:tsc      # Watch mode TypeScript compiler only (no Vite)
npm run typecheck    # TypeScript check without emit
npm run clean        # Delete dist/
npm test             # Run tests (vitest)
npm run test:watch   # Watch mode tests
```

### Configuration
- **Vite** for bundling ([vite.config.ts](vite.config.ts))
- **TypeScript** for types ([tsconfig.json](tsconfig.json))
- **Vitest** for testing ([vitest.config.ts](vitest.config.ts))
- Output: ES modules (`index.es.js`) + CommonJS (`index.cjs.js`)
- Shaders imported with `?raw` suffix (Vite feature)

### Tests
| File | Coverage |
|------|----------|
| [tests/parser.test.ts](tests/parser.test.ts) | Parser — imports, uniforms, functions, dependencies |
| [tests/compilable.test.ts](tests/compilable.test.ts) | Compilation pipeline — namespacing, tree-shaking, options |
| [tests/module.test.ts](tests/module.test.ts) | Module — define, extract, copy, dependencies |
| [tests/module_registry.test.ts](tests/module_registry.test.ts) | Registry — CRUD, options, built-in modules |
| [tests/integration.test.ts](tests/integration.test.ts) | End-to-end — full pipeline, aliasing, cascading |
| [tests/clock.test.ts](tests/clock.test.ts) | Clock — timing, FPS, pause/resume |
| [tests/hooks.test.ts](tests/hooks.test.ts) | Hooks — add, remove, self-removing |
| [tests/uniform.test.ts](tests/uniform.test.ts) | Uniforms — type inference, method resolution |
| [tests/globals.test.ts](tests/globals.test.ts) | Global registries — built-in modules, uniforms |

## Key Patterns

### Chainable API
All mutating methods return `this`:
```typescript
sandbox.setUniforms({ u_color: [1, 0, 0] }).time(2.5).render();
```

### Error Handling
Errors are NEVER thrown to user code — always reported via `onError` callback:
```typescript
Sandbox.create(canvas, {
  onError: (error) => {
    console.error(error.code, error.message);
  }
});
```

Module system errors (during preprocessing) ARE thrown as exceptions — they happen at compile time, not runtime.

### Hooks System
- Hooks can be `before` or `after` render
- Returns removal function for cleanup
- If hook returns `false`, it auto-removes (self-removing hooks)
- Used internally for `pauseAt()` implementation

### Uniform Type Inference
`Uniform` class infers correct WebGL method from value type:

| Value | Method |
|-------|--------|
| `number` | `uniform1f` |
| `boolean` | `uniform1i` |
| `[x, y]` | `uniform2fv` |
| `[x, y, z]` | `uniform3fv` |
| `[x, y, z, w]` | `uniform4fv` |
| 9 elements | `uniformMatrix3fv` |
| 16 elements | `uniformMatrix4fv` |
| `[[...], [...]]` | flattened array uniform |

### VAO Compatibility
`Geometry` class handles WebGL1 vs WebGL2 differences:
- WebGL1: Uses `OES_vertex_array_object` extension
- WebGL2: Native `WebGLVertexArrayObject`

### Uniform Location Caching
- Locations cached per program
- Invalidated on shader change via `invalidateLocation()`
- Missing uniforms (optimized out by compiler) silently skipped

## Lifecycle

1. `Sandbox.create(canvas, options)` or `new Sandbox(...)`
2. WebGL context initialization (WebGL2 → WebGL1 fallback)
3. Shader preprocessing (`#import` resolution, compilation)
4. Shader compilation and program linking
5. Fullscreen quad geometry setup
6. Event listeners setup (resize, scroll, mouse, touch)
7. Module options applied from `options.modules`
8. If `autoplay: true`, starts render loop
9. Each frame: before hooks → clear → use program → upload uniforms → draw → after hooks
10. `sandbox.destroy()` - cleanup all resources

## Implementation Details

### Viewport and DPR
- `dpr: "auto"` uses `Math.min(2, window.devicePixelRatio)`
- Canvas resizes on both window resize and canvas element resize
- Resolution uniform updated on viewport change

### pauseWhenHidden
- Scroll listener checks canvas visibility via `getBoundingClientRect()`
- Auto pause/resume based on viewport intersection
- Tracks `pausedByViewport` flag to avoid interfering with manual pause

### Clock Resume Behavior
- On pause: `time` and `frame` preserved
- On resume: `startTime` recalculated so `time` continues smoothly
- `setTime()` allows jumping to specific time point

### Geometry
- Fullscreen quad: 4 vertices, 6 indices (2 triangles)
- Vertices: position (vec2) + texcoord (vec2) = 4 floats per vertex
- Stride: 16 bytes

## Limitations (by design)

- No textures (planned for future)
- No multi-pass rendering
- No 3D scene graph
- No custom geometry (fullscreen quad only)

For complex 3D, use three.js. Sandbox is for pure shader-only effects.

## Common Agent Tasks

### Adding a new built-in uniform
1. Add to `uniforms` Map in [src/globals.ts](src/globals.ts)
2. Add to `Uniforms.BUILT_INS` Set in [src/tools/uniforms.ts](src/tools/uniforms.ts)
3. Add upload logic in `uploadBuiltIns()` method
4. Add to default shaders in `src/shaders/`
5. Update README documentation

### Adding a new error class
1. Add code to `SandboxErrorCode` type in [src/errors/base.ts](src/errors/base.ts) if needed
2. Create new class extending `SandboxError` in appropriate file under `src/errors/`
3. Export from [src/errors/index.ts](src/errors/index.ts)
4. Use in relevant location with `options.onError(error)` (runtime) or `throw` (compile-time)

### Adding a new built-in module
1. Create `.glsl` file in `src/shaders/modules/`
2. Import in [src/globals.ts](src/globals.ts) with `?raw` suffix
3. Register as `new Module("sandbox/name", source, options)` in the `modules` registry
4. Add tests in `tests/module_registry.test.ts` and `tests/integration.test.ts`

### Modifying default shaders
1. Edit appropriate `.vert`/`.frag` file in `src/shaders/`
2. Maintain compatibility with existing attributes and uniforms
3. Keep WebGL1/WebGL2 versions in sync

### Adding a new option to SandboxOptions
1. Add to `SandboxOptions` interface in [src/types.ts](src/types.ts)
2. Add default value in `resolveOptions()` in [src/index.ts](src/index.ts)
3. Implement logic in appropriate location
4. Update README documentation

### Adding a new public method to Sandbox
1. Add method to `Sandbox` class in [src/index.ts](src/index.ts)
2. Delegate to `WebGL` engine if needed
3. Return `this` for chainability
4. Add JSDoc with `@example`

## Code Examples

### Basic Setup
```typescript
import { Sandbox } from "@rosalana/sandbox";

const sandbox = Sandbox.create(canvas, {
  fragment: myShaderSource,
});
```

### Module Import in Shader
```glsl
#import hex from "sandbox/colors"
#import twist from "sandbox/effects"
#import contrast from "sandbox/filters"

void main() {
  vec2 uv = v_texcoord;
  uv = twist(uv, 0.3);
  vec3 color = hex(0xFF6600);
  color = contrast(color, @contrast.intensity);
  fragColor = vec4(color, 1.0);
}
```

### Define Custom Module
```typescript
Sandbox.defineModule("my_effects", myGLSLSource, {
  myFunc: {
    speed: { uniform: "u_speed", default: 1.0 },
  },
});
```

### Runtime Module Configuration
```typescript
sandbox.module("twist", { intensity: 0.5 });
sandbox.module("contrast", { intensity: 1.8 });
```

### Custom Uniforms
```typescript
sandbox.setUniform<Vec3>("u_color", [1, 0.2, 0.3]);
sandbox.setUniforms({
  u_intensity: 0.75,
  u_colors: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
});
```

### Static Rendering
```typescript
const sandbox = Sandbox.create(canvas, {
  fragment: myShader,
  autoplay: false,
});
sandbox.renderAt(1.5);
```

### Time Control
```typescript
sandbox.time(2.5);      // Set time to 2.5s
sandbox.playAt(10);     // Start playing from 10s
sandbox.pauseAt(20);    // Auto-pause when time reaches 20s
```

### Vue Integration
```typescript
const sandbox = shallowRef<Sandbox | null>(null);

onMounted(() => {
  sandbox.value = Sandbox.create(canvasRef.value!, {
    fragment: shader,
    onAfterRender: () => {
      isPlaying.value = sandbox.value?.isPlaying() ?? false;
    },
  });
});

onUnmounted(() => {
  sandbox.value?.destroy();
});
```
