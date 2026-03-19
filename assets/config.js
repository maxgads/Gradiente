window.LINKHUB_CONFIG = {
  brandName: "Gradiente Ingenieria UNLP",
  handle: "@gradienteingenieriaunlp",
  description: "Defendiendo la universidad publica y la industria nacional.",
  slogan: "Tu maxima razon de cambio",
  wordmarkText: "GRADIENTE",
  wordmarkIncludesSlogan: false,
  wordmarkUrl: "",
  backgroundLogoUrl: "",
  consultationFormUrl: "https://forms.gle/REEMPLAZAR_FORM",
  primaryContactLabel: "Hacer consulta",
  contactChannelsLabel: "Consultas a",
  driveUrl: "https://drive.google.com/drive/folders/1p_qUO7nKagtmC9glcEqIAdcIqEV6fWkp",
  analyticsMeasurementId: "",
  utmDefaults: {
    source: "ig_bio",
    medium: "linkhub",
    campaign: "fi_unlp_2026"
  },
  homeCategoryOrder: [
    "Ingresantes",
    "Consultas frecuentes",
    "Parciales y apuntes",
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
      url: "https://wa.me/5492210000000"
    },
    {
      label: "TikTok",
      short: "TT",
      url: "https://www.tiktok.com/@gradienteingenieriaunlp"
    },
    {
      label: "Mail",
      short: "@",
      url: "mailto:gradienteingenieriaunlp@gmail.com"
    }
  ]
};
