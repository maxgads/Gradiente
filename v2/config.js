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
    nube: "data/nube.json"
  },

  // Accesos rápidos del inicio: se buscan por título en links.json (o url directa)
  quickLinks: [
    { title: "SIU Guaraní", url: "https://autogestion.guarani.unlp.edu.ar/acceso", icon: "ext" },
    { title: "Aulas y horarios", match: "Aulas y horarios" },
    { title: "Calendario académico", match: "Calendario ano lectivo completo" },
    { title: "Portal de asignaturas", match: "Portal de Asignaturas FI" },
    { title: "Nube de apuntes", match: "Nube de apuntes y parciales", icon: "folder" },
    { title: "Becas", match: "Becas y pasantias FI" }
  ],

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
