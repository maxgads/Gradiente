/* Configuración editable de Gradiente v2.
   Los links y la mesita se leen de los mismos JSON que usa el sitio actual. */
window.GRADIENTE = {
  brand: "Gradiente",
  tagline: "Tu máxima razón de cambio",
  description: "Agrupación estudiantil de Ingeniería UNLP. Defendiendo la universidad pública y la industria nacional.",

  consultationFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSeGuH8e9_Yb_C6glZLeWzefB3vMLW1RlIgOFwUTw5RWtrd7hA/viewform?usp=publish-editor",
  driveUrl: "https://drive.google.com/open?id=1nqMOCWnGQf4hijaALpiovu1L5c6PvUJb",
  // carpeta "Parciales" de la nube: destino del buscador cuando una materia no tiene carpeta propia
  nubeParcialesUrl: "https://drive.google.com/drive/folders/1UfDvQ7H14H_3qtnAvem8FTfnhqKWs2aw",
  siuUrl: "https://autogestion.guarani.unlp.edu.ar/acceso",

  // Rutas de datos (absolutas: funcionan igual desde /v2 o desde la raíz)
  data: {
    links: "/links.json",
    kiosco: "/kiosco.json",
    planes: "data/planes.json",
    nube: "data/nube.json",
    faq: "data/faq.json",
    fechas: "data/fechas.json",
    catedras: "data/catedras.json",
    instagram: "data/instagram.json"
  },

  // Nombre del asistente de preguntas frecuentes del inicio
  botName: "Gradi",

  // Accesos rápidos del inicio: se buscan por título en links.json (o url directa).
  // icon: id, clock, cal, book, cloud, heart, ext · color: navy, red, blue
  quickLinks: [
    { title: "SIU Guaraní", url: "https://autogestion.guarani.unlp.edu.ar/acceso", icon: "id", color: "navy" },
    { title: "Aulas y horarios", match: "Aulas y horarios", icon: "clock", color: "red" },
    { title: "Calendario", match: "Calendario ano lectivo completo", icon: "cal", color: "blue" },
    { title: "Asignaturas", match: "Portal de Asignaturas FI", icon: "book", color: "blue" },
    { title: "Nube de apuntes", match: "Nube de apuntes y parciales", icon: "cloud", color: "navy" },
    { title: "Becas", match: "Becas y pasantias FI", icon: "heart", color: "red" }
  ],

  // "Quiénes somos" (se abre desde el inicio). history: agregar hitos { year, text } y aparece solo.
  about: {
    intro: "Somos una agrupación estudiantil de Ingeniería UNLP. Defendemos la universidad pública y la industria nacional, y laburamos para que cursar sea un poco más fácil.",
    doing: [
      { title: "Nube de apuntes", text: "Más de 2.600 parciales, finales y apuntes ordenados por materia.", match: "Nube de apuntes y parciales", icon: "cloud" },
      { title: "Mesita en Electro", text: "Kits de cuadernos y útiles a precio estudiante.", go: "#/mesita", icon: "shop" },
      { title: "Mi plan", text: "Tu carrera con correlativas: qué podés cursar y qué finales rendir.", go: "#/plan", icon: "plan" },
      { title: "Consultas", text: "¿No encontrás algo? Preguntanos y te orientamos.", consult: true, icon: "chat" }
    ],
    history: [
      // { year: "2019", text: "Nace Gradiente en ..." },
    ]
  },

  // Categorías de links.json en Recursos: orden, nombre visible, color, ícono y bajada.
  // "id" es el valor exacto de "category" en links.json. "layout: tiles" = tarjetas con descripción.
  // "hide: true" = no se muestra como bloque (sigue apareciendo en el buscador).
  categories: [
    { id: "Avisos", name: "Avisos", color: "#e11d2a", icon: "bell", hide: true },
    { id: "Ingresantes", name: "Ingresantes", color: "#2563eb", icon: "cap", desc: "Tus primeros pasos en la Facultad." },
    { id: "Consultas frecuentes", name: "Cursada", color: "#7c3aed", icon: "book", desc: "Aulas, horarios, aulas virtuales y trámites de cursada." },
    { id: "Parciales y apuntes", name: "Apuntes", color: "#0ea5e9", icon: "folder", hide: true },
    { id: "Becas y bienestar", name: "Becas y bienestar", color: "#059669", icon: "heart", desc: "Ayudas económicas, pasantías y albergue." },
    { id: "Proyectos e investigacion", name: "Proyectos e investigación", color: "#d97706", icon: "flask", desc: "Sumate a extensión, investigación y laboratorios.", layout: "tiles" },
    { id: "Oportunidades", name: "Oportunidades", color: "#db2777", icon: "spark" },
    { id: "Mapa Facultad", name: "Mapa", color: "#0891b2", icon: "pin", desc: "Ubicate en el predio." },
    { id: "Institucional", name: "Institucional", color: "#475569", icon: "building", desc: "Certificados, servicios y sistemas de la FI." },
    { id: "Contacto", name: "Contacto", color: "#e11d2a", icon: "mail", desc: "Mails oficiales para hacer consultas." }
  ],

  // Asistente del botón "Consultas". Cada tema muestra links de links.json (por título exacto),
  // mails y/o links directos. El tema "materia" abre el buscador de cátedras.
  help: [
    { id: "apuntes", title: "Busco apuntes, parciales o finales", icon: "folder", color: "#0ea5e9", nube: true },
    { id: "materia", title: "Tengo una duda con una materia", sub: "Mail y página de la cátedra", icon: "book", color: "#7c3aed", materia: true },
    { id: "tramites", title: "Trámites, inscripciones y certificados", icon: "doc", color: "#2563eb",
      links: ["Turnos FI para tramites", "Estudiantes FI (tramites, certificados y servicios)", "Prorroga para rendir final", "Calendario ano lectivo completo"],
      mails: [{ label: "Dirección de Enseñanza", mail: "ensenanza@ing.unlp.edu.ar", note: "Inscripciones, finales, equivalencias." }] },
    { id: "becas", title: "Becas y ayuda económica", icon: "heart", color: "#059669",
      links: ["Becas y pasantias FI", "PAE FI (inscripcion y seguimiento de becas)", "Becas UNLP", "Becas Progresar (oficial)", "Fondo de Becas FI (Devolviendo Oportunidades)"],
      mails: [{ label: "Asuntos Estudiantiles", mail: "asuntos.estudiantiles@ing.unlp.edu.ar", note: "Becas, bienestar y situaciones personales." }] },
    { id: "cuenta", title: "SIU, correo o cuentas de la Facultad", icon: "lock", color: "#475569",
      links: ["Como generar tu cuenta SIU-Guarani", "Solicitud de correo institucional para alumnos", "Servicios IT FI", "Portal de Asignaturas FI"] },
    { id: "gradiente", title: "Hablar con Gradiente", sub: "Te respondemos nosotros", icon: "chat", color: "#e11d2a", gradiente: true }
  ],

  socialLinks: [
    { label: "Instagram", icon: "ig", url: "https://instagram.com/gradienteingenieriaunlp" },
    { label: "WhatsApp", icon: "wa", url: "https://chat.whatsapp.com/CRnDHAhup938Nk4uJ8TBVp" },
    { label: "TikTok", icon: "tt", url: "https://www.tiktok.com/@gradiente.ing" },
    { label: "Mail", icon: "mail", url: "mailto:gradienteingenieriaunlp@gmail.com" }
  ]
};
