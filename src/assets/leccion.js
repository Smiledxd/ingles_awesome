// Lógica compartida de las sesiones: audio, ejercicios autocorregibles,
// producción abierta, checklist y progreso en localStorage.
// La página debe funcionar igual aunque el almacenamiento o la voz fallen.

(() => {
  // ---------- Almacenamiento seguro ----------

  function leer(clave, porDefecto) {
    try {
      const crudo = localStorage.getItem(clave);
      return crudo ? JSON.parse(crudo) : porDefecto;
    } catch {
      return porDefecto;
    }
  }

  function guardar(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  }

  // ---------- Audio (Web Speech API) ----------

  const VOCES_PREFERIDAS = [
    "Google US English",
    "Samantha",
    "Microsoft Aria",
    "Microsoft Jenny",
    "Microsoft Guy",
    "Alex",
  ];

  let vozElegida = null;
  let avisoMostrado = false;

  function elegirVoz() {
    if (!("speechSynthesis" in window)) return null;
    const voces = speechSynthesis.getVoices();
    const us = voces.filter((v) => v.lang.replace("_", "-").toLowerCase() === "en-us");
    for (const nombre of VOCES_PREFERIDAS) {
      const v = us.find((voz) => voz.name.includes(nombre));
      if (v) return v;
    }
    return us[0] || voces.find((v) => v.lang.toLowerCase().startsWith("en")) || null;
  }

  function mostrarAvisoAudio(mensaje) {
    if (avisoMostrado) return;
    avisoMostrado = true;
    const aviso = document.createElement("p");
    aviso.className = "aviso-audio";
    aviso.setAttribute("role", "status");
    aviso.textContent = mensaje;
    const destino = document.querySelector("[data-aviso-audio]") || document.querySelector("main");
    if (destino) destino.prepend(aviso);
  }

  function revisarVoces() {
    if (!("speechSynthesis" in window)) {
      mostrarAvisoAudio(
        "🔇 Tu navegador no permite reproducir audio con voz. Prueba con Chrome, Edge o Safari actualizados.",
      );
      return;
    }
    vozElegida = elegirVoz();
    const voces = speechSynthesis.getVoices();
    if (voces.length && !vozElegida) {
      mostrarAvisoAudio(
        "🔇 No encontré una voz en inglés en este dispositivo. Instala una voz «English (United States)» en la configuración de texto a voz de tu sistema y recarga la página.",
      );
    } else if (vozElegida && !vozElegida.lang.toLowerCase().replace("_", "-").startsWith("en-us")) {
      mostrarAvisoAudio(
        `ℹ️ No hay voz de inglés de EE. UU.; se usará «${vozElegida.name}» (${vozElegida.lang}).`,
      );
    }
  }

  let vocesIniciadas = false;

  function iniciarVoces() {
    if (vocesIniciadas) return;
    vocesIniciadas = true;
    if (!("speechSynthesis" in window)) {
      revisarVoces();
      return;
    }
    vozElegida = elegirVoz();
    speechSynthesis.addEventListener("voiceschanged", () => {
      vozElegida = elegirVoz();
    });
    // Algunos navegadores cargan las voces tarde: revisamos después de un momento.
    setTimeout(() => {
      if (!speechSynthesis.getVoices().length) {
        mostrarAvisoAudio(
          "⚠️ Tu navegador aún no carga voces. Si no escuchas nada al pulsar ▶, instala una voz en inglés (EE. UU.) o prueba con otro navegador.",
        );
      } else {
        revisarVoces();
      }
    }, 2000);
  }

  function hablar(texto, velocidad = 1, boton = null) {
    if (!("speechSynthesis" in window)) {
      revisarVoces();
      return;
    }
    speechSynthesis.cancel();
    const frase = new SpeechSynthesisUtterance(texto);
    frase.lang = "en-US";
    if (!vozElegida) vozElegida = elegirVoz();
    if (vozElegida) frase.voice = vozElegida;
    frase.rate = velocidad;
    if (boton) {
      document.querySelectorAll(".sonando").forEach((b) => b.classList.remove("sonando"));
      boton.classList.add("sonando");
      const quitar = () => boton.classList.remove("sonando");
      frase.addEventListener("end", quitar);
      frase.addEventListener("error", quitar);
    }
    speechSynthesis.speak(frase);
  }

  const LENTO = 0.7;

  // Convierte <span class="audio" data-say="..."> en dos botones: normal y lento.
  function prepararAudio(raiz = document) {
    raiz.querySelectorAll(".audio[data-say]").forEach((el) => {
      if (el.dataset.listo) return;
      el.dataset.listo = "1";
      const texto = el.dataset.say;
      const normal = document.createElement("button");
      normal.type = "button";
      normal.textContent = "▶";
      normal.title = "Escuchar";
      normal.setAttribute("aria-label", `Escuchar: ${texto}`);
      normal.addEventListener("click", () => hablar(texto, 1, normal));
      const lento = document.createElement("button");
      lento.type = "button";
      lento.textContent = "🐢";
      lento.title = "Escuchar lento";
      lento.setAttribute("aria-label", `Escuchar lento: ${texto}`);
      lento.addEventListener("click", () => hablar(texto, LENTO, lento));
      el.append(normal, lento);
    });
    // Botones sueltos que hablan al pulsarlos (por ejemplo, las letras del alfabeto).
    raiz.querySelectorAll("button[data-say]").forEach((b) => {
      if (b.dataset.listo) return;
      b.dataset.listo = "1";
      b.addEventListener("click", () => hablar(b.dataset.say, Number(b.dataset.rate) || 1, b));
    });
  }

  // ---------- Comparación tolerante de respuestas ----------

  const CONTRACCIONES = [
    [/\bi'm\b/g, "i am"],
    [/\byou're\b/g, "you are"],
    [/\bwe're\b/g, "we are"],
    [/\bthey're\b/g, "they are"],
    [/\b(he|she|it|that|what|where|how|who|there)'s\b/g, "$1 is"],
    [/\bcan't\b/g, "can not"],
    [/\bcannot\b/g, "can not"],
    [/\bwon't\b/g, "will not"],
    [/\b(\w+)n't\b/g, "$1 not"],
    [/\b(\w+)'ll\b/g, "$1 will"],
    [/\b(\w+)'ve\b/g, "$1 have"],
    [/\b(\w+)'d\b/g, "$1 would"],
    [/\blet's\b/g, "let us"],
  ];

  function normalizar(texto) {
    let t = String(texto)
      .toLowerCase()
      .normalize("NFC")
      .replace(/[‘’´`]/g, "'")
      .replace(/[.,!?¡¿;:"“”()]/g, " ");
    for (const [patron, reemplazo] of CONTRACCIONES) t = t.replace(patron, reemplazo);
    return t.replace(/\s+/g, " ").trim();
  }

  function esCorrecta(valor, respuestas) {
    const v = normalizar(valor);
    return v !== "" && respuestas.some((r) => normalizar(r) === v);
  }

  // ---------- Página de sesión ----------

  function iniciarSesion() {
    const sesion = document.body.dataset.sesion;
    if (!sesion) return;
    const numero = document.body.dataset.numero || sesion;
    const clave = `ingles:${sesion}`;
    const estado = leer(clave, {});
    estado.ej ??= {};
    estado.check ??= {};
    estado.prod ??= {};

    const ejercicios = [...document.querySelectorAll(".ej[data-id]")];

    function actualizarMarcador() {
      const total = ejercicios.length;
      const respondidos = ejercicios.filter((e) => estado.ej[e.dataset.id]).length;
      const aciertos = ejercicios.filter((e) => estado.ej[e.dataset.id]?.ok).length;
      estado.resumen = { total, respondidos, aciertos };
      document.querySelectorAll("[data-marcador]").forEach((m) => {
        m.textContent = `Aciertos: ${aciertos} de ${total} · respondidos: ${respondidos}`;
      });
    }

    function persistir() {
      actualizarMarcador();
      guardar(clave, estado);
    }

    function mostrarResultado(ej, ok, correcta) {
      ej.classList.toggle("ok", ok);
      ej.classList.toggle("mal", !ok);
      const caja = ej.querySelector(".resultado");
      const explica = ej.dataset.explica || "";
      caja.className = `resultado ${ok ? "ok" : "mal"}`;
      caja.textContent = ok
        ? `✅ ¡Correcto! ${explica}`
        : `❌ Respuesta correcta: «${correcta}». ${explica}`;
    }

    function limpiarResultado(ej) {
      ej.classList.remove("ok", "mal");
      const caja = ej.querySelector(".resultado");
      caja.className = "resultado";
      caja.textContent = "";
    }

    for (const ej of ejercicios) {
      const id = ej.dataset.id;
      const tipo = ej.dataset.tipo;
      const respuestas = (ej.dataset.respuestas || "").split("|").filter(Boolean);
      if (!respuestas.length) console.warn(`Ejercicio ${id} sin respuesta definida`);
      if (!ej.querySelector(".resultado")) {
        const caja = document.createElement("div");
        caja.className = "resultado";
        caja.setAttribute("aria-live", "polite");
        ej.append(caja);
      }
      const previo = estado.ej[id];

      if (tipo === "elegir") {
        const botones = [...ej.querySelectorAll(".opciones button")];
        const marcar = (boton, registrar) => {
          const ok = esCorrecta(boton.textContent, respuestas);
          botones.forEach((b) => b.classList.remove("elegida", "correcta", "incorrecta"));
          boton.classList.add("elegida", ok ? "correcta" : "incorrecta");
          mostrarResultado(ej, ok, respuestas[0]);
          if (registrar) {
            estado.ej[id] = { r: boton.textContent.trim(), ok };
            persistir();
          }
        };
        botones.forEach((b) => {
          b.type = "button";
          b.classList.add("btn");
          b.addEventListener("click", () => marcar(b, true));
        });
        if (previo) {
          const b = botones.find((x) => x.textContent.trim() === previo.r);
          if (b) marcar(b, false);
        }
      } else if (tipo === "completar" || tipo === "traducir") {
        const input = ej.querySelector("input");
        input.type = "text";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.setAttribute("autocapitalize", "off");
        const acciones = document.createElement("div");
        acciones.className = "acciones";
        const comprobar = document.createElement("button");
        comprobar.type = "button";
        comprobar.className = "btn btn-principal";
        comprobar.textContent = "Comprobar";
        acciones.append(comprobar);
        ej.querySelector(".resultado").before(acciones);
        const revisar = () => {
          if (!input.value.trim()) return;
          const ok = esCorrecta(input.value, respuestas);
          mostrarResultado(ej, ok, respuestas[0]);
          estado.ej[id] = { r: input.value, ok };
          persistir();
        };
        comprobar.addEventListener("click", revisar);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") revisar();
        });
        if (previo) {
          input.value = previo.r;
          mostrarResultado(ej, previo.ok, respuestas[0]);
        }
      } else if (tipo === "ordenar") {
        const palabras = (ej.dataset.fichas || "").split("|");
        const zonaRespuesta = document.createElement("div");
        zonaRespuesta.className = "respuesta-orden";
        zonaRespuesta.setAttribute("aria-label", "Tu frase");
        const zonaFichas = document.createElement("div");
        zonaFichas.className = "fichas";
        zonaFichas.setAttribute("aria-label", "Palabras disponibles");
        const acciones = document.createElement("div");
        acciones.className = "acciones";
        const comprobar = document.createElement("button");
        comprobar.type = "button";
        comprobar.className = "btn btn-principal";
        comprobar.textContent = "Comprobar";
        const borrar = document.createElement("button");
        borrar.type = "button";
        borrar.className = "btn";
        borrar.textContent = "Empezar de nuevo";
        acciones.append(comprobar, borrar);
        ej.querySelector(".resultado").before(zonaRespuesta, zonaFichas, acciones);

        const ficha = (texto) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "ficha";
          b.textContent = texto;
          b.addEventListener("click", () => {
            const destino = b.parentElement === zonaFichas ? zonaRespuesta : zonaFichas;
            destino.append(b);
            limpiarResultado(ej);
          });
          return b;
        };
        const mezclar = () => {
          const copia = [...palabras];
          for (let n = 0; n < 10; n++) {
            for (let i = copia.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [copia[i], copia[j]] = [copia[j], copia[i]];
            }
            if (!esCorrecta(copia.join(" "), respuestas)) break;
          }
          return copia;
        };
        const armar = (enRespuesta = []) => {
          zonaRespuesta.replaceChildren(...enRespuesta.map(ficha));
          const restantes = [...palabras];
          for (const p of enRespuesta) restantes.splice(restantes.indexOf(p), 1);
          const orden = mezclar().filter((p) => {
            const i = restantes.indexOf(p);
            if (i === -1) return false;
            restantes.splice(i, 1);
            return true;
          });
          zonaFichas.replaceChildren(...orden.map(ficha));
        };
        comprobar.addEventListener("click", () => {
          const elegidas = [...zonaRespuesta.children].map((b) => b.textContent);
          if (!elegidas.length) return;
          const ok = esCorrecta(elegidas.join(" "), respuestas);
          mostrarResultado(ej, ok, respuestas[0]);
          estado.ej[id] = { r: elegidas, ok };
          persistir();
        });
        borrar.addEventListener("click", () => {
          armar();
          limpiarResultado(ej);
        });
        if (previo && Array.isArray(previo.r)) {
          armar(previo.r.filter((p) => palabras.includes(p)));
          mostrarResultado(ej, previo.ok, respuestas[0]);
        } else {
          armar();
        }
      }
    }

    document.querySelectorAll("[data-reiniciar]").forEach((b) =>
      b.addEventListener("click", () => {
        if (!confirm("¿Borrar tus respuestas de los ejercicios de esta sesión?")) return;
        estado.ej = {};
        persistir();
        location.reload();
      }),
    );

    // Producción abierta
    document.querySelectorAll("textarea[data-prod]").forEach((area) => {
      const id = area.dataset.prod;
      if (estado.prod[id]) area.value = estado.prod[id];
      let temporizador;
      area.addEventListener("input", () => {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => {
          estado.prod[id] = area.value;
          persistir();
        }, 400);
      });
    });

    document.querySelectorAll("[data-copiar]").forEach((boton) => {
      boton.addEventListener("click", async () => {
        const area = document.querySelector(`textarea[data-prod="${boton.dataset.copiar}"]`);
        const salida = document.querySelector(`[data-copiado="${boton.dataset.copiar}"]`);
        const texto = area.value.trim();
        if (!texto) {
          if (salida) salida.textContent = "Escribe algo primero ✍️";
          return;
        }
        const completo = `Corrige mi producción de inglés, sesión ${numero}:\n\n${texto}`;
        const ok = await copiar(completo);
        if (salida) {
          salida.textContent = ok
            ? "✅ Copiado. Pégalo en el chat para que te lo corrijan."
            : "No se pudo copiar automáticamente: selecciona el texto y cópialo a mano.";
        }
      });
    });

    // Checklist de cierre
    document.querySelectorAll("input[data-check]").forEach((caja) => {
      const id = caja.dataset.check;
      caja.checked = Boolean(estado.check[id]);
      caja.addEventListener("change", () => {
        estado.check[id] = caja.checked;
        persistir();
      });
    });

    actualizarMarcador();
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = texto;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.append(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  // ---------- Índice: avance de cada sesión ----------

  function mostrarAvances() {
    document.querySelectorAll("[data-avance]").forEach((el) => {
      const r = leer(`ingles:${el.dataset.avance}`, null)?.resumen;
      if (!r || !r.respondidos) return;
      el.textContent =
        r.respondidos === r.total
          ? `✓ ${r.aciertos}/${r.total}`
          : `${r.respondidos}/${r.total} hechos`;
    });
  }

  // ---------- Arranque ----------

  window.Leccion = { leer, guardar, hablar, prepararAudio, iniciarVoces, LENTO };

  prepararAudio();
  if (document.querySelector(".audio, button[data-say]")) iniciarVoces();
  iniciarSesion();
  mostrarAvances();
})();
