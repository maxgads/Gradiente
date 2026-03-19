(function () {
  "use strict";

  const page = document.body.dataset.page || "home";
  const config = window.LINKHUB_CONFIG || {};
  const categoryOrder = [
    "Ingresantes",
    "Consultas frecuentes",
    "Parciales y apuntes",
    "Oportunidades",
    "Mapa Facultad",
    "Institucional",
    "Contacto"
  ];

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
        page_path: window.location.pathname
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

  function normalizeLink(rawLink) {
    const normalized = Object.assign({}, rawLink);
    normalized.title = String(rawLink.title || "Sin título");
    normalized.url = String(rawLink.url || "#");
    normalized.category = String(rawLink.category || "General");
    normalized.audience = normalizeAudience(rawLink.audience);
    normalized.tags = normalizeTags(rawLink.tags);
    normalized.priority = Number.isFinite(rawLink.priority)
      ? rawLink.priority
      : Number(rawLink.priority) || 999;
    normalized.active = rawLink.active !== false;
    return normalized;
  }

  function sortByPriority(links) {
    return links.sort(function (a, b) {
      if (a.priority === b.priority) {
        return a.title.localeCompare(b.title, "es");
      }
      return a.priority - b.priority;
    });
  }

  function isCursadaLink(link) {
    return link.category.toLowerCase() === "consultas frecuentes";
  }

  function isIngresanteLink(link) {
    const audience = link.audience.map(function (entry) {
      return entry.toLowerCase();
    });
    const category = link.category.toLowerCase();

    return audience.includes("ingresantes") || category.includes("ingresantes");
  }

  function isMapaLink(link) {
    const category = link.category.toLowerCase();
    const tags = link.tags.map(function (tag) {
      return tag.toLowerCase();
    });

    return category.includes("mapa") || tags.includes("mapa") || tags.includes("campus");
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
      list.appendChild(renderLink(link));
    });

    section.appendChild(list);
    return section;
  }

  function renderLink(link) {
    const anchor = document.createElement("a");
    anchor.className = "link-card";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";

    const safeTitle = slugify(link.title) || "recurso";
    anchor.href = withUtm(link.url, {
      utm_content: safeTitle
    });

    const title = document.createElement("span");
    title.className = "link-title";
    title.textContent = link.title;

    anchor.appendChild(title);

    if (link.tags.length) {
      const tags = document.createElement("span");
      tags.className = "link-tags";
      tags.textContent = link.tags.join(" · ");
      anchor.appendChild(tags);
    }

    anchor.addEventListener("click", function () {
      trackEvent("click_link", {
        link_title: link.title,
        link_category: link.category
      });
    });

    return anchor;
  }

  function renderHome(links) {
    const target = document.getElementById("category-sections");
    if (!target) return;

    const grouped = links.reduce(function (acc, link) {
      if (!acc[link.category]) acc[link.category] = [];
      acc[link.category].push(link);
      return acc;
    }, {});

    const orderedCategories = categoryOrder
      .filter(function (category) {
        return grouped[category] && grouped[category].length;
      })
      .concat(
        Object.keys(grouped).filter(function (category) {
          return !categoryOrder.includes(category);
        })
      );

    orderedCategories.forEach(function (categoryName) {
      const categoryLinks = sortByPriority(grouped[categoryName]);
      target.appendChild(createSection(categoryName, categoryLinks));
    });
  }

  function renderFiltered(links) {
    const target = document.getElementById("filtered-links");
    if (!target) return;

    if (!links.length) {
      const empty = document.createElement("p");
      empty.className = "panel-copy";
      empty.textContent = "No hay links cargados para esta sección todavía.";
      target.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "link-list";
    sortByPriority(links).forEach(function (link) {
      list.appendChild(renderLink(link));
    });
    target.appendChild(list);
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
      backgroundWatermark.classList.remove("hidden");
    }
  }

  function mountContactHub() {
    const slot = document.getElementById("top-cta-slot");
    if (!slot) return;

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
        const link = document.createElement("a");
        link.className = "contact-channel";
        link.href = social.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", social.label);

        const icon = getSocialIcon(social.label);
        if (icon) {
          link.innerHTML = icon + '<span class="sr-only">' + social.label + "</span>";
        } else {
          link.textContent = social.short || social.label;
        }

        link.addEventListener("click", function () {
          trackEvent("click_contact_channel", {
            channel: social.label
          });
        });

        channels.appendChild(link);
      });
    }

    wrapper.appendChild(cta);
    wrapper.appendChild(channels);
    slot.appendChild(wrapper);
  }

  function animateEntrance() {
    const items = document.querySelectorAll(".profile, .top-cta, .route-nav, main .panel");
    items.forEach(function (item, index) {
      item.classList.add("reveal-item");
      window.setTimeout(function () {
        item.classList.add("is-visible");
      }, 70 + index * 70);
    });
  }

  function redirectConsultas() {
    const manualLink = document.getElementById("manual-consult-link");
    const validConsultUrl = !isPlaceholder(config.consultationFormUrl);

    if (!validConsultUrl) {
      if (manualLink) {
        manualLink.href = "/";
        manualLink.textContent = "Configurar URL de formulario y volver";
      }
      return;
    }

    const targetUrl = withUtm(config.consultationFormUrl, {
      utm_campaign: "consultas",
      utm_content: "redirect_route"
    });

    if (manualLink) {
      manualLink.href = targetUrl;
      manualLink.target = "_blank";
      manualLink.rel = "noopener noreferrer";
    }

    trackEvent("redirect_consultas", {
      destination: "google_form"
    });

    window.setTimeout(function () {
      window.location.replace(targetUrl);
    }, 250);
  }

  function loadLinks() {
    return fetch("/links.json", {
      cache: "no-store"
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("No se pudo leer links.json");
        }
        return response.json();
      })
      .then(function (payload) {
        if (!Array.isArray(payload)) {
          throw new Error("Formato inválido en links.json");
        }
        return payload.map(normalizeLink).filter(function (link) {
          return link.active;
        });
      })
      .catch(function (error) {
        console.error(error);
        return [];
      });
  }

  function boot() {
    loadAnalytics();
    hydrateBranding();
    mountContactHub();
    animateEntrance();

    if (page === "consultas") {
      redirectConsultas();
      return;
    }

    loadLinks().then(function (allLinks) {
      if (page === "home") {
        renderHome(allLinks);
        return;
      }

      if (page === "parciales") {
        renderFiltered(allLinks.filter(isCursadaLink));
        return;
      }

      if (page === "ingresantes") {
        renderFiltered(allLinks.filter(isIngresanteLink));
        return;
      }

      if (page === "mapa") {
        renderFiltered(allLinks.filter(isMapaLink));
      }
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
