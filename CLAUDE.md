# CLAUDE.md - Rosalana Sandbox

## Project Overview

**@rosalana/sandbox** is a lightweight WebGL wrapper for simple, beautiful shader effects. Focuses on clean API, type safety, and fast setup. Ideal for gradients, ambient backgrounds, and animated GLSL experiments.

- **Bundle size**: 31 KB minified, 8 KB gzipped (22x smaller than three.js)
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

### Error Classes
File: [src/errors.ts](src/errors.ts)

| Class | Code | When |
|-------|------|------|
| `SandboxContextError` | `WEBGL_NOT_SUPPORTED` | WebGL not available in browser |
| `SandboxContextError` | `CONTEXT_CREATION_FAILED` | GPU unavailable |
| `SandboxShaderCompilationError` | `SHADER_COMPILATION_FAILED` | Shader syntax error |
| `SandboxProgramError` | `PROGRAM_LINK_FAILED` | Program linking failed |
| `SandboxShaderVersionMismatchError` | `SHADER_VERSION_MISMATCH` | Vertex/fragment version mismatch |

### Types
File: [src/types.ts](src/types.ts)

Key types:
- `SandboxOptions` - Configuration for Sandbox creation
- `Vec2`, `Vec3`, `Vec4` - Vector types as tuples
- `Mat2`, `Mat3`, `Mat4` - Matrices (column-major order)
- `UniformValue`, `UniformArrayValue`, `AnyUniformValue` - Uniform value types
- `ClockState` - Clock state object (`time`, `delta`, `frame`)
- `HookCallback` - `(clock: ClockState) => void | false`

## Shaders

### Default Shaders
| File | Version | Purpose |
|------|---------|---------|
| [src/shaders/webgl1_shader.vert](src/shaders/webgl1_shader.vert) | WebGL1 | Default vertex shader |
| [src/shaders/webgl1_shader.frag](src/shaders/webgl1_shader.frag) | WebGL1 | Default fragment shader |
| [src/shaders/webgl2_shader.vert](src/shaders/webgl2_shader.vert) | WebGL2 | Default vertex shader |
| [src/shaders/webgl2_shader.frag](src/shaders/webgl2_shader.frag) | WebGL2 | Default fragment shader |

### WebGL Version Detection
Logic in `Program.detectVersion()`:
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

## Build System

### Scripts
```bash
npm run build      # Build: vite build + tsc declarations
npm run dev        # Watch mode build
npm run typecheck  # TypeScript check without emit
npm run clean      # Delete dist/
```

### Configuration
- **Vite** for bundling ([vite.config.ts](vite.config.ts))
- **TypeScript** for types ([tsconfig.json](tsconfig.json))
- Output: ES modules (`index.es.js`) + CommonJS (`index.cjs.js`)
- Shaders imported with `?raw` suffix (Vite feature)

## Key Patterns

### Chainable API
All mutating methods return `this`:
```typescript
sandbox.setUniforms({ u_color: [1, 0, 0] }).time(2.5).render();
```

### Error Handling
Errors are NEVER thrown to user code - always reported via `onError` callback:
```typescript
Sandbox.create(canvas, {
  onError: (error) => {
    console.error(error.code, error.message);
    // error.lines - array of line numbers (for shader errors)
    // error.shaderType - 'vertex' | 'fragment'
  }
});
```

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
3. Shader compilation and program linking
4. Fullscreen quad geometry setup
5. Event listeners setup (resize, scroll, mouse, touch)
6. If `autoplay: true`, starts render loop
7. Each frame: before hooks → clear → use program → upload uniforms → draw → after hooks
8. `sandbox.destroy()` - cleanup all resources

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
1. Add to `Uniforms.BUILT_INS` Set in [src/tools/uniforms.ts:20](src/tools/uniforms.ts#L20)
2. Add upload logic in `uploadBuiltIns()` method
3. Add to default shaders in `src/shaders/`
4. Update README documentation

### Adding a new error class
1. Add code to `SandboxErrorCode` type in [src/errors.ts:2](src/errors.ts#L2)
2. Create new class extending `SandboxError`
3. Use in relevant location with `options.onError(error)`

### Modifying default shaders
1. Edit appropriate `.vert`/`.frag` file in `src/shaders/`
2. Maintain compatibility with existing attributes and uniforms
3. Keep WebGL1/WebGL2 versions in sync

### Adding a new option
1. Add to `SandboxOptions` interface in [src/types.ts:4](src/types.ts#L4)
2. Add default value in `resolveOptions()` in [src/index.ts:90](src/index.ts#L90)
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

### Static Rendering
```typescript
const sandbox = Sandbox.create(canvas, {
  fragment: myShader,
  autoplay: false,
});
sandbox.renderAt(1.5); // Render at t=1.5s
```

### Custom Uniforms
```typescript
sandbox.setUniform<Vec3>("u_color", [1, 0.2, 0.3]);
sandbox.setUniforms({
  u_intensity: 0.75,
  u_colors: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], // vec3 array
});
```

### Self-removing Hook
```typescript
sandbox.hook(({ time }) => {
  if (time > 5) return false; // removes itself after 5s
  sandbox.setUniform("u_intensity", Math.sin(time));
}, "before");
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

### Dynamic Shader Update
```typescript
// Update only fragment (vertex auto-matched)
sandbox.setFragment(newFragmentSource);

// Update both shaders
sandbox.setShader(vertexSource, fragmentSource);
```

### Time Control
```typescript
sandbox.time(2.5);      // Set time to 2.5s
sandbox.playAt(10);     // Start playing from 10s
sandbox.pauseAt(20);    // Auto-pause when time reaches 20s
```
