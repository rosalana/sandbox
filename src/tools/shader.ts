import Compilable from "./compilable";
import { uniforms as UNIFORMS } from "../globals";

export default class Shader extends Compilable {
  constructor(source: string) {
    super(source);

    // Add default uniforms to requirements
    UNIFORMS.forEach((type, name) => {
      this.requirements.uniforms.set(name, { name, type, line: 0 });
    });
  }
}
