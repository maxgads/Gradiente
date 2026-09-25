/* Configuración editable de Gradiente v2.
   Los links y la mesita se leen de los mismos JSON que usa el sitio actual. */
window.GRADIENTE = {
  brand: "Gradiente",
  tagline: "Tu máxima razón de cambio",
  description: "Agrupación estudiantil de Ingeniería UNLP. Defendiendo la universidad pública y la industria nacional.",

  consultationFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSeGuH8e9_Yb_C6glZLeWzefB3vMLW1RlIgOFwUTw5RWtrd7hA/viewform?usp=publish-editor",
  driveUrl: "https://drive.google.com/open?id=1nqMOCWnGQf4hijaALpiovu1L5c6PvUJb",
  siuUrl: "https://autogestion.guarani.unlp.edu.ar/acceso",

  // Rutas de datos (absolutas: funcionan igual desde /v2 o desde la raíz)
  data: {
    links: "/links.json",
    kiosco: "/kiosco.json",
    planes: "data/planes.json",
    nube: "data/nube.json",
    faq: "data/faq.json"
  },

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

  // Orden y nombre visible de las categorías de links.json
  categories: [
    ["Avisos", "Avisos"],
    ["Ingresantes", "Ingresantes"],
    ["Consultas frecuentes", "Cursada"],
    ["Parciales y apuntes", "Apuntes"],
    ["Becas y bienestar", "Becas y bienestar"],
    ["Proyectos e investigacion", "Proyectos e investigación"],
    ["Oportunidades", "Oportunidades"],
    ["Mapa Facultad", "Mapa"],
    ["Institucional", "Institucional"],
    ["Contacto", "Contacto"]
  ],

  socialLinks: [
    { label: "Instagram", icon: "ig", url: "https://instagram.com/gradienteingenieriaunlp" },
    { label: "WhatsApp", icon: "wa", url: "https://chat.whatsapp.com/CRnDHAhup938Nk4uJ8TBVp" },
    { label: "TikTok", icon: "tt", url: "https://www.tiktok.com/@gradiente.ing" },
    { label: "Mail", icon: "mail", url: "mailto:gradienteingenieriaunlp@gmail.com" }
  ]
};
