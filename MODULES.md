# Sandbox Module System — Technical Specification

## Overview

Sandbox shader preprocessor rozšiřuje GLSL o dvě hlavní funkce:

1. **Auto-import default uniforms** — automatické vkládání uniforms, které Sandbox počítá interně (`u_time`, `u_mouse`, atd.)
2. **Module imports** — systém pro znovupoužívání GLSL kódu přes registrované moduly s per-import konfigurací

---

## 1. Auto-import Default Uniforms

### Chování

Preprocessor automaticky vkládá všechny default uniforms na začátek shaderu, pokud v kódu chybí jejich deklarace. Vkládají se **vždy, i když nejsou v kódu používané** — GLSL kompilátor nepoužívané uniforms optimalizuje pryč, takže nedochází k žádnému runtime overhead.

### Příklad default uniforms

```glsl
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
// ... další dle aktuální verze Sandboxu
```

Seznam default uniforms se může v budoucích verzích rozšiřovat.

---

## 2. Module System

### 2.1 Definice modulu

Modul se definuje pomocí funkce `defineModule`. Source modulu je validní GLSL kód (nebo Sandbox-compilovatelný kód obsahující vlastní `#import` direktivy).

```ts
import { defineModule } from "@aspect/sandbox";

Sandbox.defineModule(
  "effects",
  `
    uniform float u_intensity;
    uniform float u_radius;
    uniform float u_threshold;

    vec4 blur(sampler2D tex, vec2 uv, vec2 resolution) {
      // implementace používající u_intensity, u_radius
    }

    vec4 bloom(sampler2D tex, vec2 uv, vec2 resolution) {
      // implementace používající u_intensity, u_threshold
      // může interně volat helpers definované ve stejném source
    }
  `,
  {
    blur: {
      intensity: { uniform: "u_intensity", default: 1.0 },
      radius: { uniform: "u_radius", default: 5.0 },
    },
    bloom: {
      intensity: { uniform: "u_intensity", default: 0.8 },
      threshold: { uniform: "u_threshold", default: 0.5 },
    },
  },
);
```

#### Pravidla pro definici

- `name` — unikátní identifikátor modulu používaný v `#import` direktivách.
- `source` — validní GLSL kód nebo Sandbox-compilovatelný kód (může obsahovat vlastní `#import`). Obsahuje uniform deklarace a funkce.
- `options` — **per-method** konfigurace. Klíč je název funkce v source. Každá option mapuje user-friendly název na konkrétní uniform a volitelně definuje default hodnotu.
- `options` je **volitelné** — modul bez options (čisté utility funkce jako `rand`, `rotate2d`) je validní use case. Takový modul nemá konfigurovatelné chování.
- Různé metody v rámci jednoho modulu mohou odkazovat na stejný uniform v source (`u_intensity` u blur i bloom), ale díky per-import namespacingu budou v runtime nezávislé.

### 2.2 Import syntax v GLSL

```glsl
#import <functionName> from '<moduleName>'
#import <functionName> as <alias> from '<moduleName>'
```

#### Příklady

```glsl
#import blur from 'effects'
#import bloom as glow from 'effects'
#import blur as softBlur from 'effects'
#import blur as sharpBlur from 'effects'
```

#### Aliasing

Aliasing umožňuje importovat **stejnou funkci vícekrát** s odlišnou konfigurací. Každý alias je samostatný import s vlastním namespacem uniforms.

---

## 3. Preprocessing Pipeline

Pro každý `#import` v uživatelově shaderu preprocessor provede následující kroky:

### Krok 1: Lookup modulu

Najdi registrovaný modul podle jména (např. `'effects'`). Pokud neexistuje → chyba.

### Krok 2: Kompilace source modulu

Source modulu se sám může obsahovat `#import` direktivy. Preprocessor ho musí **rekurzivně zkompilovat** — resolvovat všechny jeho závislosti. Výsledkem je plně resolvnutý GLSL string celého modulu.

### Krok 3: Najdi požadovanou funkci

V zkompilovaném source najdi funkci podle jména (např. `blur`, `bloom`). Pokud neexistuje → chyba.

### Krok 4: Dependency scan uvnitř modulu (tree-shaking)

Analyzuj tělo požadované funkce a zjisti, zda volá **jiné funkce definované ve stejném source** (interní helpery, privátní utility). Rekurzivně projdi i helper funkce — helper může volat další helper. Výsledkem je kompletní strom závislostí pro danou funkci.

