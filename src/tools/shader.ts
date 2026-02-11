import Compilable from "./compilable";
import { defaultUniforms } from "../defaults";

export default class Shader extends Compilable {
  constructor(source: string) {
    // Add default uniforms to requirements
    defaultUniforms.forEach((type, name) => {
      this.requirements.uniforms.set(name, { name, type, line: 0 });
    });

    super(source);
  }
}
