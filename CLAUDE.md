# CLAUDE.md — Repo de estudio: inglés

## Contexto
Repositorio personal para aprender inglés desde cero hasta nivel de entrevista para practicante de analista de datos.
El plan completo está en `docs/curricula_ingles.md`. Siempre léelo antes de generar una sesión.
El sitio vive en `src/` y se publica con **GitHub Pages** desde la rama `gh-pages`, que se genera con `pnpm run deploy`. Todo debe funcionar como sitio estático.
Herramientas del repo (pnpm): `pnpm dev` (servidor local en http://localhost:1234), `pnpm lint` (oxlint), `pnpm format` (oxfmt), `pnpm run deploy` (gh-pages).

## Estructura
```
src/                        # lo único que se publica
├── index.html              # lista de sesiones con enlaces (se actualiza en cada sesión)
├── assets/estilos.css      # estilos compartidos
├── assets/leccion.js       # lógica compartida: audio, ejercicios, progreso
├── sesiones/SNN.html       # una página por sesión (S01.html, S02.html, R1.html...)
└── tarjetas/
    ├── index.html          # app de tarjetas (una sola para todo el curso)
    └── deck.json           # mazo de tarjetas; crece con cada sesión
docs/curricula_ingles.md    # no se publica
CLAUDE.md, README.md, package.json
```

## Tarea típica
"Genera la sesión N" → crear `src/sesiones/SNN.html` según la sección **2. Formato de cada sesión** y la fila de la sesión N en la sección **4. Sesiones** de la currícula. Después:
- agregar las palabras nuevas de la sesión a `src/tarjetas/deck.json`,
- agregar el enlace de la sesión en `src/index.html`.

## Reglas de contenido
1. Explicaciones en español; contenido y ejemplos en inglés de EE. UU., correcto y natural.
2. Nivel acorde a la fase: nada de gramática que aún no se ha visto.
3. Ejemplos del mundo del alumno: estudios, trabajo, análisis de datos, Excel, Power BI, Lima.
4. Solo lo que indica la currícula para esa sesión. Si algo es ambiguo, elige lo más útil para una entrevista de practicante de data.
5. No incluir material de ningún curso de terceros.

## Reglas técnicas
1. **Audio:** Web Speech API (`speechSynthesis`) con voz `en-US`; botón de velocidad normal y botón lento (rate ≈ 0.7). Si no hay voz disponible, mostrar un aviso claro.
2. **Ejercicios autocorregibles:** completar, elegir la opción, ordenar palabras y traducción corta. Muestran ✅/❌ y una explicación breve en español. Aceptan variantes correctas razonables (mayúsculas, contracciones, espacios).
3. **Progreso:** en `localStorage` con clave `ingles:SNN`, todo envuelto en try/catch. La página funciona igual si el almacenamiento falla.
4. **Producción abierta:** un `textarea` y un botón "Copiar para corregir" que copia el texto con el encabezado `Corrige mi producción de inglés, sesión N:`.
5. **Diseño:** mobile-first, tema claro y oscuro (`prefers-color-scheme`), legible y sin dependencias externas (Google Fonts permitido con fuente de respaldo).
6. **Mazo (`deck.json`):** cada tarjeta tiene `id` (`sNN-001`), `en`, `es`, `ejemplo` y `sesion`. Nunca cambies ni borres un `id` existente: el progreso depende de él.

## App de tarjetas (`src/tarjetas/index.html`)
- Carga `deck.json` y muestra las tarjetas pendientes del día: primero el inglés con audio, luego el reverso con el español y el ejemplo.
- Botones "No me la sé", "Difícil" y "Fácil". Repetición espaciada simple: si falla vuelve mañana; si acierta, los intervalos crecen (1 → 3 → 7 → 14 → 30 días); "Difícil" repite el intervalo actual.
- Muestra: pendientes de hoy, aprendidas, total y racha de días.
- Progreso en `localStorage` con clave `ingles:tarjetas`.
- Botones **Exportar progreso** e **Importar progreso** (archivo JSON), para pasar el progreso entre PC y celular y tener un respaldo.

## Validación antes de hacer commit
1. `pnpm lint` sin errores y `pnpm format` aplicado.
2. `deck.json` es JSON válido y sin `id` repetidos.
3. Cada ejercicio tiene al menos una respuesta correcta definida, y el texto en inglés no tiene errores.
4. Si hay un navegador headless disponible, abre la página con `pnpm dev` y confirma que no hay errores en consola.
5. Todos los enlaces son relativos y funcionan dentro de GitHub Pages (el sitio vive en un subdirectorio `/NOMBRE_DEL_REPO/`).

## Al terminar
- Commit con mensaje `Inglés sesión N: tema` y push a `main`.
- Si tienes permisos para publicar, ejecuta `pnpm run deploy`; si no, recuérdale al usuario ejecutarlo.
- Responde con un resumen de 3 líneas y la URL de GitHub Pages de la sesión.