> **Poznámka:** Circular dependency v rámci jednoho source je logický nesmysl (GLSL to nezkompiluje), ale preprocessor by ji měl **detekovat a vyhodit srozumitelnou chybu**.

### Krok 5: Zjisti použité uniforms

Ze všech extrahovaných funkcí (hlavní funkce + interní helper dependency strom) vyčti seznam uniform proměnných, které se v nich používají.

### Krok 6: Přejmenování (namespacování)

Prefix pro přejmenování se určuje podle:

- Pokud import **nemá alias** → prefix = název funkce (např. `blur`)
- Pokud import **má alias** → prefix = alias (např. `glow`, `softBlur`)

Přejmenování se aplikuje na:

1. **Uniform deklarace** — `uniform float u_intensity` → `uniform float u_blur_intensity`
2. **Uniform reference v těle hlavní funkce** — `u_intensity` → `u_blur_intensity`
3. **Uniform reference v tělech helper funkcí** — stejně jako výše
4. **Název hlavní funkce** (pokud existuje alias) — `bloom` → `glow`
5. **Názvy interních helper funkcí** — `extractBright` → `glow_extractBright` (nutné, protože dva importy ze stejného modulu by jinak sdílely helper s konfliktními uniform referencemi)

### Krok 7: Vložení do výstupu

Do finálního GLSL výstupu se vloží:

1. Namespacované uniform deklarace (nahoře, deduplikované)
2. Přejmenované helper funkce
3. Přejmenovaná hlavní funkce

### Kompletní příklad

**Vstup (uživatelův shader):**

```glsl
#import blur from 'effects'
#import bloom as glow from 'effects'

void main() {
  vec4 blurred = blur(u_texture, v_uv, u_resolution);
  vec4 bloomed = glow(u_texture, v_uv, u_resolution);
  gl_FragColor = mix(blurred, bloomed, 0.5);
}
```

**Výstup preprocessoru:**

```glsl
// --- auto-imported default uniforms ---
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

// --- module uniforms (namespacované) ---
uniform float u_blur_intensity;
uniform float u_blur_radius;
uniform float u_glow_intensity;
uniform float u_glow_threshold;

// --- importované funkce ---
vec4 blur(sampler2D tex, vec2 uv, vec2 resolution) {
  // tělo používá u_blur_intensity, u_blur_radius
}

vec4 glow_extractBright(vec4 color) {
  // přejmenovaný helper, používá u_glow_threshold
}

vec4 glow(sampler2D tex, vec2 uv, vec2 resolution) {
  // tělo používá u_glow_intensity, volá glow_extractBright
}

// --- uživatelův kód ---
void main() {
  vec4 blurred = blur(u_texture, v_uv, u_resolution);
  vec4 bloomed = glow(u_texture, v_uv, u_resolution);
  gl_FragColor = mix(blurred, bloomed, 0.5);
}
```

---

## 4. Runtime API

### 4.1 Inicializační konfigurace

```ts
const sandbox = new Sandbox(canvas, {
  shader: myFragmentSource,
  modules: {
    blur: { intensity: 0.5, radius: 8.0 },
    glow: { intensity: 0.9, threshold: 0.5 },
  },
});
```

#### `modules`

Per-import konfigurace. **Klíč je název importu nebo alias** (ne název modulu). Tedy `blur`, `glow`, `softBlur` — ne `effects`.

#### Chování při chybějících hodnotách

- Pokud option má `default` v definici modulu a uživatel ji nezadá → použije se default.
- Pokud option **nemá** `default` a uživatel ji nezadá → **Sandbox neudělá nic** při inicializaci ale kod nebude fungovat.
- Pokud uživatel zadá option pro import, který v shaderu neexistuje → **Sandbox vyhodí warning**.

### 4.2 Dynamické změny za runtime

```ts
sandbox.module("blur", { intensity: 0.7, radius: 12.0 });
```

Interní mapování: `blur.intensity` → lookup v options `blur` → uniform `u_intensity` → namespacovaný `u_blur_dj53dj_intensity` → `gl.uniform1f(location, 0.7)`.

### 4.3 Vztah k `setUniform`

`setUniform` zůstává dostupný pro **vlastní custom uniforms**, které si uživatel definuje přímo ve svém shaderu. Modulové uniforms se nastavují **výhradně** přes `module().set()`.

Uživatel nemusí znát pojem "uniform" při práci s moduly — pracuje s konfiguračními hodnotami jako `intensity`, `radius`, `threshold`.

---

## 5. Cascading — modul importuje z jiného modulu

Source modulu může obsahovat vlastní `#import` direktivy:

