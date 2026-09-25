# Gradiente v2

Rediseño completo del sitio. HTML/CSS/JS sin build, pensado primero para celular e instalable como app (PWA).

## Secciones

- `#/` Inicio: saludo, accesos rápidos (tarjetas de color), tu carrera desplegable (cursando ahora + acordeones «Podés cursar» / «Finales»), chat de preguntas frecuentes y «Quiénes somos».
- `#/plan` Mi plan: los 13 planes de Ingeniería UNLP con correlativas, vista **Lista** y **Árbol**.
- `#/recursos` Nube (con buscador de materia), links de `links.json` en bloques de color por categoría, buscador y barra de categorías que queda fija.
- **Consultas** (botón rojo arriba, o `#/consultas`): asistente «¿En qué te ayudamos?». Primero la nube; después temas (materia, trámites, becas, cuentas, Gradiente). En «materia» buscás la materia y te da el mail y la página de la cátedra.
- `#/mesita` Productos y promos de `kiosco.json`.

## Qué editar

| Qué | Dónde |
|---|---|
| Links, avisos (categoría `Avisos`) | `/links.json` (el mismo de la raíz) |
| Mesita | `/kiosco.json` (el mismo de la raíz) |
| Form de consultas, Drive, redes, accesos rápidos | `v2/config.js` |
| Planes de estudio | `v2/data/planes.json` |
| Preguntas frecuentes del chat (respuestas, palabras clave, links) | `v2/data/faq.json` |
| Quiénes somos / historia / accesos rápidos (ícono y color) | `v2/config.js` → `about`, `quickLinks` |
| Qué materias tienen material en la nube | `v2/data/nube.json` |
| Categorías de Recursos (color, ícono, bajada) y temas de Consultas | `v2/config.js` (`categories`, `help`) |
| Nombre lindo y bajada de cada link | `label` y `desc` en `/links.json` (opcionales) |
| Mails y páginas de cátedras | `v2/data/catedras.json` → se regenera con `node v2/tools/actualizar-catedras.mjs` |
| Carpeta de Drive de cada materia (link directo del buscador de la Nube) | `d` en `v2/data/nube.json` → `node v2/tools/actualizar-nube-links.mjs` |
| Calendario del inicio | `v2/data/fechas.json` → `oficial` se baja con `node v2/tools/actualizar-fechas.mjs`; `extra` es a mano (ver abajo) |

## planes.json

Cada carrera tiene `courses` (plan troncal), `opt` (optativas) y `hum` (humanísticas). Por materia:

- `c` código · `n` nombre · `s` semestre (0 = nivelación, -1 = idioma)
- `r` correlativas (códigos) · `x` condición en texto · `min` materias aprobadas mínimas · `sem` tener aprobado hasta ese semestre
- `k`: `afc`, `lang` (inglés), `slot` (optativa/electiva a elección, con `pool`)
- `a`: 1 si es anual

Fuente: planes oficiales en www1.ing.unlp.edu.ar (septiembre 2026). Computación usa el plan 2024; el resto, 2018.

## catedras.json

Sale de la página pública de Cátedras de la Facultad (www1.ing.unlp.edu.ar/catedras). Por código de materia: `p` = id de la página de la cátedra, `m` = mail que la cátedra publica como «Contacto». Solo se toma ese mail, no los de cada docente. Conviene correr el script cada cuatrimestre.

## Reglas que aplica

- Para **cursar**: correlativas regulares o aprobadas (Inglés tiene que estar aprobado).
- Para **rendir final / promocionar**: correlativas aprobadas.
- También chequea "tener N materias aprobadas" y "7° semestre aprobado".

El progreso se guarda en `localStorage` del dispositivo; se puede pasar a otro con un link (menú ⋯ del plan).

## Pasar a la raíz

Cuando esté aprobado, mover el contenido de `v2/` a la raíz (reemplazando `index.html` y `assets/`). Las rutas de datos ya son absolutas (`/links.json`, `/kiosco.json`) así que siguen funcionando.

## Modo desarrollo

En `localhost` (o agregando `?dev` a la URL) aparece un botón amarillo **DEV** abajo a la izquierda:

- **Ver como primera vez**: borra carrera, progreso y tema.
- **Modo prueba**: nada de lo que toques se guarda; al recargar vuelve a lo guardado.
- **Cargar progreso de ejemplo** y **Borrar progreso**.

En el sitio publicado no aparece (salvo con `?dev`).

## fechas.json

`oficial` sale del [calendario académico de la Facultad](https://ing.unlp.edu.ar/institucional/calendario-ano-lectivo-completo/) (correr el script cuando lo actualicen). `extra` es lo que carga Gradiente a mano y el script no lo toca. Ejemplo:

```json
"extra": [
  { "d": "2026-10-01", "t": "Paro docente", "k": "paro", "n": "Sin clases en toda la Facultad" },
  { "d": "2026-10-05", "h": "2026-10-09", "t": "Semana de la Ingeniería", "k": "evento", "url": "https://..." }
]
```

`d` = desde, `h` = hasta (opcional), `k` = tipo: `paro`, `feriado`, `aviso`, `parciales`, `finales`, `inscripcion`, `clases`, `evento` (Gradiente) o `info`. `n` (nota) y `url` son opcionales.
