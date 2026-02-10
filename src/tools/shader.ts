import { defaultUniforms } from "../defaults";
import { ShaderUniform } from "../types";
import Compilable from "./compilable";

export default class Shader extends Compilable {
  constructor(source: string) {
    const uniforms: ShaderUniform[] = [];

    defaultUniforms.forEach((type, name) => {
      uniforms.push({ name, type, line: 0 });
    });

    super(source, {
      uniforms: uniforms,
    });
  }
}
