# Princip psaní shaderů

Moduly jsou GLSL soubory obsahující funkce, které jsou registrované do Sandboxu pod určitým jménem. Informace o implemtaci registrace modulů je v [MODULES.md](./MODULES.md).

Jsou zde z jednoho jediného důvodu, a to pro zjednodušení psaní GLSL shaderů.

GLSL shadery často použivají složitou a abstraktní matematiku a algoritmy, které jsou pro běžného uživatele těžko pochopitelné.
Cílem je tuto abstrakci co nejvíce odstranit a spíše poskytnout uživatelům jednoduché a intuitivní funkce, které mohou snadno skládat na sebe a vytvořit celkový obraz.

Importované funkce přes `#import` by měly fungovat jako After Effects efekty, které se aplikují na vrstvy. S tím, že shader je vrstva.

Funkce by tedy měly fungovat jako modifikátory. Já moc GLSL neumím, takže je pro mě težké to vymyslet.
Ale všiml jsem si, že často pracujeme s dvěma věcmi, a to s barvami a s UV souřadnicemi. Takže mě napadlo mít funkce rozdělené na `@uv-modifier` a `@color-modifier`, které by měnily UV souřadnice nebo barvy.

## Jak je psát?

Každá funkce musí mít absolutně výhradně jen jeden učel. Nesmí dělat více věcí.
Funkce musí mít hezký název, který jasně říká, co dělá. Přesně jako After Effects efekty, které mají názvy jako "Gaussian Blur" nebo "Color Balance". Takže třeba `twist` nebo `pixelate` nebo `posterize`.

Máme teď 4 moduly definované:
- `sandbox` - základní modul. Měl by obsahovat základní kameny a funkce pro další moduly. Základ matematiky.
- `sandbox/colors` - modul obsahující funkce pro generovaní barev. Vytvoření barev, gradientů, palet. Zkrátka to na co potom budeme aplikovat efekty.
- `sandbox/effects` - modul obsahující funkce mutující UV souřadnice. Každá funkce vrací `vec2`.
- `sandbox/filters` - modul obsahující funkce mutující barvy. Každá funkce vrací `vec3`.

> Bonus: Bylo by dobré, aby funkce byly flexibilní a fungovaly třeba i na textures, ne jen na UV nebo barvy ale cokoli co zrovna používám.

Otázka nastavení fungování funkcí je hodně důležité. Funkce v `sandbox` nebo `sandbox/colors` normálně získávají chování podle parametrů funkcí.

U `sandbox/effects` a `sandbox/filters` je to trochu jiné. Tyto funkce používají `uniforms` pro nastavení chování. Důležité je, aby každá funkce v modulu používala stejný uniform pro nastavení. Takže předem definovat jaké máme uniforms (třeba nám stačí `intensity` nebo `intensity` a `scale`) a toto budeme používat ve všech funkcích toho modulu.
Nemusíme vždy použít všechny, ale nemůžeme použít jiné. Zároveň bychom měli dodržovat namespace uniforms stejný pro `sandbox/effects` i `sandbox/filters`. Prozatím nám bude stačit podle mě `intensity` uniform.

Pokud to jde v GLSL tak bych chtěl, aby každý funkce v `sandbox/effects` a `sandbox/filters` měla volitelné parametry, které nastavují chování a uniforms budou použity pouze pokud nebudou parametry přítomné. Takže třeba `pixelate(uv, float intensity)` pokud `intensity` není přítomné, použije se `u_intensity` uniform.

### Importování a sdílené atributy
Moduly lze psát v Sandbox sdílené syntaxi a dokonce je to žádoucí. Lze tedy používat `#import` statementy i uvnitř modulů pro importování funkcí.
Je dokonce žádoucí aby jednotlivé moduly importovaly funkce z `sandbox` modulu, protože ten má definovat základní matematické operace.

## Jak je používat?

Používání by mělo být jednoduché a intuitivní, aby uživatel nemusel vůbec používat matematiku.

Asi nějak takto:

```glsl

#import hex from "sandbox/colors"
#import contrast from "sandbox/filters"
#import posterize from "sandbox/filters"
#import centerize from "sandbox/effects"
#import twist from "sandbox/effects"
#import pixelate from "sandbox/effects"

void main() {
    vec2 uv = v_texcoord * u_resolution;

    vec3 color = mix(hex(0xff0000), hex(0x0000ff), uv.x / u_resolution.x);
    // aplikujeme filtry na barvu - všechny by šly nastavovat i pomocí uniform, ale to my hard-codujeme
    color = contrast(color, 0.5);
    color = posterize(color, 5);

    // aplikujeme efekty na UV - všechny by šly nastavovat i pomocí uniform, ale to my hard-codujeme
    uv = centerize(uv);
    uv = twist(uv, 0.5);
    uv = pixelate(uv, 10.0);
    
    gl_FragColor = vec4(color, 1.0);
}
```

Je vidět, že používání je opravdu jednoduché a intuitivní. A i složité efekty lze vytvořit skládáním jednoduchých funkcí. A navíc, pokud chceme, můžeme tyto funkce nastavovat pomocí uniforms, tím že nebudeme předávat parametry a místo toho se použijí uniformy. Takže třeba `color = contrast(color)` a pak nastavovat na sandbox instanci:

```ts
sandbox.module("contrast", { intensity: 0.5 });
```

Každý module může mít definované své defaults pro uniforms.

```
Sandbox.defineModule("sandbox/filters", source, {
    default: {
        uniform: "u_intensity", default: 1.0,
    },
    contrast: {
        uniform: "u_intensity", default: 0.5,
    }
});
```
Každá funkce v modulu dostane výchozí hodnotu pro `u_intensity` s hodnotou `1.0`, ale funkce `contrast` ji přepíše na `0.5`. Takže pokud použijeme `contrast(color)` bez parametru, použije se `u_intensity` uniform s hodnotou `0.5`. Pokud použijeme `contrast(color, 0.8)`, použije se hodnota `0.8` a uniform se ignoruje.