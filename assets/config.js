window.LINKHUB_CONFIG = {
  brandName: "Gradiente Ingenieria UNLP",
  handle: "@gradienteingenieriaunlp",
  description: "Defendiendo la universidad publica y la industria nacional.",
  slogan: "Tu maxima razon de cambio",
  wordmarkText: "GRADIENTE",
  wordmarkIncludesSlogan: false,
  wordmarkUrl: "/assets/logo-gradiente-oficial-blanco.png",
  backgroundLogoUrl: "",
  consultationFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSeGuH8e9_Yb_C6glZLeWzefB3vMLW1RlIgOFwUTw5RWtrd7hA/viewform?usp=publish-editor",
  primaryContactLabel: "Hacer consulta",
  contactChannelsLabel: "Consultas a",
  driveUrl: "https://drive.google.com/open?id=1nqMOCWnGQf4hijaALpiovu1L5c6PvUJb",
  analyticsMeasurementId: "",
  linksDataVersion: "20260511",
  kioscoDataVersion: "20260410",
  homePromoAutoplayMs: 5000,
  utmDefaults: {
    source: "ig_bio",
    medium: "linkhub",
    campaign: "fi_unlp_2026"
  },
  homeCategoryOrder: [
    "Avisos",
    "Ingresantes",
    "Consultas frecuentes",
    "Parciales y apuntes",
    "Becas y bienestar",
    "Proyectos e investigacion",
    "Oportunidades",
    "Mapa Facultad",
    "Institucional",
    "Contacto"
  ],
  routeConfig: {
    home: {
      path: "/",
      label: "Inicio",
      title: "Ingenieria UNLP | Links",
      nav: true,
      view: "home",
      excludeFromHome: ["Ingresantes", "Consultas frecuentes", "Mapa Facultad"]
    },
    parciales: {
      path: "/parciales",
      label: "Cursada",
      title: "Cursada | Ingenieria UNLP",
      nav: true,
      view: "list",
      panelTitle: "Consultas y recursos de cursada",
      panelCopy: "Links clave para cursar, rendir y resolver dudas academicas frecuentes.",
      match: {
        categories: ["Consultas frecuentes"]
      }
    },
    ingresantes: {
      path: "/ingresantes",
      label: "Ingresantes",
      title: "Ingresantes | Ingenieria UNLP",
      nav: true,
      view: "list",
      panelTitle: "Primeros pasos y tramites",
      panelCopy: "Todo lo necesario para arrancar: calendario, guias, tramites y orientacion.",
      match: {
        categories: ["Ingresantes"]
      }
    },
    mapa: {
      path: "/mapa",
      label: "Mapa",
      title: "Mapa Facultad | Ingenieria UNLP",
      nav: true,
      view: "list",
      panelTitle: "Recorrido de la facultad",
      panelCopy: "Proximamente vas a poder explorar un escenario 3D con las 4 manzanas, edificios y aulas para ubicarte antes de cursar.",
      match: {
        categories: ["Mapa Facultad"],
        tags: ["mapa", "campus"]
      }
    },
    mesa: {
      path: "/mesa",
      label: "Mesita en Electro",
      title: "Mesita en Electro | Ingenieria UNLP",
      nav: true,
      view: "kiosk",
      panelTitle: "Mesita en Electro",
      panelCopy:
        "Productos y promos del kiosco en el edificio de Electro."
    },
    consultas: {
      path: "/consultas",
      title: "Redirigiendo a consultas | Ingenieria UNLP",
      nav: false,
      view: "redirect"
    }
  },
  socialLinks: [
    {
      label: "Instagram",
      short: "IG",
      url: "https://instagram.com/gradienteingenieriaunlp"
    },
    {
      label: "WhatsApp",
      short: "WA",
      url: "https://chat.whatsapp.com/CRnDHAhup938Nk4uJ8TBVp"
    },
    {
      label: "TikTok",
      short: "TT",
      url: "https://www.tiktok.com/@gradiente.ing"
    },
    {
      label: "Mail",
      short: "@",
      url: "gradienteingenieriaunlp@gmail.com"
    }
  ]
};
