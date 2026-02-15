# Správná flow používání modulů

Moduly mají fungovat jako After Effects efekty.

Shader je moje layer a já na něj aplikuji efekty, které mají své vlastní parametry a mohou být znovu použity.

Například chci vytvořit zatočený gradient efekt s pixelation efektem.

1. Vytvořím si barvy

```glsl
#import hex from "sandbox/colors"

vec3 color1 = hex(xFF0000);
vec3 color2 = hex(x0000FF);
vec3 color3 = hex(x00FF00);
```

2. Barvy si vložím do pomocné funkce pallete ať si je srovnám. A vytvořím gradient efekt, který bude mít jako parametry barvy a uv souřadnice.

```glsl
#import gradient from "sandbox/colors"
#import palette from "sandbox/colors"

vec3 gradientColor = gradient(pallete(color1, color2, color3), uv);
```

3. Aplikuji warp efekt, výchozí warp efekt je v modulu "sandbox", ale v "sandbox/effects" je tento efekt rozšířený o další možnosti, takže si tam vyberu ten, který je spirálovitý. Intenzitu warpu si nastavuje uživatel pomocí uniforms.

```glsl
#import spiralWarp from "sandbox/effects"

vec2 warpedUV = spiralWarp(uv);
```

4. A teď bych chtěl přidat pixelation efekt.

```glsl
#import pixelate from "sandbox/effects"

vec2 pixelatedUV = pixelate(warpedUV);
```

5. Ještě bych třeba chtěl reduce barev na 8, aby to mělo ten pixelartový efekt.

```glsl
#import posterize from "sandbox/effects"

vec2 posterizedUV = posterize(pixelatedUV);
```

6. A nakonec si můžu doladit barvy pomocí filtrů, třeba přidat kontrast nebo něco podobného.

```glsl
#import contrast from "sandbox/filters"
#import brightness from "sandbox/filters"

vec3 finalColor = contrast(brightness(gradientColor));
```

Celkem mám pár řádků kodu a je to plug and play uplně. A takto by měly fungovat všechny efekty a funkce.
