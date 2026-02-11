import Module from "../tools/module";
import Compilable from "../tools/compilable";

// Define a test module with helper functions and uniforms
Module.define({
  name: "effects",
  source: `
uniform float u_intensity;
uniform float u_radius;

float helper(float x) {
  return x * u_intensity;
}

vec4 blur(sampler2D tex, vec2 uv, vec2 resolution) {
  float h = helper(u_radius);
  return vec4(h, h, h, 1.0);
}

vec4 bloom(sampler2D tex, vec2 uv, vec2 resolution) {
  float h = helper(u_intensity);
  return vec4(h, 0.0, 0.0, 1.0);
}
`,
});

// Test shader that imports from the module
const testShader = `#version 300 es
precision highp float;

#import blur from 'effects'
#import bloom as glow from 'effects'

uniform sampler2D u_texture;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / vec2(800.0, 600.0);
  vec4 blurred = blur(u_texture, uv, vec2(800.0, 600.0));
  vec4 bloomed = glow(u_texture, uv, vec2(800.0, 600.0));
  fragColor = mix(blurred, bloomed, 0.5);
}
`;

// Compile and output result
const compilable = new Compilable(testShader);
const compiled = compilable.compile();

console.log("=== COMPILED SHADER ===\n");
console.log(compiled);
console.log("\n=== END ===");