```ts
export const bloom = defineModule(
  "bloom",
  `
    #import blur from 'effects'

    uniform float u_threshold;

    vec4 bloom(sampler2D tex, vec2 uv, vec2 resolution) {
      vec4 blurred = blur(tex, uv, resolution);
      // ... threshold logic
    }
  `,
  {
    bloom: {
      threshold: { uniform: "u_threshold", default: 0.8 },
    },
  },
);
```

Preprocessor resolvuje dependency graf rekurzivně (krok 2 pipeline). Bloom závisí na blur z modulu effects → preprocessor vloží oboje.

v options je možné použít `default` klíč pro nastavení všech funkcí najednou a potom jen přepisovat změny.

```js
{
  default: {
    uniform: "u_intensity", default: 1.0,
  },
  contrast: {
    uniform: "u_intensity", default: 0.5,
  }
}
```

### Konfigurace cascading dependencies

Konfigurace je **flat** — nikdy nested:

```ts
modules: {
  bloom: { threshold: 0.9 },
  blur:  { radius: 10.0, intensity: 0.5 },
}
```

I když uživatel přímo importuje jen `bloom`, `blur` je jeho dependency a konfiguruje se jako samostatný top-level klíč. Flat přístup řeší situaci, kdy dva moduly sdílí stejnou dependency — jedna konfigurace, žádná ambiguita.

---

## 7. Error Handling

| Situace                                                 | Chyba                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `#import` odkazuje na neregistrovaný modul              | `Module '<name>' is not registered. Did you forget to call Sandbox.register()?`      |
| `#import` odkazuje na neexistující funkci v modulu      | `Function '<fn>' does not exist in module '<module>'. Available: <list>`             |
| Chybí required option (bez default) v `modules` configu | `Module '<import>' requires option '<option>' but no value or default was provided.` |
| Circular dependency mezi moduly                         | `Circular dependency detected: <module A> → <module B> → <module A>`                 |
| Circular dependency uvnitř source (helper funkce)       | `Circular function call detected in module '<module>': <fnA> → <fnB> → <fnA>`        |
| Config klíč neodpovídá žádnému importu v shaderu        | `Module config key '<key>' does not match any import in the shader.`                 |

---

## 8. Shrnutí klíčových rozhodnutí

1. **Default uniforms se vkládají vždy** — bez analýzy usage, GLSL optimalizuje pryč.
2. **Konfigurace je per-import (per-funkce), ne per-modul** — každý import má vlastní namespace uniforms.
3. **Aliasing** (`as`) umožňuje importovat stejnou funkci vícekrát s různou konfigurací.
4. **Namespacování uniforms** — preprocessor přepisuje uniform názvy podle import názvu/aliasu + random string, aby nedocházelo ke kolizím.
5. **Interní helper funkce** se přejmenují spolu s hlavní funkcí (tree-shaking + namespace).
6. **Cascading dependencies** se konfigurují flat, ne nested.
7. **`options` v `defineModule` je volitelné** — moduly bez konfigurovatelného chování jsou validní.
8. **`setUniform` zůstává** pro custom uniforms; modulové uniforms se nastavují přes `module().set()`.

# TODO?

- změnit `#import` syntaxi na @import - vypadá to lépe
- přidat `mention` syntax pomocí `@` pro importování uniform value přímo do kodu pro konkrétní funkci:

příklad kodu:

```glsl

@import contrast from 'sandbox/filters';
@import hex from 'sandbox/colors';

void main() {
  vec3 color = hex(0xff0000);

  color = contrast(color, @contrast.intensity);

  gl_FragColor = vec4(color, 1.0);
}
```

zkompilovaný kod:

```glsl

uniform float u_contrast_h4iod3_intensity;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_delta;
uniform float u_frame;

vec3 hex(int hexValue) {
  // ...
}

vec3 contrast(vec3 color, float intensity) {
  // ...
}

void main() {
  vec3 color = hex(0xff0000);

  color = contrast(color, u_contrast_h4iod3_intensity);

  gl_FragColor = vec4(color, 1.0);
}
```

Realita bude taková, že kompilátor, když vidí `contrast()` volaný s jedním parametrem ale funkce je definovaná s dvěma a název se shoduje s uniform názvem tak doplní při volání do kodu tu uniform.

takže `color = contrast(color)` → `color = contrast(color, u_contrast_h4iod3_intensity)`

pouze pokud je contrast pojmenovaný takto:

```glsl
vec3 contrast(vec3 color, float intensity) {
  // ...
}
```

Parametr 2 matchuje type i název uniform `u_intensity`
