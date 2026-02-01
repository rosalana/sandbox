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

| Library     | Minified | Gzipped  |
| ----------- | -------- | -------- |
| **Sandbox** | 31 KB    | **8 KB** |
| three.js    | 694 KB   | 175 KB   |
| p5.js       | 1.1 MB   | 351 KB   |

Sandbox is **~22x smaller** than three.js and **~44x smaller** than p5.js.

It works in both **WebGL1 and WebGL2** contexts, with automatic fallback and detection.

## Table of Contents

- [Installation](#installation)
- [Quick setup](#quick-setup)
- [Playback control](#playback-control)
  - [Time control](#time-control)
  - [Static rendering](#static-rendering)
- [Shaders](#shaders)
  - [WebGL version detection](#webgl-version-detection)
- [Uniforms](#uniforms)
- [Built‑in uniforms](#built-in-uniforms)
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

## Shaders

Shaders are the only thing you need to provide. Sandbox comes with a default fullscreen vertex shader, so you usually don't need to write one yourself — and it automatically switches between WebGL1 and WebGL2 versions depending on your fragment shader.

Update your fragment shader on the fly:

```ts
sandbox.setFragment(fragmentSource);
```

When you need full control over both vertex and fragment:

```ts
sandbox.setShader(vertexSource, fragmentSource);
```

### WebGL version detection

Sandbox figures out which WebGL version you're using by looking at your shader code:

- `#version 300 es` → WebGL2
- no version directive → WebGL1

If WebGL2 isn't available, Sandbox falls back to WebGL1 automatically. You can always check what you're running:

```ts
sandbox.webglVersion();
```

## Uniforms

Uniforms are how you feed data into your shader. Sandbox makes them **type‑safe** and **chainable** — no more guessing what went wrong.

Set a single uniform:

```ts
sandbox.setUniform<number>("u_intensity", 0.8);
```

Set multiple uniforms at once:

```ts
sandbox.setUniforms<{
  u_intensity: number;
  u_color: Vec3;
}>({
  u_intensity: 0.75,
  u_color: [1, 0.2, 0.3],
});
```

Read back a uniform value:

```ts
const intensity = sandbox.getUniform<number>("u_intensity");
```

All numeric values are treated as floats. This keeps the API simple and predictable.

## Built‑in uniforms

These uniforms are filled automatically every frame — no setup needed. Just declare them in your shader and they work:

| Uniform        | Type  | Description                 |
| -------------- | ----- | --------------------------- |
| `u_resolution` | vec2  | Canvas size in pixels       |
| `u_time`       | float | Elapsed time (seconds)      |
| `u_delta`      | float | Delta time since last frame |
| `u_mouse`      | vec2  | Mouse position on canvas    |
| `u_frame`      | int   | Frame counter               |

## Hooks

Hooks are one of the most powerful features in Sandbox. They let you run logic every frame — before or after render — which opens up a world of possibilities.

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

- `error.code` — error type (`SHADER_COMPILATION_FAILED`, `PROGRAM_LINK_FAILED`, etc.)
- `error.lines` — line numbers where errors occurred (for compilation errors)
- `error.shaderType` — which shader failed (`vertex` or `fragment`)

Error codes: `WEBGL_NOT_SUPPORTED`, `SHADER_COMPILATION_FAILED`, `PROGRAM_LINK_FAILED`, `SHADER_VERSION_MISMATCH`

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
  preserveDrawingBuffer?: boolean;
  antialias?: boolean;
  onError?: (error: SandboxError) => void;
  onLoad?: () => void;
  onBeforeRender?: HookCallback | null;
  onAfterRender?: HookCallback | null;
  uniforms?: UniformSchema;
}
```

| Option                  | Default         | Description                     |
| ----------------------- | --------------- | ------------------------------- |
| `vertex`                | built-in        | Custom vertex shader            |
| `fragment`              | built-in        | Fragment shader                 |
| `autoplay`              | `true`          | Start rendering immediately     |
| `pauseWhenHidden`       | `true`          | Pause when scrolled out of view |
| `dpr`                   | `"auto"`        | Device pixel ratio              |
| `preserveDrawingBuffer` | `false`         | Keep buffer for screenshots     |
| `antialias`             | `true`          | Enable antialiasing             |
| `onError`               | `console.error` | Error callback                  |
| `onLoad`                | —               | Called when ready               |
| `onBeforeRender`        | —               | Hook before each frame          |
| `onAfterRender`         | —               | Hook after each frame           |
| `uniforms`              | —               | Initial uniform values          |

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
