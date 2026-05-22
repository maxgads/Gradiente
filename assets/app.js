(function () {
  "use strict";

  const config = window.LINKHUB_CONFIG || {};
  const routeConfig = config.routeConfig || {};
  const homeCategoryOrder = Array.isArray(config.homeCategoryOrder)
    ? config.homeCategoryOrder
    : [
        "Ingresantes",
        "Consultas frecuentes",
        "Parciales y apuntes",
        "Oportunidades",
        "Mapa Facultad",
        "Institucional",
        "Contacto"
      ];

  const state = {
    currentPath: "/",
    links: null,
    linksPromise: null,
    kiosk: null,
    kioskPromise: null,
    promoAutoplayTimer: null,
    renderToken: 0
  };

  const routes = normalizeRoutes(routeConfig);
  const routesByPath = new Map(routes.map(function (route) {
    return [route.path, route];
  }));
  const homeRoute = routes.find(function (route) {
    return route.view === "home";
  });
  const homeExclusions = new Set((homeRoute && homeRoute.excludeFromHome) || []);

  function normalizePath(pathname) {
    const raw = String(pathname || "/");
    const noQuery = raw.split("?")[0].split("#")[0] || "/";
    if (noQuery.length > 1 && noQuery.endsWith("/")) {
      return noQuery.slice(0, -1);
    }
    return noQuery || "/";
  }

  function normalizeRoutes(rawRoutes) {
    const defaults = {
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
        panelCopy:
          "Proximamente vas a poder explorar un escenario 3D con las 4 manzanas, edificios y aulas para ubicarte antes de cursar.",
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
    };

    const merged = Object.assign({}, defaults, rawRoutes || {});

    return Object.keys(merged).map(function (key) {
      const route = Object.assign({}, merged[key]);
      route.key = key;
      route.path = normalizePath(route.path || "/");
      route.view = route.view || "list";
      route.nav = route.nav !== false;
      route.title = route.title || "Gradiente Ingenieria UNLP";
      route.label = route.label || key;

      if (route.match && route.match.categories) {
        route.match.categories = route.match.categories.map(function (entry) {
          return String(entry).toLowerCase();
        });
      }

      if (route.match && route.match.tags) {
        route.match.tags = route.match.tags.map(function (entry) {
          return String(entry).toLowerCase();
        });
      }

      if (route.match && route.match.audience) {
        route.match.audience = route.match.audience.map(function (entry) {
          return String(entry).toLowerCase();
        });
      }

      route.excludeFromHome = Array.isArray(route.excludeFromHome)
        ? route.excludeFromHome.map(function (entry) {
            return String(entry).toLowerCase();
          })
        : [];

      return route;
    });
  }

  function getRoute(pathname) {
    const path = normalizePath(pathname);
    return routesByPath.get(path) || routesByPath.get("/") || routes[0];
  }

  function getStartupPath() {
    const current = new URL(window.location.href);
    const requestedRoute = current.searchParams.get("route");

    if (requestedRoute) {
      const normalizedRequested = normalizePath(requestedRoute);
      if (routesByPath.has(normalizedRequested)) {
        current.searchParams.delete("route");
        const nextSearch = current.searchParams.toString();
        const cleanUrl =
          normalizedRequested +
          (nextSearch ? "?" + nextSearch : "") +
          (current.hash || "");
        window.history.replaceState({ path: normalizedRequested }, "", cleanUrl);
        return normalizedRequested;
      }
    }

    return normalizePath(current.pathname);
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function isPlaceholder(url) {
    return !url || /REEMPLAZAR_/i.test(url);
  }

  function safeUrlForCss(url) {
    return String(url).replace(/"/g, "%22").replace(/'/g, "%27");
  }

  function displayCategoryName(categoryName) {
    if (String(categoryName).toLowerCase() === "consultas frecuentes") {
      return "Cursada";
    }
    return categoryName;
  }

  function baseUtm() {
    const defaults = config.utmDefaults || {};
    return {
      utm_source: defaults.source || "ig_bio",
      utm_medium: defaults.medium || "linkhub",
      utm_campaign: defaults.campaign || "fi_unlp_2026"
    };
  }

  function withUtm(rawUrl, customUtm) {
    if (!rawUrl) return "#";

    let url;
    try {
      url = new URL(rawUrl, window.location.origin);
    } catch (_error) {
      return rawUrl;
    }

    if (!/^https?:$/i.test(url.protocol)) {
      return rawUrl;
    }

    if (url.origin === window.location.origin && routesByPath.has(normalizePath(url.pathname))) {
      return normalizePath(url.pathname);
    }

    const merged = Object.assign({}, baseUtm(), customUtm || {});
    Object.keys(merged).forEach(function (key) {
      if (merged[key]) {
        url.searchParams.set(key, merged[key]);
      }
    });

    return url.toString();
  }

  function loadAnalytics() {
    if (!config.analyticsMeasurementId) return;
    if (window.gtag) return;

    const script = document.createElement("script");
    script.async = true;
    script.src =
      "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(config.analyticsMeasurementId);
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", config.analyticsMeasurementId, {
      anonymize_ip: true
    });
  }

  function trackEvent(eventName, params) {
    const payload = Object.assign(
      {
        page_path: state.currentPath
      },
      params || {}
    );

    if (window.gtag) {
      window.gtag("event", eventName, payload);
    }

    if (window.plausible) {
      window.plausible(eventName, {
        props: payload
      });
    }
  }

  function normalizeAudience(audience) {
    if (Array.isArray(audience)) return audience.map(String);
    if (typeof audience === "string" && audience.trim()) {
      return [audience.trim()];
    }
    return [];
  }

  function normalizeTags(tags) {
    if (Array.isArray(tags)) return tags.map(String);
    if (typeof tags === "string" && tags.trim()) {
      return [tags.trim()];
    }
    return [];
  }

  function normalizeLink(rawLink) {
    const normalized = Object.assign({}, rawLink);
    normalized.title = String(rawLink.title || "Sin titulo");
    normalized.url = String(rawLink.url || "#");
    normalized.category = String(rawLink.category || "General");
    normalized.categoryKey = normalized.category.toLowerCase();
    normalized.audience = normalizeAudience(rawLink.audience);
    normalized.audienceKey = normalized.audience.map(function (entry) {
      return entry.toLowerCase();
    });
    normalized.tags = normalizeTags(rawLink.tags);
    normalized.tagKey = normalized.tags.map(function (entry) {
      return entry.toLowerCase();
    });
    normalized.priority = Number.isFinite(rawLink.priority)
      ? rawLink.priority
      : Number(rawLink.priority) || 999;
    normalized.active = rawLink.active !== false;
    return normalized;
  }

  function sortByPriority(links) {
    return links.slice().sort(function (a, b) {
      if (a.priority === b.priority) {
        const labelA = String(a.title || a.name || "");
        const labelB = String(b.title || b.name || "");
        return labelA.localeCompare(labelB, "es");
      }
      return a.priority - b.priority;
    });
  }

  function setVisualWithFallback(visualElement, fallbackElement, imageUrl) {
    if (!visualElement) return Promise.resolve(false);

    visualElement.classList.add("hidden");
    visualElement.style.backgroundImage = "none";
    if (fallbackElement) fallbackElement.classList.remove("hidden");

    if (!imageUrl || isPlaceholder(imageUrl)) {
      return Promise.resolve(false);
    }

    return new Promise(function (resolve) {
      const probe = new Image();

      probe.onload = function () {
        visualElement.style.backgroundImage = "url(\"" + safeUrlForCss(imageUrl) + "\")";
        visualElement.classList.remove("hidden");
        if (fallbackElement) fallbackElement.classList.add("hidden");
        resolve(true);
      };

      probe.onerror = function () {
        visualElement.classList.add("hidden");
        visualElement.style.backgroundImage = "none";
        if (fallbackElement) fallbackElement.classList.remove("hidden");
        resolve(false);
      };

      probe.src = imageUrl;
    });
  }

  function hydrateBranding() {
    const handle = document.getElementById("handle");
    const brandName = document.getElementById("brand-name");
    const brandDescription = document.getElementById("brand-description");
    const wordmarkImage = document.getElementById("wordmark-image");
    const wordmarkFallback = document.getElementById("wordmark-fallback");
    const wordmarkAccent = document.getElementById("wordmark-accent");
    const backgroundWatermark = document.getElementById("background-watermark");

    if (handle && config.handle) handle.textContent = config.handle;
    if (brandName && config.brandName) brandName.textContent = config.brandName;
    if (brandDescription && config.description) {
      brandDescription.textContent = config.description;
    }

    const watermarkText = String(config.wordmarkText || "GRADIENTE").toUpperCase();

    if (wordmarkFallback) {
      wordmarkFallback.textContent = watermarkText;
    }

    if (wordmarkAccent && config.slogan) {
      wordmarkAccent.textContent = config.slogan;
    }

    void setVisualWithFallback(wordmarkImage, wordmarkFallback, config.wordmarkUrl).then(
      function (loaded) {
        if (!wordmarkAccent) return;
        const includesSlogan = config.wordmarkIncludesSlogan !== false;
        if (loaded && includesSlogan) {
          wordmarkAccent.classList.add("hidden");
        } else {
          wordmarkAccent.classList.remove("hidden");
        }
      }
    );

    if (backgroundWatermark) {
      if (config.backgroundLogoUrl && !isPlaceholder(config.backgroundLogoUrl)) {
        backgroundWatermark.style.backgroundImage =
          "url(\"" + safeUrlForCss(config.backgroundLogoUrl) + "\")";
        backgroundWatermark.classList.remove("text-watermark");
      } else {
        backgroundWatermark.style.backgroundImage = "none";
        backgroundWatermark.classList.add("text-watermark");
        backgroundWatermark.style.setProperty("--watermark-text", JSON.stringify(watermarkText));
      }
    }
  }

  function getSocialIcon(label) {
    const key = String(label || "").toLowerCase();
    const icons = {
      instagram:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" ry="4"></rect><circle cx="12" cy="12" r="3.5"></circle><circle cx="17.2" cy="6.8" r="1"></circle></svg>',
      whatsapp:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.8a8 8 0 0 1-11.8 7l-3.2 1 1-3.1A8 8 0 1 1 20 11.8Z"></path><path d="M9 9.2c-.2-.4-.4-.4-.6-.4h-.6c-.2 0-.4 0-.6.2-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.5 2.4 3.8 3.2 1.9.6 2.2.5 2.6.5.4-.1 1.2-.5 1.4-1 .2-.5.2-1 .1-1-.1-.1-.3-.2-.7-.4-.4-.2-1.2-.6-1.4-.6-.2-.1-.3-.1-.5.1-.2.2-.6.7-.7.8-.1.2-.3.2-.6.1-.3-.2-1.1-.4-2-1.3-.7-.6-1.2-1.4-1.3-1.7-.1-.3 0-.4.1-.6.1-.1.2-.3.3-.4.1-.1.1-.3.2-.4.1-.1 0-.3 0-.4 0-.1-.5-1.3-.7-1.8Z"></path></svg>',
      tiktok:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.8 4c.4 1.2 1.3 2.2 2.6 2.6v2.4a5.9 5.9 0 0 1-2.6-.8V14a5 5 0 1 1-5-5c.2 0 .4 0 .6.1v2.6a2.4 2.4 0 1 0 1.9 2.3V4h2.5Z"></path></svg>',
      mail:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3z"></path><path d="m4 7 8 6 8-6"></path></svg>'
    };

    return icons[key] || "";
  }

  function resolveContactCopyValue(social) {
    const raw = String((social && social.url) || "").trim();
    if (!raw) return "";
    if (/^mailto:/i.test(raw)) {
      return raw.replace(/^mailto:/i, "").trim();
    }
    if (raw.indexOf("@") !== -1 && raw.indexOf("http") !== 0) {
      return raw;
    }
    return "";
  }

  function mountContactHub() {
    const slot = document.getElementById("top-cta-slot");
    if (!slot) return;

    slot.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "contact-hub";

    const cta = document.createElement("a");
    cta.className = "cta-button";
    cta.textContent = config.primaryContactLabel || "Hacer consulta";

    const validConsultUrl = !isPlaceholder(config.consultationFormUrl);
    cta.href = validConsultUrl
      ? withUtm(config.consultationFormUrl, {
          utm_campaign: "consultas",
          utm_content: "contact_hub"
        })
      : "/consultas";

    if (validConsultUrl) {
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";
    }

    cta.addEventListener("click", function () {
      trackEvent("click_consultas", {
        source: "contact_hub"
      });
    });

    const channels = document.createElement("div");
    channels.className = "contact-channels";

    const label = document.createElement("span");
    label.className = "contact-label";
    label.textContent = config.contactChannelsLabel || "Consultas a";
    channels.appendChild(label);

    if (Array.isArray(config.socialLinks)) {
      config.socialLinks.forEach(function (social) {
        const copyValue = resolveContactCopyValue(social);
        const isCopyChannel = Boolean(copyValue);
        const element = isCopyChannel ? document.createElement("button") : document.createElement("a");
        element.className = "contact-channel" + (isCopyChannel ? " contact-channel-copy" : "");
        element.setAttribute("aria-label", social.label);

        if (isCopyChannel) {
          element.type = "button";
        } else {
          element.href = social.url;
          element.target = "_blank";
          element.rel = "noopener noreferrer";
        }

        const icon = getSocialIcon(social.label);
        if (icon) {
          element.innerHTML = icon + '<span class="sr-only">' + social.label + "</span>";
        } else {
          element.textContent = social.short || social.label;
        }

        if (isCopyChannel) {
          element.addEventListener("click", function () {
            copyToClipboard(copyValue).then(function (copied) {
              if (copied) {
                showToast("Link copiado");
                element.classList.remove("is-copied");
                void element.offsetWidth;
                element.classList.add("is-copied");
              } else {
                showToast("No se pudo copiar el link");
              }
            });

            trackEvent("click_contact_channel_copy", {
              channel: social.label
            });
          });
        } else {
          element.addEventListener("click", function () {
            trackEvent("click_contact_channel", {
              channel: social.label
            });
          });
        }

        channels.appendChild(element);
      });
    }

    wrapper.appendChild(cta);
    wrapper.appendChild(channels);
    slot.appendChild(wrapper);
  }

  function shouldUseIntroMotion() {
    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return false;

    try {
      const seen = window.sessionStorage.getItem("linkhub_shell_intro_seen") === "1";
      window.sessionStorage.setItem("linkhub_shell_intro_seen", "1");
      return !seen;
    } catch (_error) {
      return true;
    }
  }

  function animateShell() {
    if (!shouldUseIntroMotion()) return;

    const items = document.querySelectorAll(".profile, .top-cta, .route-nav, #app-main");
    items.forEach(function (item, index) {
      item.classList.add("reveal-item");
      window.setTimeout(function () {
        item.classList.add("is-visible");
      }, 70 + index * 70);
    });

    document.body.classList.add("has-intro-motion");
  }

  function loadLinks() {
    if (state.links) {
      return Promise.resolve(state.links);
    }

    if (state.linksPromise) {
      return state.linksPromise;
    }

    const version = String(config.linksDataVersion || "").trim();
    const linksUrl = version ? "/links.json?v=" + encodeURIComponent(version) : "/links.json";

    state.linksPromise = fetch(linksUrl, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("No se pudo leer links.json");
        }
        return response.json();
      })
      .then(function (payload) {
        if (!Array.isArray(payload)) {
          throw new Error("Formato invalido en links.json");
        }

        const normalized = payload.map(normalizeLink).filter(function (link) {
          return link.active;
        });

        state.links = normalized;
        return normalized;
      })
      .catch(function (error) {
        console.error(error);
        state.links = [];
        return [];
      })
      .finally(function () {
        state.linksPromise = null;
      });

    return state.linksPromise;
  }

  function normalizeKioskPromo(rawPromo, index) {
    const normalized = Object.assign({}, rawPromo);
    normalized.id = String(rawPromo.id || "promo-" + String(index + 1));
    normalized.title = String(rawPromo.title || "Promo destacada");
    normalized.price = String(rawPromo.price || "Consultar");
    normalized.label = String(rawPromo.label || "");
    normalized.image = String(rawPromo.image || "");
    normalized.priority = Number.isFinite(rawPromo.priority)
      ? rawPromo.priority
      : Number(rawPromo.priority) || index + 1;
    normalized.active = rawPromo.active !== false;
    return normalized;
  }

  function normalizeKioskProduct(rawProduct, index) {
    const normalized = Object.assign({}, rawProduct);
    normalized.id = String(rawProduct.id || "producto-" + String(index + 1));
    normalized.name = String(rawProduct.name || "Producto");
    normalized.category = String(rawProduct.category || "General");
    normalized.categoryKey = normalized.category.toLowerCase();
    normalized.description = String(rawProduct.description || "");
    normalized.price = String(rawProduct.price || "Consultar");
    normalized.stock = String(rawProduct.stock || "disponible");
    normalized.image = String(rawProduct.image || "");
    normalized.featured = rawProduct.featured === true;
    normalized.priority = Number.isFinite(rawProduct.priority)
      ? rawProduct.priority
      : Number(rawProduct.priority) || index + 1;
    normalized.active = rawProduct.active !== false;
    return normalized;
  }

  function loadKioskData() {
    if (state.kiosk) {
      return Promise.resolve(state.kiosk);
    }

    if (state.kioskPromise) {
      return state.kioskPromise;
    }

    const version = String(config.kioscoDataVersion || "").trim();
    const kioskUrl = version ? "/kiosco.json?v=" + encodeURIComponent(version) : "/kiosco.json";

    state.kioskPromise = fetch(kioskUrl, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("No se pudo leer kiosco.json");
        }
        return response.json();
      })
      .then(function (payload) {
        const rawPromos = Array.isArray(payload && payload.promos) ? payload.promos : [];
        const rawProducts = Array.isArray(payload && payload.productos) ? payload.productos : [];

        const promos = rawPromos
          .map(normalizeKioskPromo)
          .filter(function (promo) {
            return promo.active;
          });

        const products = rawProducts
          .map(normalizeKioskProduct)
          .filter(function (product) {
            return product.active;
          });

        state.kiosk = {
          promos: sortByPriority(promos),
          products: sortByPriority(products)
        };

        return state.kiosk;
      })
      .catch(function (error) {
        console.error(error);
        state.kiosk = {
          promos: [],
          products: []
        };
        return state.kiosk;
      })
      .finally(function () {
        state.kioskPromise = null;
      });

    return state.kioskPromise;
  }

  function clearPromoAutoplay() {
    if (state.promoAutoplayTimer) {
      window.clearInterval(state.promoAutoplayTimer);
      state.promoAutoplayTimer = null;
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function updateNav(path) {
    const navLinks = document.querySelectorAll(".route-link");
    navLinks.forEach(function (link) {
      const linkPath = normalizePath(link.getAttribute("href"));
      link.classList.toggle("active", linkPath === path);
    });
  }

  function renderSkeleton() {
    const main = document.getElementById("app-main");
    if (!main) return;

    main.innerHTML =
      '<section class="panel panel-highlight">' +
      '<h2>Cargando...</h2>' +
      '<p class="panel-copy">Preparando recursos.</p>' +
      "</section>" +
      '<section class="panel">' +
      '<div class="skeleton-list">' +
      '<div class="skeleton-card"></div>'.repeat(4) +
      "</div>" +
      "</section>";
  }

  function shouldRenderInHome(categoryName) {
    return !homeExclusions.has(String(categoryName || "").toLowerCase());
  }

  function createSection(title, links) {
    const section = document.createElement("section");
    section.className = "panel";

    const heading = document.createElement("h2");
    heading.textContent = displayCategoryName(title);
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "link-list";

    links.forEach(function (link) {
      list.appendChild(renderLinkCard(link));
    });

    section.appendChild(list);
    return section;
  }

  function resolveInternalRoute(rawUrl) {
    if (!rawUrl) return null;

    try {
      const parsed = new URL(rawUrl, window.location.origin);
      if (parsed.origin !== window.location.origin) return null;
      const normalized = normalizePath(parsed.pathname);
      return routesByPath.has(normalized) ? normalized : null;
    } catch (_error) {
      return null;
    }
  }

  function renderLinkCard(link) {
    const internalRoute = resolveInternalRoute(link.url);
    const isMailLink = /^mailto:/i.test(link.url);
    const card = isMailLink ? document.createElement("div") : document.createElement("a");
    card.className = isMailLink ? "link-card link-card-mail" : "link-card";

    if (!isMailLink) {
      if (internalRoute) {
        card.href = internalRoute;
        card.dataset.route = internalRoute;
      } else {
        const safeTitle = slugify(link.title) || "recurso";
        card.href = withUtm(link.url, {
          utm_content: safeTitle
        });
        card.target = "_blank";
        card.rel = "noopener noreferrer";
      }
    }

    const content = document.createElement("div");
    content.className = "link-card-body";

    const title = document.createElement("span");
    title.className = "link-title";
    title.textContent = link.title;
    content.appendChild(title);

    if (link.tags.length) {
      const tags = document.createElement("span");
      tags.className = "link-tags";
      tags.textContent = link.tags.join(" · ");
      content.appendChild(tags);
    }

    card.appendChild(content);

    if (isMailLink) {
      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "copy-mail-button";
      copyButton.textContent = "Copiar";
      copyButton.setAttribute("aria-label", "Copiar correo");
      copyButton.addEventListener("click", function () {
        const mail = String(link.url || "").replace(/^mailto:/i, "").trim();
        if (!mail) return;

        copyToClipboard(mail).then(function (copied) {
          if (copied) {
            showToast("Link copiado");
          } else {
            showToast("No se pudo copiar el link");
          }
        });

        trackEvent("click_copy_mail", {
          link_title: link.title,
          link_category: link.category
        });
      });
      card.appendChild(copyButton);
      return card;
    }

    card.addEventListener("click", function () {
      trackEvent("click_link", {
        link_title: link.title,
        link_category: link.category,
        destination: internalRoute || "external"
      });
    });

    return card;
  }

  function copyToClipboard(text) {
    if (!text) return Promise.resolve(false);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard
        .writeText(text)
        .then(function () {
          return true;
        })
        .catch(function () {
          return fallbackCopy(text);
        });
    }

    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.setAttribute("readonly", "");
      temp.style.position = "fixed";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);
      temp.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(temp);
      return ok;
    } catch (_error) {
      return false;
    }
  }

  function showToast(message) {
    let toast = document.getElementById("copy-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "copy-toast";
      toast.className = "copy-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("is-visible");

    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 1300);
  }

  function filterLinksForRoute(route, links) {
    if (!route.match) return links;

    const match = route.match;

    return links.filter(function (link) {
      let valid = true;

      if (match.categories && match.categories.length) {
        valid = valid && match.categories.includes(link.categoryKey);
      }

      if (match.tags && match.tags.length) {
        valid =
          valid &&
          link.tagKey.some(function (tag) {
            return match.tags.includes(tag);
          });
      }

      if (match.audience && match.audience.length) {
        valid =
          valid &&
          link.audienceKey.some(function (entry) {
            return match.audience.includes(entry);
          });
      }

      return valid;
    });
  }

  function renderHome(links) {
    const main = document.getElementById("app-main");
    if (!main) return Promise.resolve();

    clearPromoAutoplay();
    main.innerHTML = "";

    const grouped = links.reduce(function (acc, link) {
      if (!shouldRenderInHome(link.category)) return acc;
      if (!acc[link.category]) acc[link.category] = [];
      acc[link.category].push(link);
      return acc;
    }, {});

    const orderedCategories = homeCategoryOrder
      .filter(function (category) {
        return grouped[category] && grouped[category].length;
      })
      .concat(
        Object.keys(grouped).filter(function (category) {
          return !homeCategoryOrder.includes(category);
        })
      );

    if (!orderedCategories.length) {
      const empty = document.createElement("section");
      empty.className = "panel panel-highlight";
      empty.innerHTML =
        "<h2>Sin contenido</h2><p class=\"panel-copy\">No hay links activos para mostrar.</p>";
      main.appendChild(empty);
      return Promise.resolve();
    }

    orderedCategories.forEach(function (categoryName) {
      const categoryLinks = sortByPriority(grouped[categoryName]);
      main.appendChild(createSection(categoryName, categoryLinks));
    });

    return Promise.resolve();
  }

  function renderKioskPromos(main, kioskData) {
    const panel = document.createElement("section");
    panel.className = "panel panel-highlight promo-panel";

    const heading = document.createElement("h2");
    heading.textContent = "Promos Mesita en Electro";
    panel.appendChild(heading);

    const copy = document.createElement("p");
    copy.className = "panel-copy";
    copy.textContent = "Ofertas y productos mas pedidos del kiosco en la facu.";
    panel.appendChild(copy);

    const products = Array.isArray(kioskData && kioskData.products) ? kioskData.products : [];
    const promos =
      Array.isArray(kioskData && kioskData.promos) && kioskData.promos.length
        ? kioskData.promos.slice(0, 8)
        : products
            .filter(function (product) {
              return product.featured;
            })
            .slice(0, 3)
            .map(function (product) {
              return {
                id: product.id,
                title: product.name,
                price: product.price,
                label: "Destacado",
                image: product.image
              };
            });

    if (!promos.length) {
      const empty = document.createElement("p");
      empty.className = "panel-copy";
      empty.textContent = "Mesita en Electro esta cargando productos. Volve a revisar en unos minutos.";
      panel.appendChild(empty);
      main.appendChild(panel);
      return;
    }

    const carousel = document.createElement("div");
    carousel.className = "promo-carousel";
    carousel.setAttribute("role", "region");
    carousel.setAttribute("aria-label", "Promociones de Mesita en Electro");

    const track = document.createElement("div");
    track.className = "promo-track";

    const indicators = [];

    promos.forEach(function (promo, index) {
      const slide = document.createElement("article");
      slide.className = "promo-slide";
      slide.setAttribute("aria-label", "Promo " + String(index + 1));

      const media = document.createElement("div");
      media.className = "promo-media";
      if (promo.image && !isPlaceholder(promo.image)) {
        media.style.backgroundImage = "url(\"" + safeUrlForCss(promo.image) + "\")";
        media.classList.add("has-image");
      } else {
        media.textContent = "Mesa";
      }
      slide.appendChild(media);

      const content = document.createElement("div");
      content.className = "promo-content";

      if (promo.label) {
        const badge = document.createElement("span");
        badge.className = "promo-badge";
        badge.textContent = promo.label;
        content.appendChild(badge);
      }

      const title = document.createElement("h3");
      title.className = "promo-title";
      title.textContent = promo.title;
      content.appendChild(title);

      const price = document.createElement("p");
      price.className = "promo-price";
      price.textContent = promo.price;
      content.appendChild(price);

      slide.appendChild(content);
      track.appendChild(slide);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "promo-indicator";
      dot.setAttribute("aria-label", "Ver promo " + String(index + 1));
      dot.addEventListener("click", function () {
        goTo(index, true);
      });
      indicators.push(dot);
    });

    const controls = document.createElement("div");
    controls.className = "promo-controls";

    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.className = "promo-control";
    prevButton.setAttribute("aria-label", "Promo anterior");
    prevButton.textContent = "‹";

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "promo-control";
    nextButton.setAttribute("aria-label", "Promo siguiente");
    nextButton.textContent = "›";

    const indicatorWrap = document.createElement("div");
    indicatorWrap.className = "promo-indicators";
    indicators.forEach(function (dot) {
      indicatorWrap.appendChild(dot);
    });

    controls.appendChild(prevButton);
    controls.appendChild(indicatorWrap);
    controls.appendChild(nextButton);

    carousel.appendChild(track);
    carousel.appendChild(controls);
    panel.appendChild(carousel);

    main.appendChild(panel);

    let currentIndex = 0;
    let paused = false;

    function goTo(nextIndex, isUserAction) {
      const total = promos.length;
      currentIndex = ((nextIndex % total) + total) % total;
      track.style.transform = "translateX(-" + String(currentIndex * 100) + "%)";

      indicators.forEach(function (dot, dotIndex) {
        dot.classList.toggle("active", dotIndex === currentIndex);
      });

      if (isUserAction) {
        trackEvent("click_promo", {
          promo_index: currentIndex + 1
        });
      }
    }

    goTo(0, false);

    prevButton.addEventListener("click", function () {
      goTo(currentIndex - 1, true);
    });

    nextButton.addEventListener("click", function () {
      goTo(currentIndex + 1, true);
    });

    carousel.addEventListener("mouseenter", function () {
      paused = true;
    });
    carousel.addEventListener("mouseleave", function () {
      paused = false;
    });
    carousel.addEventListener("focusin", function () {
      paused = true;
    });
    carousel.addEventListener("focusout", function () {
      paused = false;
    });

    const autoplayMs = Math.max(2500, Number(config.homePromoAutoplayMs) || 5000);
    if (promos.length > 1 && !prefersReducedMotion()) {
      state.promoAutoplayTimer = window.setInterval(function () {
        if (!paused) {
          goTo(currentIndex + 1, false);
        }
      }, autoplayMs);
    }
  }

  function renderKioskView(route) {
    const main = document.getElementById("app-main");
    if (!main) return Promise.resolve();

    clearPromoAutoplay();

    return loadKioskData().then(function (kioskData) {
      const products = Array.isArray(kioskData && kioskData.products) ? kioskData.products : [];

      main.innerHTML = "";

      const intro = document.createElement("section");
      intro.className = "panel panel-highlight";

      const introTitle = document.createElement("h2");
      introTitle.className = "kiosk-intro-title";
      introTitle.textContent = route.panelTitle || route.label || "Mesita en Electro";
      intro.appendChild(introTitle);

      const introCopy = document.createElement("p");
      introCopy.className = "panel-copy kiosk-intro-copy";
      introCopy.textContent =
        route.panelCopy ||
        "Productos y promos del kiosco en el edificio de Electro.";
      intro.appendChild(introCopy);

      main.appendChild(intro);
      renderKioskPromos(main, kioskData);

      if (!products.length) {
        const emptyPanel = document.createElement("section");
        emptyPanel.className = "panel";
        emptyPanel.innerHTML =
          "<h2>Catalogo en preparacion</h2><p class=\"panel-copy\">Todavia no hay productos cargados.</p>";
        main.appendChild(emptyPanel);
        return;
      }

      const grouped = {};
      const categoryOrder = [];

      products.forEach(function (product) {
        if (!grouped[product.category]) {
          grouped[product.category] = [];
          categoryOrder.push(product.category);
        }
        grouped[product.category].push(product);
      });

      categoryOrder.forEach(function (categoryName) {
        const panel = document.createElement("section");
        panel.className = "panel kiosk-group";

        const title = document.createElement("h2");
        title.className = "kiosk-group-title";
        title.textContent = categoryName;
        panel.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "kiosk-grid";

        sortByPriority(grouped[categoryName]).forEach(function (product) {
          const card = document.createElement("article");
          card.className = "kiosk-card";

          if (product.featured) {
            const featured = document.createElement("span");
            featured.className = "kiosk-badge";
            featured.textContent = "Destacado";
            card.appendChild(featured);
          }

          const name = document.createElement("h3");
          name.className = "kiosk-name";
          name.textContent = product.name;
          card.appendChild(name);

          if (product.description) {
            const description = document.createElement("p");
            description.className = "kiosk-description";
            description.textContent = product.description;
            card.appendChild(description);
          }

          const meta = document.createElement("div");
          meta.className = "kiosk-meta";

          const price = document.createElement("strong");
          price.className = "kiosk-price";
          price.textContent = product.price;
          meta.appendChild(price);

          const stock = document.createElement("span");
          stock.className = "kiosk-stock";
          stock.textContent = product.stock;
          meta.appendChild(stock);

          card.appendChild(meta);
          grid.appendChild(card);
        });

        panel.appendChild(grid);
        main.appendChild(panel);
      });
    });
  }

  function renderListView(route, links) {
    const main = document.getElementById("app-main");
    if (!main) return;

    const filtered = sortByPriority(filterLinksForRoute(route, links));

    const intro = document.createElement("section");
    intro.className = "panel panel-highlight";

    const title = document.createElement("h2");
    title.textContent = route.panelTitle || route.label || "Recursos";
    intro.appendChild(title);

    if (route.panelCopy) {
      const copy = document.createElement("p");
      copy.className = "panel-copy";
      copy.textContent = route.panelCopy;
      intro.appendChild(copy);
    }

    const listPanel = document.createElement("section");
    listPanel.className = "panel";

    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "panel-copy";
      empty.textContent = "No hay links cargados para esta seccion todavia.";
      listPanel.appendChild(empty);
    } else {
      const list = document.createElement("div");
      list.className = "link-list";
      filtered.forEach(function (link) {
        list.appendChild(renderLinkCard(link));
      });
      listPanel.appendChild(list);
    }

    main.innerHTML = "";
    main.appendChild(intro);
    main.appendChild(listPanel);
  }

  function renderRedirectView() {
    const main = document.getElementById("app-main");
    if (!main) return;

    const panel = document.createElement("section");
    panel.className = "panel panel-highlight redirect-panel";

    panel.innerHTML =
      "<h1>Te estamos redirigiendo al formulario</h1>" +
      '<p class="panel-copy">Si no abre automaticamente, usa el boton de abajo.</p>';

    const manual = document.createElement("a");
    manual.className = "cta-button";
    manual.textContent = "Abrir formulario";

    const validConsultUrl = !isPlaceholder(config.consultationFormUrl);
    if (validConsultUrl) {
      const targetUrl = withUtm(config.consultationFormUrl, {
        utm_campaign: "consultas",
        utm_content: "redirect_route"
      });

      manual.href = targetUrl;
      manual.target = "_blank";
      manual.rel = "noopener noreferrer";

      window.setTimeout(function () {
        window.location.replace(targetUrl);
      }, 120);
    } else {
      manual.href = "/";
      manual.dataset.route = "/";
    }

    const wrapper = document.createElement("p");
    wrapper.appendChild(manual);

    panel.appendChild(wrapper);

    main.innerHTML = "";
    main.appendChild(panel);
  }

  function renderRoute(path) {
    const route = getRoute(path);
    const main = document.getElementById("app-main");
    if (!main) return;

    state.currentPath = route.path;
    updateNav(route.path);
    document.title = route.title;

    trackEvent("view_route", {
      route: route.path
    });

    if (route.view === "redirect") {
      clearPromoAutoplay();
      renderRedirectView();
      main.classList.remove("content-switching");
      main.classList.add("content-ready");
      return;
    }

    if (route.view !== "home") {
      clearPromoAutoplay();
    }

    const token = ++state.renderToken;
    renderSkeleton();

    if (route.view === "kiosk") {
      renderKioskView(route)
        .then(function () {
          if (token !== state.renderToken) return;
          main.classList.remove("content-switching");
          main.classList.add("content-ready");
        })
        .catch(function () {
          if (token !== state.renderToken) return;
          main.innerHTML =
            '<section class="panel panel-highlight"><h2>Error al cargar Mesita en Electro</h2><p class="panel-copy">Intenta nuevamente en unos minutos.</p></section>';
          main.classList.remove("content-switching");
          main.classList.add("content-ready");
        });
      return;
    }

    loadLinks().then(function (allLinks) {
      if (token !== state.renderToken) return;

      const renderTask =
        route.view === "home" ? renderHome(allLinks) : Promise.resolve(renderListView(route, allLinks));

      Promise.resolve(renderTask)
        .then(function () {
          if (token !== state.renderToken) return;
          main.classList.remove("content-switching");
          main.classList.add("content-ready");
        })
        .catch(function () {
          if (token !== state.renderToken) return;
          main.innerHTML =
            '<section class="panel panel-highlight"><h2>Error de carga</h2><p class="panel-copy">No se pudieron mostrar los recursos.</p></section>';
          main.classList.remove("content-switching");
          main.classList.add("content-ready");
        });
    });
  }

  function navigateTo(path, replace) {
    const targetRoute = getRoute(path);
    const targetPath = targetRoute.path;

    if (targetPath === state.currentPath) return;

    const main = document.getElementById("app-main");
    if (main) {
      main.classList.add("content-switching");
    }

    if (replace) {
      window.history.replaceState({ path: targetPath }, "", targetPath);
    } else {
      window.history.pushState({ path: targetPath }, "", targetPath);
    }

    renderRoute(targetPath);
  }

  function getInternalRouteFromAnchor(anchor) {
    const forced = anchor.dataset.route;
    if (forced && routesByPath.has(normalizePath(forced))) {
      return normalizePath(forced);
    }

    const href = anchor.getAttribute("href") || "";
    if (!href || href.startsWith("#")) return null;

    let parsed;
    try {
      parsed = new URL(href, window.location.origin);
    } catch (_error) {
      return null;
    }

    if (parsed.origin !== window.location.origin) return null;

    const normalized = normalizePath(parsed.pathname);
    if (!routesByPath.has(normalized)) return null;

    return normalized;
  }

  function bindRouter() {
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target.closest("a[href]");
      if (!anchor) return;

      if (anchor.hasAttribute("download")) return;
      if (anchor.getAttribute("target") && anchor.getAttribute("target") !== "_self") return;

      const internalRoute = getInternalRouteFromAnchor(anchor);
      if (!internalRoute) return;

      event.preventDefault();
      navigateTo(internalRoute, false);
    });

    window.addEventListener("popstate", function () {
      renderRoute(normalizePath(window.location.pathname));
    });
  }

  function boot() {
    loadAnalytics();
    hydrateBranding();
    mountContactHub();
    bindRouter();
    animateShell();

    const startupPath = getStartupPath();
    state.currentPath = startupPath;

    renderRoute(startupPath);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
