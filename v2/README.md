# Gradiente v2

Rediseño completo del sitio. HTML/CSS/JS sin build, pensado primero para celular e instalable como app (PWA).

## Secciones

- `#/` Inicio: saludo, accesos rápidos (tarjetas de color), tu carrera desplegable (cursando ahora + acordeones «Podés cursar» / «Finales»), chat de preguntas frecuentes y «Quiénes somos».
- `#/plan` Mi plan: los 13 planes de Ingeniería UNLP con correlativas, vista **Lista** y **Árbol**.
- `#/recursos` Links de `links.json` con buscador y categorías.
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

## planes.json

Cada carrera tiene `courses` (plan troncal), `opt` (optativas) y `hum` (humanísticas). Por materia:

- `c` código · `n` nombre · `s` semestre (0 = nivelación, -1 = idioma)
- `r` correlativas (códigos) · `x` condición en texto · `min` materias aprobadas mínimas · `sem` tener aprobado hasta ese semestre
- `k`: `afc`, `lang` (inglés), `slot` (optativa/electiva a elección, con `pool`)
- `a`: 1 si es anual

Fuente: planes oficiales en www1.ing.unlp.edu.ar (septiembre 2026). Computación usa el plan 2024; el resto, 2018.

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
