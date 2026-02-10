export const blur = Sandbox.defineModule({
  name: "blur",
  source: ``,
  options: {
    radius: { uniform: "u_blur_radius", type: "float", default: 5.0 },
  },
});
