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
| **Sandbox** | 85 KB    | **23 KB** |
| three.js    | 694 KB   | 175 KB    |
| p5.js       | 1.1 MB   | 351 KB    |

Sandbox is **~8x smaller** than three.js and **~15x smaller** than p5.js.

It works in both **WebGL1 and WebGL2** contexts, with automatic fallback and detection.

## Table of Contents

- [Installation](#installation)
- [Quick setup](#quick-setup)
- [Playback control](#playback-control)
  - [Time control](#time-control)
  - [Static rendering](#static-rendering)
- [Sandbox Shaders](#sandbox-shaders)
- [Hooks](#hooks)
  - [Self-removing hooks](#self-removing-hooks)
- [Textures](#textures)
  - [Texture options](#texture-options)
  - [Dynamic textures](#dynamic-textures)
- [Export](#export)
  - [Streaming](#streaming)
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

Writing GLSL from scratch means a lot of ceremony — uniform declarations, copy-pasting utility functions, wiring everything together. Sandbox takes care of the boring parts so you can focus on the shader itself.

The idea is simple: define reusable GLSL snippets as **modules**, then `#import` them with a single line. Sandbox resolves dependencies, declares uniforms, and injects everything into the final shader automatically.

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

### Built-in uniforms

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

Need your own data in the shader? Declare the uniform in GLSL, then set it from JavaScript:

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

### Modules

> [!IMPORTANT]
> Sandbox's built-in GLSL modules are still in beta and may change at any time.
> We published them early to get feedback. If you have ideas for improvements, please open an issue or a PR — we'd love your input.

Modules are reusable GLSL snippets that you can import into any shader. Sandbox ships with a built-in `"sandbox"` module, and you can define your own:

```ts
Sandbox.defineModule("my_effects", myGLSLSource);
```

Then import any function from it:

```glsl
#import bloom from "my_effects"
#import hex from "sandbox"

void main() {
  vec3 color = hex(0xFF5733);
  fragColor = vec4(bloom(color), 1.0);
}
```

When you import a function, Sandbox pulls in everything it needs — the function body, any helper functions it calls, and any required uniforms. Each import is fully isolated, so importing the same function twice won't cause conflicts.

> [!NOTE]
> All imported code is namespaced automatically to avoid naming collisions.

Module names starting with `"sandbox"` are reserved for built-in modules. Each module can only be defined once — this prevents accidental overwrites.

Want to see what's available? Inspect all registered modules at any time:

```ts
Sandbox.availableModules();
```

You can also preview how your shader will look after processing:

```ts
Sandbox.compile(shaderSource);
```

This is useful for debugging or precompiling shaders before deploying.

### Module options

Imported functions can expose configurable options — friendly names that map to GLSL uniforms under the hood. You control them from JavaScript using `sandbox.module()`:

```ts
sandbox.module("effect", {
  intensity: 0.8,
});
```

This is a powerful way to customize imported effects without touching any GLSL code.

#### Hardcoded vs. dynamic values

By default, a module's uniforms are only included in the final shader when you actually reference them. This gives you a choice — hardcode a value directly, or use the `@` syntax to wire it up as a configurable uniform:

```glsl
#import effect from "my_module"

void main() {
  vec3 a = effect(v_texcoord, 2.0);                  // hardcoded value
  vec3 b = effect(v_texcoord, @effect.intensity);     // dynamic — set via sandbox.module()
  fragColor = vec4(a + b, 1.0);
}
```

The `@effect.intensity` syntax tells Sandbox to inject the uniform and keep it in sync with whatever you set in JavaScript.

#### Defining options

When defining a module, you declare which options each function supports:

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

Each option has a `uniform` (the GLSL name it maps to) and an optional `default` value applied automatically on import.

If all functions in your module share the same options, use the `default` key to avoid repetition:

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

## Textures

Sandbox supports textures as `sampler2D` uniforms. Pass any image, canvas, or video element and Sandbox takes care of the WebGL plumbing — creating the texture, binding it to a texture unit, and setting the sampler uniform.

```ts
const img = new Image();
img.src = "photo.jpg";
img.onload = () => {
  sandbox.setTexture("u_texture", img);
};
```

Then sample it in your shader:

```glsl
uniform sampler2D u_texture;

void main() {
  vec4 color = texture2D(u_texture, v_texcoord);
  gl_FragColor = color;
}
```

Multiple textures work the same way — each gets its own texture unit automatically:

```ts
sandbox.setTexture("u_photo", photoImg);
sandbox.setTexture("u_mask", maskImg);
```

You can also set textures upfront via options:

```ts
Sandbox.create(canvas, {
  fragment: shader,
  textures: {
    u_photo: photoImg,
    u_mask: { source: maskImg, wrap: "repeat" },
  },
});
```

### Texture options

Each texture accepts optional configuration for wrapping, filtering, and orientation:

```ts
sandbox.setTexture("u_texture", img, {
  wrap: "repeat", // both axes (default: "clamp")
  minFilter: "nearest", // pixelated look (default: "linear")
  flipY: false, // disable vertical flip (default: true)
});
```

| Option      | Values                             | Default    |
| ----------- | ---------------------------------- | ---------- |
| `wrap`      | `"clamp"`, `"repeat"`, `"mirror"`  | `"clamp"`  |
| `wrapS`     | same (overrides `wrap` for S axis) | `wrap`     |
| `wrapT`     | same (overrides `wrap` for T axis) | `wrap`     |
| `minFilter` | `"nearest"`, `"linear"`            | `"linear"` |
| `magFilter` | `"nearest"`, `"linear"`            | `"linear"` |
| `flipY`     | `boolean`                          | `true`     |
| `dynamic`   | `boolean`                          | auto       |

### Dynamic textures

When you pass a video element, Sandbox automatically re-uploads pixels every frame so the texture stays in sync with playback. This also works for animated canvases — just set `dynamic: true`:

```ts
// Video — dynamic by default
sandbox.setTexture("u_video", videoElement);

// Animated canvas — opt in
sandbox.setTexture("u_canvas", canvasElement, { dynamic: true });
```

To remove a texture and free its GPU memory:

```ts
sandbox.removeTexture("u_texture");
```

## Export

Sandbox can export the current frame as an image or blob — useful for saving screenshots, generating thumbnails, or uploading processed images to a server.

```ts
// Data URL (synchronous)
const url = sandbox.renderAt(1.5).exportAsURL("image/png");

// Blob (async) — perfect for server uploads
const blob = await sandbox.renderAt(1.5).exportAsBlob("image/jpeg", 0.9);
await fetch("/upload", { method: "POST", body: blob });

// HTMLImageElement
const img = sandbox.renderAt(1.5).exportAsImage("image/png");
document.body.appendChild(img);
```

> [!NOTE]
> Export methods work reliably after `render()` or `renderAt()`. If you need to capture frames during an active render loop, set `preserveDrawingBuffer: true` in options.

### Streaming

For real-time use cases like video calls or recording, Sandbox can expose the canvas as a `MediaStream`:

```ts
// WebRTC — send shader output to a video call
const stream = sandbox.stream(30);
peerConnection.addTrack(stream.getVideoTracks()[0], stream);

// Recording — save as video file
const recorder = new MediaRecorder(sandbox.stream(30));
recorder.start();
```

This opens up workflows like **webcam → texture → shader effect → video call** with just a few lines of code.

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
| `TEXTURE_ERROR`    | Texture creation failed or texture unit limit exceeded                                |
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
  textures?: TextureSchema;
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
| `textures`              | —               | Initial textures to bind to sampler uniforms   |

## Limitations (by design)

- No multi‑pass rendering
- No 3D scene graph
- No custom geometry (fullscreen quad only)

If you need a full engine, reach for three.js. For clean shader‑only effects, Sandbox is a joy to use.

## License

Rosalana Sandbox is open-source under the [MIT license](/LICENCE), allowing you to freely use, modify, and distribute it with minimal restrictions.

You may not be able to use our systems but you can use our code to build your own.

For details on how to contribute or how the Rosalana ecosystem is maintained, please refer to each repository's individual guidelines.

**Questions or feedback?**

Feel free to open an issue or contribute with a pull request. Happy coding with Rosalana!
