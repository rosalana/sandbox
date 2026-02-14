[![Rosalana](https://raw.githubusercontent.com/rosalana/.github/main/Sandbox_Banner.png)](https://github.com/rosalana)

<div align="center">

[![npm version](https://img.shields.io/npm/v/@rosalana/sandbox?style=flat&colorA=18181B&colorB=28CF8D)](https://www.npmjs.com/package/@rosalana/sandbox)
[![npm downloads](https://img.shields.io/npm/dm/@rosalana/sandbox?style=flat&colorA=18181B&colorB=28CF8D)](https://www.npmjs.com/package/@rosalana/sandbox)
[![GitHub stars](https://img.shields.io/github/stars/rosalana/sandbox?style=flat&colorA=18181B&colorB=28CF8D)](https://github.com/rosalana/sandbox/stargazers)
[![License](https://img.shields.io/npm/l/@rosalana/sandbox?style=flat&colorA=18181B&colorB=28CF8D)](https://github.com/rosalana/sandbox/blob/master/LICENCE)

[![Open in CodeSandbox](https://img.shields.io/badge/Open%20in-CodeSandbox-28CF8D?style=for-the-badge&logo=codesandbox&logoColor=white&colorA=18181B)](https://codesandbox.io/p/sandbox/nervous-greider-76wsrk)
[![Report Issue](https://img.shields.io/badge/Report-Issue-FF6B6B?style=for-the-badge&logo=github&logoColor=white&colorA=18181B)](https://github.com/rosalana/sandbox/issues)

</div>

**Rosalana Sandbox** is a lightweight WebGL wrapper for **simple, beautiful shader effects**. It focuses on a clean API, type safety, and fast setup so you can go from idea to a shader in minutes.

It's **DX‑friendly**, small, and intentionally minimal — perfect for gradients, ambient backgrounds, and animated GLSL experiments. If you're not building a full 3D engine, Sandbox is a delightful alternative to larger libraries like three.js or p5.js.

### Bundle size comparison

| Library     | Minified | Gzipped   |
| ----------- | -------- | --------- |
| **Sandbox** | 57 KB    | **15 KB** |
| three.js    | 694 KB   | 175 KB    |
| p5.js       | 1.1 MB   | 351 KB    |

Sandbox is **~22x smaller** than three.js and **~44x smaller** than p5.js.

It works in both **WebGL1 and WebGL2** contexts, with automatic fallback and detection.

## Table of Contents

- [Installation](#installation)
- [Quick setup](#quick-setup)
- [Playback control](#playback-control)
  - [Time control](#time-control)
  - [Static rendering](#static-rendering)
- [Sandbox Shaders](#sandbox-shaders)
  - [Writing shaders](#writing-shaders)
  - [Importing effects](#importing-effects)
  - [Multiple imports and aliasing](#multiple-imports-and-aliasing)
  - [Built‑in uniforms](#built-in-uniforms)
  - [Custom uniforms](#custom-uniforms)
  - [Configuring modules](#configuring-modules)
  - [Built‑in modules](#built-in-modules)
  - [Defining your own modules](#defining-your-own-modules)
  - [Module options and defaults](#module-options-and-defaults)
- [Hooks](#hooks)
  - [Self-removing hooks](#self-removing-hooks)
- [Chaining](#chaining)
- [Error handling](#error-handling)
- [Vue integration](#vue-integration)
- [Cleanup](#cleanup)
- [Options](#options)
- [Limitations (by design)](#limitations-by-design)
- [License](#license)

## Installation

```bash
npm install @rosalana/sandbox
```

## Quick setup

Sandbox is designed to get you up and running with minimal effort. It ships with sensible defaults, so in most cases it only takes a few lines of code to get started.

```ts
import { Sandbox } from "@rosalana/sandbox";

const sandbox = Sandbox.create(canvas, {
  fragment: fragSource,
});
```

That's it. You get a running render loop and a fullscreen quad. No WebGL ceremony, no boilerplate — just your shader doing its thing.

## Playback control

Autoplay is enabled by default, so your shader starts rendering immediately. But you're in full control — pause, play, scrub through time, whatever you need.

```ts
sandbox.play();
sandbox.pause();
sandbox.toggle();
```

Want to know if it's running?

```ts
sandbox.isPlaying();
```

### Time control

This is where it gets fun. You can jump to any point in time, which is perfect for debugging or creating deterministic renders.

Start playing from a specific moment:

```ts
sandbox.playAt(2.5);
```

Or set up an auto-pause — great for intro animations that should stop after a few seconds:

```ts
sandbox.pauseAt(10);
```

### Static rendering

Sometimes you don't need animation at all. Maybe you're generating a gradient thumbnail or rendering a single frame for export.

```ts
const sandbox = Sandbox.create(canvas, {
  fragment: fragSource,
  autoplay: false,
});

sandbox.render();
```

Or render at a specific time — perfect for deterministic, reproducible output:

```ts
sandbox.renderAt(1.5);
```

## Sandbox Shaders

Let's be honest — writing GLSL from scratch is painful. Figuring out the right uniform declarations, copy-pasting utility functions from Shadertoy, wiring everything together... it's a lot of ceremony before you even see a pixel.

Sandbox changes that. We built a **smart shader preprocessor** that lets you `#import` ready-made effects and utilities directly into your shader. No boilerplate, no manual uniform wiring. Just pick what you need and go.

### Writing shaders

You only need to provide a fragment shader. Sandbox ships with a default fullscreen vertex shader and automatically matches WebGL versions — so you can focus on the fun part.

```ts
sandbox.setFragment(fragmentSource);
```

Need full control over both shaders? No problem:

```ts
sandbox.setShader(vertexSource, fragmentSource);
```

Sandbox detects WebGL version from your code (`#version 300 es` → WebGL2, no directive → WebGL1) and falls back gracefully. You can always check what you're running:

```ts
sandbox.version; // 1 or 2
```

### Importing effects

Here's where things get interesting. Say you find a cool gradient function online, or you want to use one of Sandbox's built-in effects. Instead of copy-pasting GLSL code and manually declaring uniforms, just import it:

```glsl
#import gradient from "sandbox"

void main() {
  vec3 color = gradient(v_texcoord.x);
  fragColor = vec4(color, 1.0);
}
```

**That's the entire shader.** Sandbox handles the rest — it pulls in the `gradient` function, figures out which uniforms it needs, declares them, namespaces everything to avoid conflicts, and injects it all into your final GLSL. You never see the plumbing.

Only the functions you actually import (and their dependencies) end up in the compiled shader. Everything else is tree-shaken away.

### Multiple imports and aliasing

Want to use the same effect twice with different settings? Use `as` to create independent copies:

```glsl
#import gradient as background from "sandbox"
#import gradient as overlay from "sandbox"

void main() {
  vec3 bg = background(v_texcoord.x);
  vec3 fg = overlay(v_texcoord.y);
  fragColor = vec4(mix(bg, fg, 0.5), 1.0);
}
```

Each import gets its own isolated set of uniforms. You can configure `background` and `overlay` completely independently — they don't interfere with each other.

### Built‑in uniforms

These uniforms are populated automatically every frame. Just use them in your shader — no declaration or setup needed:

| Uniform        | Type  | Description                 |
| -------------- | ----- | --------------------------- |
| `u_resolution` | vec2  | Canvas size in pixels       |
| `u_time`       | float | Elapsed time (seconds)      |
| `u_delta`      | float | Delta time since last frame |
| `u_mouse`      | vec2  | Mouse position on canvas    |
| `u_frame`      | int   | Frame counter               |

Built-in uniforms are globally available — even inside imported module functions. They're never namespaced, so `u_time` is always just `u_time`, everywhere.

### Custom uniforms

But what if you need your own data in the shader? Custom uniforms still work exactly how you'd expect. Declare them in your GLSL, then set them from JavaScript:

```ts
sandbox.setUniform<number>("u_intensity", 0.8);

sandbox.setUniforms({
  u_intensity: 0.75,
  u_color: [1, 0.2, 0.3],
});
```

Read a value back:

```ts
const intensity = sandbox.getUniform<number>("u_intensity");
```

Everything is **type-safe** and **chainable**. All numeric values are treated as floats — simple and predictable.

### Configuring modules

The real power of modules comes from how easy they are to configure. You don't need to know the underlying GLSL uniform names — just use the option names the module exposes.

Set module options when creating the Sandbox:

```ts
const sandbox = Sandbox.create(canvas, {
  fragment: myShader,
  modules: {
    background: {
      colors: [
        [1, 0, 0],
        [0, 1, 0],
      ],
    },
    overlay: {
      colors: [
        [0, 0, 1],
        [1, 1, 0],
      ],
    },
  },
});
```

Or change them at any time during runtime:

```ts
sandbox.module("background", {
  colors: [
    [0.2, 0.1, 0.5],
    [0.8, 0.3, 0.1],
  ],
});
```

That's it. Sandbox resolves the right uniforms under the hood — you just describe what you want.

> ![IMPORTANT]
> The module has to be in use when you set options, otherwise Sandbox doesn't know which uniforms to target.

### Built‑in modules

Sandbox ships with a growing library of ready-to-use GLSL modules. Just import and go.

<!-- TODO: This section will be expanded as more modules are added -->

### Defining your own modules

Found a great GLSL snippet on the internet? Turn it into a reusable module in one line:

```ts
Sandbox.defineModule("my_effects", myGLSLSource);
```

Then import from it in any shader:

```glsl
#import bloom from "my_effects"
```

You can preview how your shader will compile by using:

```ts
Sandbox.compile(shaderSource);
```

This is a great way to debug or precompile shaders before deploying.

Module names starting with `"sandbox"` are reserved for built-in modules. Each module can only be defined once — this prevents accidental overwrites.

### Module options and defaults

When defining a module, you can declare configurable options that map human-friendly names to GLSL uniforms. This is what powers the `sandbox.module()` API:

```ts
Sandbox.defineModule("my_gradient", gradientSource, {
  myFunc: {
    colors: {
      uniform: "u_colors",
      default: [
        [1, 0, 0],
        [0, 0, 1],
      ],
    },
    speed: { uniform: "u_speed", default: 1.0 },
  },
});
```

Each option has a `uniform` (the GLSL name it maps to) and an optional `default` value that's automatically applied when the function is imported.

If all functions in your module share the same options, use the `default` key to avoid repetition. We really recommend to share logic across one module.

```ts
Sandbox.defineModule("my_module", source, {
  default: {
    colors: {
      uniform: "u_colors",
      default: [
        [1, 0, 0],
        [0, 0, 1],
      ],
    },
    speed: { uniform: "u_speed", default: 1.0 },
  },
  specialFunc: {
    speed: { uniform: "u_speed", default: 2.0 },
    // "colors" is inherited from default
  },
});
```

Per-function options always take priority over `default` when both define the same key.

Want to see what's available? Inspect all registered modules and their options at any time:

```ts
Sandbox.availableModules();
```

## Hooks

Hooks are one of the most powerful features in Sandbox. They let you run logic every frame — before or after render — which opens up a world of possibilities.

The callback receives a `ClockState` object with `time`, `delta`, `frame`, `running`, and `fps` (smoothed).

**Pre-compute values on the CPU** before they hit the shader:

```ts
sandbox.hook(({ time }) => {
  const intensity = (Math.sin(time) + 1) / 2;
  sandbox.setUniform("u_intensity", intensity);
}, "before");
```

**Sync state with reactive frameworks** like Vue or React:

```ts
const playing = ref(false);

sandbox.hook(() => {
  playing.value = sandbox.isPlaying();
}, "after");
```

The hook returns a removal function, so you can clean up whenever you want:

```ts
const remove = sandbox.hook(({ time }) => {
  console.log(time);
}, "after");

remove();
```

### Self-removing hooks

Sometimes you need a hook that runs only until a condition is met. Just return `false` and the hook removes itself:

```ts
sandbox.hook(({ time }) => {
  if (time > 5) return false;
}, "after");
```

This is how `pauseAt()` works internally — it's hooks all the way down.

## Chaining

Every method returns `this`, so you can chain calls for clean, expressive code:

```ts
sandbox
  .setUniforms({ u_color: [1, 0, 0] })
  .time(2.5)
  .render();
```

## Error handling

Shader errors happen — typos, syntax mistakes, driver quirks. Sandbox handles them gracefully and reports them via a single callback. No try/catch needed.

```ts
Sandbox.create(canvas, {
  fragment: shader,
  onError: (error) => {
    console.error(error.message);
  },
});
```

The error object includes useful details:

- `error.code` — error category (see table below)
- `error.lines` — line numbers where errors occurred (for shader compilation errors)
- `error.shaderType` — which shader failed (`vertex` or `fragment`)

| Code               | When                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------- |
| `CONTEXT_ERROR`    | WebGL not supported or context creation failed                                        |
| `SHADER_ERROR`     | Shader compilation failed, version mismatch, import syntax error, or missing function |
| `PROGRAM_ERROR`    | Shader program linking failed                                                         |
| `VALIDATION_ERROR` | Vertex/fragment shader version mismatch                                               |
| `MODULE_ERROR`     | Module not found, method not found, forbidden name, or duplicate definition           |
| `UNKNOWN_ERROR`    | Unexpected error in callbacks (onLoad, hooks)                                         |

## Vue integration

Here's a complete example showing how to use Sandbox with Vue's reactivity system:

```vue
<script setup lang="ts">
import { shallowRef, ref, onMounted, onUnmounted } from "vue";
import { Sandbox } from "@rosalana/sandbox";

const canvasRef = ref<HTMLCanvasElement>();
const sandbox = shallowRef<Sandbox | null>(null);
const isPlaying = ref(false);

onMounted(() => {
  sandbox.value = Sandbox.create(canvasRef.value!, {
    onAfterRender: () => {
      isPlaying.value = sandbox.value?.isPlaying() ?? false;
    },
  });
});

onUnmounted(() => {
  sandbox.value?.destroy();
});
</script>

<template>
  {{ isPlaying ? "Playing" : "Paused" }}
  <canvas ref="canvasRef" />
</template>
```

Use `shallowRef` for the Sandbox instance — you don't want Vue making the WebGL context reactive.

## Cleanup

Always destroy when you're done. This releases all WebGL resources and removes event listeners:

```ts
sandbox.destroy();
```

In frameworks like Vue:

```ts
onUnmounted(() => {
  sandbox.destroy();
});
```

## Options

```ts
interface SandboxOptions {
  vertex?: string;
  fragment?: string;
  autoplay?: boolean;
  pauseWhenHidden?: boolean;
  dpr?: number | "auto";
  fps?: number;
  preserveDrawingBuffer?: boolean;
  antialias?: boolean;
  onError?: (error: SandboxError) => void;
  onLoad?: () => void;
  onBeforeRender?: HookCallback | null;
  onAfterRender?: HookCallback | null;
  uniforms?: UniformSchema;
  modules?: Record<string, Record<string, AnyUniformValue>>;
}
```

| Option                  | Default         | Description                                    |
| ----------------------- | --------------- | ---------------------------------------------- |
| `vertex`                | built-in        | Custom vertex shader                           |
| `fragment`              | built-in        | Fragment shader                                |
| `autoplay`              | `true`          | Start rendering immediately                    |
| `pauseWhenHidden`       | `true`          | Pause when scrolled out of view                |
| `dpr`                   | `"auto"`        | Device pixel ratio                             |
| `fps`                   | `0` (unlimited) | Max frame rate (approximate due to rAF timing) |
| `preserveDrawingBuffer` | `false`         | Keep buffer for screenshots                    |
| `antialias`             | `true`          | Enable antialiasing                            |
| `onError`               | `console.error` | Error callback                                 |
| `onLoad`                | —               | Called on each shader compilation              |
| `onBeforeRender`        | —               | Hook before each frame                         |
| `onAfterRender`         | —               | Hook after each frame                          |
| `uniforms`              | —               | Initial uniform values                         |
| `modules`               | —               | Configure module options per imported function |

## Limitations (by design)

- No textures (planned for future)
- No multi‑pass rendering
- No 3D scene graph

If you need a full engine, reach for three.js. For clean shader‑only effects, Sandbox is a joy to use.

## License

Rosalana Sandbox is open-source under the [MIT license](/LICENCE), allowing you to freely use, modify, and distribute it with minimal restrictions.

You may not be able to use our systems but you can use our code to build your own.

For details on how to contribute or how the Rosalana ecosystem is maintained, please refer to each repository's individual guidelines.

**Questions or feedback?**

Feel free to open an issue or contribute with a pull request. Happy coding with Rosalana!
