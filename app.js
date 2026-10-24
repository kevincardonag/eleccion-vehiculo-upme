(function () {
  const STORAGE_KEY = "eleccion_vehiculo_upme_cali_v4";
  const PREV_KEYS = ["eleccion_vehiculo_upme_cali_v3", "eleccion_vehiculo_upme_cali_v2"];

  // Concesionarios sugeridos por marca en Cali
  const CALI_DEALERS_BY_BRAND = {
    Toyota: "Autotropical / Yoko Motor (Cali)",
    Hyundai: "Autama / Almotores Hyundai (Cali)",
    Ford: "Motovalle / El Roble Motor (Cali)",
    Kia: "Almotores / Autama Kia (Cali)",
    Subaru: "Automotora Dorautos (Cali)",
    Nissan: "Dinissan (Av. Pasoancho / Norte / Sur)",
    Renault: "Caribe Motor / Farallones (Cali)",
    BYD: "Motorysa BYD (Cali)",
    Cupra: "Automotora / Los Coches Cupra (Cali)",
    Honda: "Fanalca Honda (Cali)",
    Mazda: "ipsc / Mazko / Automotora (Cali)",
    Suzuki: "Derco Center Suzuki (Cali)"
  };

  let vehicles = [];
  let currentStep = 1;
  let selectedHybridIndex = 0;
  let selectedMiniTopic = 0;
  let activeRound = "IDEAL_130_150";
  let viewMode = "GRID"; // 'GRID' | 'CAROUSEL'
  let carouselIndex = 0;
  let brandsCollapsed = false;
  let compSelection = ["hyundai-kona-hev", "ford-territory-hev", "kia-sportage-hev"];

  function formatCop(value) {
    if (!value && value !== 0) return "—";
    return "$" + Number(value).toLocaleString("es-CO");
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  function getSuggestedCaliDealer(brand) {
    return CALI_DEALERS_BY_BRAND[brand] || "Concesionario en Cali";
  }

  // Generate clean SVG fallback image if external image ever fails
  function getSvgFallbackDataUri(v) {
    const bg1 = v.upmeApplies ? "#0f766e" : "#be123c";
    const bg2 = v.upmeApplies ? "#1e1b4b" : "#881337";
    const title = `${v.brand} ${v.model}`.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const sub = (v.techLabel || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bg1}"/>
          <stop offset="100%" stop-color="${bg2}"/>
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#g)"/>
      <g fill="rgba(255,255,255,0.12)" transform="translate(230, 105) scale(3.4)">
        <path d="M18 38h64l10 16v20H8V54l10-16zm6 6l-6 10h64l-6-10H24zm-4 28a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm60 0a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/>
      </g>
      <text x="400" y="340" text-anchor="middle" fill="#ffffff" font-family="Inter, sans-serif" font-size="32" font-weight="800">${title}</text>
      <text x="400" y="380" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Inter, sans-serif" font-size="20" font-weight="600">${sub}</text>
    </svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  window.handleCarImgError = function (imgEl, vehicleId) {
    if (!imgEl) return;
    const v = vehicles.find((item) => item.id === vehicleId);
    if (!v) return;

    if (!imgEl.dataset.triedWiki && v.wikiTitle) {
      imgEl.dataset.triedWiki = "1";
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(v.wikiTitle)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.thumbnail && data.thumbnail.source) {
            imgEl.src = data.thumbnail.source;
          } else {
            imgEl.src = getSvgFallbackDataUri(v);
          }
        })
        .catch(() => {
          imgEl.src = getSvgFallbackDataUri(v);
        });
      return;
    }

    imgEl.onerror = null;
    imgEl.src = getSvgFallbackDataUri(v);
  };

  window.promptChangePhoto = function (vehicleId) {
    const v = vehicles.find((item) => item.id === vehicleId);
    if (!v) return;
    const nextUrl = prompt(
      `Pega la dirección (URL) de la foto que quieras usar para ${v.brand} ${v.model}:`,
      v.imageUrl || ""
    );
    if (nextUrl && nextUrl.trim()) {
      v.imageUrl = nextUrl.trim();
      saveState();
      renderBrandDirectory();
      renderCandidatesStep();
      if (currentStep === 6) renderPodiumAndComparator();
      showToast("📷 Foto actualizada");
    }
  };

  function loadState() {
    const base = JSON.parse(JSON.stringify(window.INITIAL_VEHICLES)).map((car) => ({
      ...car,
      dealerVisited: Boolean(car.dealerVisited),
      testDriveDone: Boolean(car.testDriveDone),
      dealerName: car.dealerName || "",
      advisorContact: car.advisorContact || ""
    }));

    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        for (const k of PREV_KEYS) {
          if (localStorage.getItem(k)) {
            raw = localStorage.getItem(k);
            break;
          }
        }
      }
      if (raw) {
        const savedList = JSON.parse(raw);
        if (Array.isArray(savedList) && savedList.length > 0) {
          const merged = base.map((initCar) => {
            const found = savedList.find((s) => s.id === initCar.id);
            if (!found) return initCar;
            return {
              ...initCar,
              imageUrl: found.imageUrl || initCar.imageUrl,
              initialLikes: Array.isArray(found.initialLikes) ? found.initialLikes : initCar.initialLikes,
              initialDislikes: Array.isArray(found.initialDislikes) ? found.initialDislikes : initCar.initialDislikes,
              ratingHusband: found.ratingHusband ?? initCar.ratingHusband,
              ratingWife: found.ratingWife ?? initCar.ratingWife,
              dealerNotes: found.dealerNotes ?? initCar.dealerNotes,
              quotedPrice: found.quotedPrice ?? initCar.quotedPrice,
              dealerVisited: Boolean(found.dealerVisited),
              testDriveDone: Boolean(found.testDriveDone),
              dealerName: found.dealerName || "",
              advisorContact: found.advisorContact || ""
            };
          });
          const customCars = savedList.filter((s) => String(s.id).startsWith("custom-"));
          vehicles = [...customCars, ...merged];
          return;
        }
      }
    } catch (e) {
      console.warn("No se pudo leer localStorage:", e);
    }
    vehicles = base;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
    } catch (e) {
      console.warn("No se pudo guardar en localStorage:", e);
    }
    updateRoundCounts();
    updateVisitsSummaryBanner();
  }

  function getCoupleScore(v) {
    const h = Number(v.ratingHusband || 0);
    const w = Number(v.ratingWife || 0);
    return Number(((h + w) / 2).toFixed(1));
  }

  function getCategoryBadge(v) {
    if (v.category === "HEV") return `<span class="badge badge-success">🔋 ${v.techLabel}</span>`;
    if (v.category === "EPOWER") return `<span class="badge badge-info">🚀 ${v.techLabel}</span>`;
    if (v.category === "PHEV") return `<span class="badge badge-purple">🔌 ${v.techLabel}</span>`;
    return `<span class="badge badge-danger">⚠️ ${v.techLabel}</span>`;
  }

  function getUpmeBadge(v) {
    if (v.upmeApplies) {
      return `<span class="badge badge-success" title="${v.upmeDetail}">🏛️ UPME: SÍ Aplica</span>`;
    }
    return `<span class="badge badge-danger" title="${v.upmeDetail}">🏛️ UPME: NO Aplica</span>`;
  }

  function getBudgetBadge(v) {
    if (v.budgetTier === "IDEAL_130_150") {
      return `<span class="badge badge-success">${v.budgetLabel}</span>`;
    }
    if (v.budgetTier === "STRETCH_150_170") {
      return `<span class="badge" style="background:#fffbeb; color:#b45309; border:1px solid #fde68a;">${v.budgetLabel}</span>`;
    }
    if (v.budgetTier === "OVER_170_REF") {
      return `<span class="badge badge-purple">${v.budgetLabel}</span>`;
    }
    return `<span class="badge badge-danger">${v.budgetLabel}</span>`;
  }

  // ==================== VISITS SUMMARY & MODAL ====================
  function updateVisitsSummaryBanner() {
    const visitedCount = vehicles.filter((v) => v.dealerVisited).length;
    const testDriveCount = vehicles.filter((v) => v.testDriveDone).length;
    const targetPool = vehicles.filter((v) => v.upmeApplies && v.budgetTier !== "OVER_170_REF").length;

    const headerBadge = document.getElementById("headerVisitedBadge");
    if (headerBadge) headerBadge.textContent = visitedCount;

    const titleEl = document.getElementById("visitsProgressTitle");
    const subEl = document.getElementById("visitsProgressSub");
    if (titleEl) {
      titleEl.textContent = `Ruta de Concesionarios en Cali: ${visitedCount} de ${targetPool} candidatas visitadas (${testDriveCount} manejadas 🏁)`;
    }
    if (subEl) {
      if (visitedCount === 0) {
        subEl.textContent = "Toca '📍 Visitar' en cualquier marca o ficha cuando vayan al concesionario.";
      } else {
        const names = vehicles
          .filter((v) => v.dealerVisited)
          .map((v) => `${v.brand} ${v.model.split(" ")[0]}`)
          .join(", ");
        subEl.textContent = `✅ Ya fuimos a ver: ${names}`;
      }
    }
  }

  window.toggleVisited = function (vehicleId, event) {
    if (event) event.stopPropagation();
    const v = vehicles.find((item) => item.id === vehicleId);
    if (!v) return;
    v.dealerVisited = !v.dealerVisited;
    if (v.dealerVisited && !v.dealerName) {
      v.dealerName = getSuggestedCaliDealer(v.brand);
    }
    saveState();
    renderBrandDirectory();
    renderCandidatesStep();
    renderVisitsModalList();
    if (currentStep === 6) renderPodiumAndComparator();
    showToast(
      v.dealerVisited
        ? `📍 ¡Marcada ${v.brand} ${v.model} como visitada en concesionario!`
        : `⏳ ${v.brand} ${v.model} marcada como pendiente de visita`
    );
  };

  window.toggleTestDrive = function (vehicleId, event) {
    if (event) event.stopPropagation();
    const v = vehicles.find((item) => item.id === vehicleId);
    if (!v) return;
    v.testDriveDone = !v.testDriveDone;
    if (v.testDriveDone && !v.dealerVisited) {
      v.dealerVisited = true;
      if (!v.dealerName) v.dealerName = getSuggestedCaliDealer(v.brand);
    }
    saveState();
    renderBrandDirectory();
    renderCandidatesStep();
    renderVisitsModalList();
    if (currentStep === 6) renderPodiumAndComparator();
    showToast(
      v.testDriveDone
        ? `🏁 ¡Test Drive registrado para ${v.brand} ${v.model}!`
        : `Test Drive desmarcado para ${v.brand} ${v.model}`
    );
  };

  window.openVisitsModal = function () {
    renderVisitsModalList();
    document.getElementById("visitsLogModal").classList.add("open");
  };

  window.closeVisitsModal = function () {
    document.getElementById("visitsLogModal").classList.remove("open");
  };

  function renderVisitsModalList() {
    const container = document.getElementById("visitsModalListContainer");
    if (!container) return;

    const list = vehicles.filter((v) => v.upmeApplies);
    container.innerHTML = list
      .map((v) => {
        const imgSrc = v.imageUrl || getSvgFallbackDataUri(v);
        const suggestedDealer = getSuggestedCaliDealer(v.brand);
        return `
          <div style="background:${v.dealerVisited ? "#f0fdf4" : "#f8fafc"}; border:1px solid ${v.dealerVisited ? "#86efac" : "var(--border)"}; border-radius:14px; padding:0.9rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem;">
              <div style="display:flex; align-items:center; gap:0.65rem; cursor:pointer;" onclick="window.closeVisitsModal(); window.goToStep(5); window.selectCarFromBrand('${v.id}');">
                <img src="${imgSrc}" alt="${v.model}" style="width:54px; height:38px; border-radius:8px; object-fit:cover;" onerror="window.handleCarImgError(this, '${v.id}')" />
                <div>
                  <strong style="font-size:0.95rem; display:block;">${v.brand} ${v.model}</strong>
                  <span style="font-size:0.76rem; color:var(--text-muted);">🏢 ${v.dealerName || suggestedDealer} • ${formatCop(v.priceCop)}</span>
                </div>
              </div>
              <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                <button type="button" class="btn btn-sm ${v.dealerVisited ? "btn-primary" : "btn-outline"}" onclick="window.toggleVisited('${v.id}', event)">
                  ${v.dealerVisited ? "✅ Visitada" : "📍 Marcar Visitada"}
                </button>
                <button type="button" class="btn btn-sm ${v.testDriveDone ? "btn-accent" : "btn-outline"}" onclick="window.toggleTestDrive('${v.id}', event)">
                  ${v.testDriveDone ? "🏁 Manejada" : "🛞 Test Drive"}
                </button>
              </div>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap:0.5rem; margin-top:0.65rem;">
              <input type="text" class="input-field" style="font-size:0.8rem; padding:0.4rem 0.6rem;" value="${v.dealerName || ""}" placeholder="Sede: ${suggestedDealer}" onchange="window.updateField('${v.id}', 'dealerName', this.value)" />
              <input type="text" class="input-field" style="font-size:0.8rem; padding:0.4rem 0.6rem;" value="${v.advisorContact || ""}" placeholder="Asesor / WhatsApp" onchange="window.updateField('${v.id}', 'advisorContact', this.value)" />
              <input type="text" class="input-field" style="font-size:0.8rem; padding:0.4rem 0.6rem;" value="${v.quotedPrice || ""}" placeholder="Precio cotizado / Bono" onchange="window.updateField('${v.id}', 'quotedPrice', this.value)" />
            </div>
          </div>
        `;
      })
      .join("");
  }

  // ==================== NAVIGATION BETWEEN THE 6 STEPS ====================
  window.goToStep = function (stepNumber) {
    currentStep = stepNumber;
    const pct = Math.round((stepNumber / 6) * 100);
    const bar = document.getElementById("progressBarFill");
    if (bar) bar.style.width = pct + "%";

    document.querySelectorAll(".step-pill").forEach((pill) => {
      const s = Number(pill.getAttribute("data-step"));
      pill.classList.remove("active", "completed");
      if (s === stepNumber) {
        pill.classList.add("active");
        if (typeof pill.scrollIntoView === "function") {
          pill.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      } else if (s < stepNumber) {
        pill.classList.add("completed");
      }
    });

    document.querySelectorAll(".step-screen").forEach((sec) => {
      sec.classList.toggle("active", sec.id === `step-${stepNumber}`);
    });

    if (stepNumber === 5) {
      updateVisitsSummaryBanner();
      renderBrandDirectory();
      renderCandidatesStep();
    }
    if (stepNumber === 6) {
      syncTop3ToComparator();
      renderPodiumAndComparator();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.openBrandDirectory = function () {
    brandsCollapsed = false;
    window.goToStep(5);
    const grid = document.getElementById("brandDirectoryGrid");
    const btn = document.getElementById("btnToggleBrands");
    if (grid) grid.classList.remove("collapsed");
    if (btn) btn.textContent = "Ocultar marcas ▲";
  };

  window.toggleBrandDirectory = function () {
    brandsCollapsed = !brandsCollapsed;
    const grid = document.getElementById("brandDirectoryGrid");
    const btn = document.getElementById("btnToggleBrands");
    if (grid) grid.classList.toggle("collapsed", brandsCollapsed);
    if (btn) btn.textContent = brandsCollapsed ? "Ver todas las marcas ▼" : "Ocultar marcas ▲";
  };

  // ==================== BRAND DIRECTORY (¿QUÉ APLICA EN CADA MARCA + CHECK VISITA?) ====================
  function renderBrandDirectory() {
    const grid = document.getElementById("brandDirectoryGrid");
    if (!grid) return;

    const brandGroups = [];
    const map = new Map();

    vehicles.forEach((v) => {
      if (!map.has(v.brand)) {
        const group = {
          brand: v.brand,
          upmeAny: v.upmeApplies,
          models: []
        };
        map.set(v.brand, group);
        brandGroups.push(group);
      }
      const g = map.get(v.brand);
      if (v.upmeApplies) g.upmeAny = true;
      g.models.push(v);
    });

    const currentList = getVehiclesForActiveRound();
    const activeCarId = currentList[carouselIndex] ? currentList[carouselIndex].id : "";

    grid.innerHTML = brandGroups
      .map((g) => {
        const discardedClass = !g.upmeAny ? "brand-discarded" : "";
        const statusBadge = g.upmeAny
          ? `<span class="badge badge-success" style="font-size:0.68rem; padding:0.15rem 0.5rem;">✅ Sí UPME</span>`
          : `<span class="badge badge-danger" style="font-size:0.68rem; padding:0.15rem 0.5rem;">❌ No UPME</span>`;

        const modelsHtml = g.models
          .map((m) => {
            const isSelected = m.id === activeCarId ? "active-car" : "";
            const imgSrc = m.imageUrl || getSvgFallbackDataUri(m);
            const shortPrice = "$" + Math.round(m.priceCop / 1000000) + "M";
            const tierIcon =
              m.budgetTier === "IDEAL_130_150"
                ? "🟢"
                : m.budgetTier === "STRETCH_150_170"
                ? "🟡"
                : m.budgetTier === "OVER_170_REF"
                ? "🟠"
                : "❌";

            return `
              <div class="brand-model-row">
                <button type="button" class="brand-model-btn ${isSelected}" onclick="window.selectCarFromBrand('${m.id}')" title="Ver ficha de ${m.brand} ${m.model}">
                  <img src="${imgSrc}" alt="${m.brand} ${m.model}" class="brand-model-thumb" onerror="window.handleCarImgError(this, '${m.id}')" />
                  <div class="brand-model-info">
                    <span class="brand-model-title">${m.model}</span>
                    <span class="brand-model-sub">${tierIcon} ${shortPrice} ${m.dealerVisited ? "• 📍 Visitada" : ""}</span>
                  </div>
                </button>
                <button type="button" class="visit-quick-check ${m.dealerVisited ? "visited-yes" : ""}" onclick="window.toggleVisited('${m.id}', event)" title="${m.dealerVisited ? "Ya visitamos este concesionario (clic para desmarcar)" : "Marcar que ya fuimos a verla al concesionario"}">
                  ${m.dealerVisited ? "✅" : "📍"}
                </button>
              </div>
            `;
          })
          .join("");

        return `
          <div class="brand-dir-card ${discardedClass}">
            <div class="brand-dir-top">
              <span class="brand-dir-name">🏷️ ${g.brand}</span>
              ${statusBadge}
            </div>
            <div style="font-size:0.7rem; color:var(--text-light); margin-bottom:0.15rem;">
              🏢 ${getSuggestedCaliDealer(g.brand)}
            </div>
            <div style="display:flex; flex-direction:column; gap:0.35rem;">
              ${modelsHtml}
            </div>
          </div>
        `;
      })
      .join("");
  }

  window.selectCarFromBrand = function (vehicleId) {
    const v = vehicles.find((item) => item.id === vehicleId);
    if (!v) return;

    if (v.category === "MHEV_DESCARTADO") {
      activeRound = "MHEV_DESCARTADO";
    } else {
      activeRound = v.budgetTier || "ALL";
    }

    document.querySelectorAll("#roundFilterPills .round-pill").forEach((p) => {
      p.classList.toggle("active", p.getAttribute("data-round") === activeRound);
    });

    const list = getVehiclesForActiveRound();
    const idx = list.findIndex((item) => item.id === vehicleId);
    carouselIndex = idx >= 0 ? idx : 0;

    viewMode = "CAROUSEL";
    document.getElementById("btnModeCarousel").classList.add("active");
    document.getElementById("btnModeGrid").classList.remove("active");
    document.getElementById("carouselViewContainer").style.display = "block";
    document.getElementById("gridViewContainer").style.display = "none";

    renderBrandDirectory();
    renderCandidatesStep();

    const anchor = document.getElementById("carouselViewContainer");
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    showToast(`🚘 Viendo ${v.brand} ${v.model}`);
  };

  // ==================== PASO 2: INTERACTIVE 1-BY-1 HYBRID EXPLORER ====================
  const ENERGY_FLOW_DIAGRAMS = {
    MHEV: "⛽ Motor Gasolina (Hace todo el trabajo) + 🔋 Batería pequeña 12V/48V (Solo apoya luces/arranque) ➔ 🛞 Ruedas",
    HEV: "⛽ Motor Gasolina + ⚡ Motor Eléctrico (Se turnan o unen fuerzas solos; se recarga al frenar) ➔ 🛞 Ruedas",
    "e-POWER": "⛽ Gasolina ➔ ⚙️ Generador Eléctrico ➔ ⚡ Motor 100% Eléctrico (Siempre mueve la camioneta) ➔ 🛞 Ruedas",
    PHEV: "🔌 Enchufe en Casa (85 km sin gasolina) + ⛽ Motor Gasolina (Para viajes largos) ➔ 🛞 Ruedas"
  };

  window.selectHybridType = function (index) {
    selectedHybridIndex = index;
    renderHybridStep();
  };

  function renderHybridStep() {
    const guides = window.EDUCATIONAL_GUIDES;
    if (!guides) return;
    const list = guides.hybridTypes;
    const item = list[selectedHybridIndex] || list[0];

    const tabsEl = document.getElementById("hybridSelectorTabs");
    if (tabsEl) {
      tabsEl.innerHTML = list
        .map((h, i) => {
          const isAct = i === selectedHybridIndex ? "active" : "";
          const statusIcon = h.code === "MHEV" ? "❌" : "✅";
          return `
            <button class="sub-tab-btn ${isAct}" onclick="window.selectHybridType(${i})">
              <span>${i + 1}. ${h.icon} ${h.code}</span>
              <span style="font-size:0.76rem; opacity:0.9;">(${statusIcon} UPME)</span>
            </button>
          `;
        })
        .join("");
    }

    const spotEl = document.getElementById("hybridSpotlightContainer");
    if (spotEl) {
      const borderTopColor =
        item.code === "MHEV"
          ? "var(--danger)"
          : item.code === "HEV"
          ? "var(--success)"
          : item.code === "e-POWER"
          ? "var(--info)"
          : "var(--purple)";

      spotEl.innerHTML = `
        <article class="spotlight-card" style="border-top: 6px solid ${borderTopColor};">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem;">
            <div>
              <span style="font-size:0.76rem; font-weight:800; color:var(--text-light); text-transform:uppercase;">
                Tecnología ${selectedHybridIndex + 1} de ${list.length}
              </span>
              <h3 style="font-size:1.45rem; font-weight:800; margin-top:0.15rem;">
                ${item.icon} ${item.name}
              </h3>
              <p style="color:var(--text-muted); font-weight:600; font-size:0.92rem;">${item.subtitle}</p>
            </div>
            <span class="badge ${item.badgeClass}" style="font-size:0.86rem; padding:0.4rem 0.85rem;">
              ${item.upmeVerdict}
            </span>
          </div>

          <div style="background:var(--bg-subtle); padding:1.05rem 1.2rem; border-radius:14px; font-size:0.96rem; color:var(--text-main);">
            <strong>💡 En palabras sencillas:</strong> ${item.howItWorksSimple}
          </div>

          <div class="energy-flow-diagram">
            🔄 Cómo se mueve: ${ENERGY_FLOW_DIAGRAMS[item.code] || ""}
          </div>

          <div class="spotlight-metrics">
            <div class="spotlight-metric-box">
              <span class="m-label">🛞 ¿Impulso eléctrico real?</span>
              <span class="m-val">${item.electricDrive}</span>
            </div>
            <div class="spotlight-metric-box">
              <span class="m-label">🔌 ¿Hay que enchufarlo?</span>
              <span class="m-val">${item.plugRequired}</span>
            </div>
            <div class="spotlight-metric-box">
              <span class="m-label">⛽ Ahorro de gasolina</span>
              <span class="m-val" style="color:var(--primary);">${item.fuelSaving}</span>
            </div>
          </div>

          <div style="background:#f8fafc; border:1px solid var(--border); padding:0.85rem 1rem; border-radius:12px; font-size:0.88rem;">
            <strong>🚘 Modelos de nuestra búsqueda en este grupo:</strong>
            <span style="color:var(--text-muted);">${item.examplesInList}</span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-top:1.25rem; padding-top:1rem; border-top:1px solid var(--border);">
            <button class="btn btn-outline btn-sm" ${selectedHybridIndex === 0 ? "disabled style='opacity:0.4;cursor:not-allowed'" : ""} onclick="window.selectHybridType(${selectedHybridIndex - 1})">
              ← Anterior
            </button>
            <span style="font-size:0.8rem; color:var(--text-light); font-weight:600;">
              ${selectedHybridIndex + 1} / ${list.length}
            </span>
            ${
              selectedHybridIndex < list.length - 1
                ? `<button class="btn btn-primary btn-sm" onclick="window.selectHybridType(${selectedHybridIndex + 1})">
                     Siguiente (${list[selectedHybridIndex + 1].code}) →
                   </button>`
                : `<button class="btn btn-accent btn-sm" onclick="window.goToStep(3)">
                     Ir al Paso 3 (UPME y Cali) →
                   </button>`
            }
          </div>
        </article>
      `;
    }
  }

  // ==================== PASO 3: UPME & CALI SIMULATOR ====================
  function setupUpmeSimulator() {
    const toggleBtn = document.getElementById("btnToggleCalculator");
    const calcBox = document.getElementById("calcBoxContainer");
    if (toggleBtn && calcBox) {
      toggleBtn.addEventListener("click", () => {
        const isOpen = calcBox.classList.toggle("open");
        toggleBtn.textContent = isOpen
          ? "✕ Ocultar calculadora de ahorro"
          : "🧮 ¿Quieren simular el ahorro en pesos? (Opcional)";
      });
    }

    const priceInput = document.getElementById("simPriceInput");
    const kmInput = document.getElementById("simKmInput");
    const taxInput = document.getElementById("simTaxRateInput");

    function updateSim() {
      const price = Number(priceInput.value);
      const kmMonth = Number(kmInput.value);
      const taxRate = Number(taxInput.value) / 100;

      document.getElementById("simPriceLabel").textContent = formatCop(price) + " COP";
      document.getElementById("simKmLabel").textContent = kmMonth.toLocaleString("es-CO") + " km / mes";
      document.getElementById("simTaxRateLabel").textContent = Math.round(taxRate * 100) + "%";

      const deductionBase = price * 0.5;
      const estimatedTaxSaved = deductionBase * taxRate;
      const annualVehicleTax = price * 0.01;
      const valleFiveYearSaved = Math.round(annualVehicleTax * 0.6 * 5);

      const kmYear = kmMonth * 12;
      const galNormal = kmYear / 36;
      const galHybrid = kmYear / 68;
      const fuelSavedYear = Math.round((galNormal - galHybrid) * 16000);

      document.getElementById("simDeductionBase").textContent = formatCop(deductionBase);
      document.getElementById("simTaxCashSaved").textContent = formatCop(estimatedTaxSaved);
      document.getElementById("simValleTaxSaved").textContent = formatCop(valleFiveYearSaved);
      document.getElementById("simFuelSaved").textContent = formatCop(fuelSavedYear) + " / año";
    }

    if (priceInput && kmInput && taxInput) {
      priceInput.addEventListener("input", updateSim);
      kmInput.addEventListener("input", updateSim);
      taxInput.addEventListener("input", updateSim);
      updateSim();
    }
  }

  // ==================== PASO 4: MINI-GUÍA (1 TEMA A LA VEZ) ====================
  window.selectMiniGuideTopic = function (idx) {
    selectedMiniTopic = idx;
    const btns = document.querySelectorAll("#miniGuideTabs .sub-tab-btn");
    btns.forEach((b, i) => b.classList.toggle("active", i === idx));
    renderMiniGuideSpotlight();
  };

  function renderMiniGuideSpotlight() {
    const container = document.getElementById("miniGuideSpotlight");
    if (!container) return;

    if (selectedMiniTopic === 0) {
      container.innerHTML = `
        <article class="spotlight-card" style="border-top: 6px solid var(--primary);">
          <span class="badge badge-success" style="margin-bottom:0.6rem;">Concepto 1 de 3 • Subidas y Consumo</span>
          <h3 style="font-size:1.35rem; font-weight:800; margin-bottom:0.6rem;">
            🏔️ Motor Turbo Híbrido vs. Motor Aspirado Híbrido
          </h3>
          <p style="color:var(--text-muted); margin-bottom:1rem; font-size:0.92rem;">
            Todas nuestras candidatas combinan un motor eléctrico con un motor a gasolina, pero el motor a gasolina puede ser <strong>Turbo</strong> o <strong>Aspirado (sin turbo)</strong>:
          </p>
          <div class="pros-cons-columns">
            <div class="pc-box" style="background:#f0f9ff; border:1px solid #bae6fd; padding:1.05rem;">
              <h4 style="color:#0369a1; font-size:0.92rem;">🚀 Híbrido con Motor TURBO (+220 a 240 hp)</h4>
              <p style="font-size:0.86rem; color:#334155; margin-bottom:0.55rem;">
                Tiene muchísima fuerza para subir a <strong>Km 18, Dapa, Lago Calima o La Línea</strong> con 5 personas, maletas y aire acondicionado sin esforzarse.
              </p>
              <div style="font-size:0.78rem; font-weight:700; color:#0284c7;">
                🚘 Modelos: Ford Territory (240 hp), Kia Sportage (231 hp), Hyundai Tucson (230 hp), Renault Koleos (241 hp).
              </div>
            </div>
            <div class="pc-box" style="background:#f0fdf4; border:1px solid #bbf7d0; padding:1.05rem;">
              <h4 style="color:#15803d; font-size:0.92rem;">🌿 Híbrido ASPIRADO (122 a 200 hp)</h4>
              <p style="font-size:0.86rem; color:#334155; margin-bottom:0.55rem;">
                Mecánica más sencilla, ultra confiable y enfocada en lograr el <strong>máximo ahorro de gasolina posible</strong> en el tráfico plano de Cali (~73 a 82 km/galón).
              </p>
              <div style="font-size:0.78rem; font-weight:700; color:#059669;">
                🚘 Modelos: Toyota Corolla Cross (122 hp), Hyundai Kona (139 hp), Ford Escape (200 hp), Subaru Crosstrek (150 hp).
              </div>
            </div>
          </div>
          <div style="text-align:right; margin-top:1.1rem;">
            <button class="btn btn-primary btn-sm" onclick="window.selectMiniGuideTopic(1)">
              Siguiente concepto: Cajas de Cambios →
            </button>
          </div>
        </article>
      `;
    } else if (selectedMiniTopic === 1) {
      container.innerHTML = `
        <article class="spotlight-card" style="border-top: 6px solid var(--accent);">
          <span class="badge badge-info" style="margin-bottom:0.6rem;">Concepto 2 de 3 • Sensación al Manejar</span>
          <h3 style="font-size:1.35rem; font-weight:800; margin-bottom:0.6rem;">
            🕹️ ¿Cómo se siente cada Caja Automática?
          </h3>
          <p style="color:var(--text-muted); margin-bottom:1rem; font-size:0.92rem;">
            Todas son automáticas (ninguna tiene pedal de embrague), pero se sienten distinto al acelerar:
          </p>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:0.85rem;">
            <div class="spotlight-metric-box">
              <span class="m-label" style="color:var(--primary);">1. e-CVT / Continua</span>
              <div class="m-val" style="margin-bottom:0.3rem;">Suavidad total sin tirones</div>
              <p style="font-size:0.82rem; color:var(--text-muted);">
                No tiene cambios de 1ra, 2da o 3ra. En el trancón es una seda; al pisar a fondo en subida mantiene un sonido continuo.
              </p>
              <div style="font-size:0.75rem; font-weight:700; margin-top:0.35rem; color:var(--primary);">Corolla Cross, Escape, Crosstrek</div>
            </div>
            <div class="spotlight-metric-box">
              <span class="m-label" style="color:var(--accent);">2. Automática 6 vel. / DCT</span>
              <div class="m-val" style="margin-bottom:0.3rem;">Sensación natural y ágil</div>
              <p style="font-size:0.82rem; color:var(--text-muted);">
                Hace los cambios de marcha tradicionales (1ra a 6ta). Se siente más viva y deportiva en carretera.
              </p>
              <div style="font-size:0.75rem; font-weight:700; margin-top:0.35rem; color:var(--accent);">Sportage, Tucson, Kona N-Line, Cupra</div>
            </div>
            <div class="spotlight-metric-box">
              <span class="m-label" style="color:var(--info);">3. Eléctrica Directa / DHT</span>
              <div class="m-val" style="margin-bottom:0.3rem;">Empuje eléctrico inmediato</div>
              <p style="font-size:0.82rem; color:var(--text-muted);">
                Respuesta instantánea apenas tocas el acelerador, como en un carro 100% eléctrico.
              </p>
              <div style="font-size:0.75rem; font-weight:700; margin-top:0.35rem; color:var(--info);">X-Trail e-POWER, Territory, Koleos, BYD</div>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:1.1rem;">
            <button class="btn btn-outline btn-sm" onclick="window.selectMiniGuideTopic(0)">← Motor</button>
            <button class="btn btn-primary btn-sm" onclick="window.selectMiniGuideTopic(2)">Siguiente: Seguridad ADAS →</button>
          </div>
        </article>
      `;
    } else {
      const safetyList = window.EDUCATIONAL_GUIDES.safetyGuide;
      container.innerHTML = `
        <article class="spotlight-card" style="border-top: 6px solid var(--purple);">
          <span class="badge badge-purple" style="margin-bottom:0.6rem;">Concepto 3 de 3 • Protección Familiar</span>
          <h3 style="font-size:1.35rem; font-weight:800; margin-bottom:0.6rem;">
            🛡️ ¿Qué es la Seguridad ADAS que traen estas camionetas?
          </h3>
          <p style="color:var(--text-muted); margin-bottom:1rem; font-size:0.92rem;">
            Son sensores, radares y cámaras que vigilan la vía contigo para evitar accidentes con motos, peatones o frenadas bruscas en Cali:
          </p>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:0.85rem;">
            ${safetyList
              .map(
                (s) => `
              <div class="spotlight-metric-box">
                <div style="font-size:1.35rem; margin-bottom:0.2rem;">${s.icon}</div>
                <div class="m-val" style="font-size:0.88rem; margin-bottom:0.2rem;">${s.name}</div>
                <p style="font-size:0.8rem; color:var(--text-muted);">${s.description}</p>
              </div>
            `
              )
              .join("")}
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:1.1rem;">
            <button class="btn btn-outline btn-sm" onclick="window.selectMiniGuideTopic(1)">← Cajas</button>
            <button class="btn btn-accent btn-sm" onclick="window.goToStep(5)">¡Listo! Ir a Ver las Camionetas →</button>
          </div>
        </article>
      `;
    }
  }

  // ==================== PASO 5: CANDIDATES (1-AT-A-TIME CAROUSEL + GRID) ====================
  function getVehiclesForActiveRound() {
    if (activeRound === "ALL") return vehicles;
    if (activeRound === "VISITED_ONLY") return vehicles.filter((v) => v.dealerVisited);
    if (activeRound === "PENDING_VISIT") return vehicles.filter((v) => v.upmeApplies && !v.dealerVisited && v.budgetTier !== "OVER_170_REF");
    if (activeRound === "MHEV_DESCARTADO") return vehicles.filter((v) => v.category === "MHEV_DESCARTADO");
    return vehicles.filter((v) => v.budgetTier === activeRound);
  }

  function updateRoundCounts() {
    const ideal = vehicles.filter((v) => v.budgetTier === "IDEAL_130_150").length;
    const stretch = vehicles.filter((v) => v.budgetTier === "STRETCH_150_170").length;
    const visited = vehicles.filter((v) => v.dealerVisited).length;
    const pending = vehicles.filter((v) => v.upmeApplies && !v.dealerVisited && v.budgetTier !== "OVER_170_REF").length;
    const over = vehicles.filter((v) => v.budgetTier === "OVER_170_REF").length;
    const mhev = vehicles.filter((v) => v.category === "MHEV_DESCARTADO").length;
    const all = vehicles.length;

    document.querySelectorAll("#roundFilterPills .round-pill").forEach((pill) => {
      const r = pill.getAttribute("data-round");
      if (r === "IDEAL_130_150") pill.textContent = `🟢 $130M–$150M (${ideal})`;
      if (r === "STRETCH_150_170") pill.textContent = `🟡 $150M–$170M (${stretch})`;
      if (r === "VISITED_ONLY") pill.textContent = `📍 Ya Visitadas (${visited})`;
      if (r === "PENDING_VISIT") pill.textContent = `⏳ Por Visitar (${pending})`;
      if (r === "OVER_170_REF") pill.textContent = `🟠 Enchufables / >$170M (${over})`;
      if (r === "MHEV_DESCARTADO") pill.textContent = `❌ Descartadas (${mhev})`;
      if (r === "ALL") pill.textContent = `📋 Todas (${all})`;
    });
  }

  window.setViewMode = function (mode) {
    viewMode = mode;
    document.getElementById("btnModeCarousel").classList.toggle("active", mode === "CAROUSEL");
    document.getElementById("btnModeGrid").classList.toggle("active", mode === "GRID");
    document.getElementById("carouselViewContainer").style.display = mode === "CAROUSEL" ? "block" : "none";
    document.getElementById("gridViewContainer").style.display = mode === "GRID" ? "block" : "none";
    renderCandidatesStep();
  };

  window.prevCarouselCar = function () {
    const list = getVehiclesForActiveRound();
    if (list.length === 0) return;
    carouselIndex = (carouselIndex - 1 + list.length) % list.length;
    renderBrandDirectory();
    renderCarouselStage();
  };

  window.nextCarouselCar = function () {
    const list = getVehiclesForActiveRound();
    if (list.length === 0) return;
    carouselIndex = (carouselIndex + 1) % list.length;
    renderBrandDirectory();
    renderCarouselStage();
  };

  window.jumpToCarouselCar = function (idx) {
    carouselIndex = idx;
    renderBrandDirectory();
    renderCarouselStage();
  };

  function renderStars(vehicleId, personKey, currentVal) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
      const filled = i <= currentVal ? "filled" : "";
      html += `<button type="button" class="star-btn ${filled}" onclick="window.setRating('${vehicleId}', '${personKey}', ${i})" title="${i} estrellas">★</button>`;
    }
    return html;
  }

  function renderCandidatesStep() {
    updateRoundCounts();
    if (viewMode === "CAROUSEL") {
      renderCarouselStage();
    } else {
      renderGridStage();
    }
  }

  function renderCarouselStage() {
    const list = getVehiclesForActiveRound();
    const stageEl = document.getElementById("carouselSingleCardStage");
    const counterEl = document.getElementById("carouselCounterLabel");
    const dotsEl = document.getElementById("carouselDotsContainer");

    if (!stageEl) return;

    if (list.length === 0) {
      if (counterEl) counterEl.textContent = "0 camionetas en este filtro";
      if (dotsEl) dotsEl.innerHTML = "";
      stageEl.innerHTML = `
        <div class="carousel-stage-card" style="text-align:center; padding:2.5rem 1.5rem;">
          <div style="font-size:2rem; margin-bottom:0.5rem;">📍</div>
          <h3 style="font-size:1.2rem; font-weight:800;">Aún no hay camionetas en este filtro</h3>
          <p style="font-size:0.9rem; color:var(--text-muted); margin:0.4rem 0 1.2rem;">
            Marca las camionetas que vayan visitando en Cali con el botón <strong>📍 Visitada</strong> o vuelve a la Ronda 1 ($130M–$150M).
          </p>
          <button class="btn btn-primary" onclick="document.querySelector('[data-round=IDEAL_130_150]').click()">
            Ver las 6 de $130M–$150M
          </button>
        </div>
      `;
      return;
    }

    if (carouselIndex >= list.length) carouselIndex = 0;

    const v = list[carouselIndex];
    const avg = getCoupleScore(v);
    const isDiscarded = v.category === "MHEV_DESCARTADO";
    const imgSrc = v.imageUrl || getSvgFallbackDataUri(v);
    const suggestedDealer = getSuggestedCaliDealer(v.brand);

    if (counterEl) {
      counterEl.textContent = `Viendo camioneta ${carouselIndex + 1} de ${list.length} (${v.brand} ${v.model})`;
    }

    if (dotsEl) {
      dotsEl.innerHTML = list
        .map(
          (car, i) => `
          <button class="carousel-dot ${i === carouselIndex ? "active" : ""}" onclick="window.jumpToCarouselCar(${i})">
            ${car.dealerVisited ? "✅ " : ""}${i + 1}. ${car.brand} ${car.model.split(" ")[0]}
          </button>
        `
        )
        .join("");
    }

    let fordComparisonBanner = "";
    if (v.id === "ford-territory-hev" || v.id === "ford-escape-hev") {
      fordComparisonBanner = `
        <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:0.85rem 1.05rem; border-radius:12px; font-size:0.85rem; color:#1e3a8a;">
          <strong>🔍 Diferencia rápida entre las dos hermanas de Ford ($140M):</strong><br>
          • <strong>Ford Territory Híbrida:</strong> Gana en espacio interior gigante, diseño de pantallas modernas, 240 hp / 545 Nm Turbo y sillas ventiladas (en versión Platinum).<br>
          • <strong>Ford Escape Híbrida:</strong> Gana en ahorro de gasolina (~73 km/gal vs ~63 km/gal), 7 airbags, banca deslizable y mecánica tradicional 2.5L tipo Toyota.
        </div>
      `;
    }

    stageEl.innerHTML = `
      <article class="carousel-stage-card ${isDiscarded ? "discarded-card" : ""}">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.45rem;">
          <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
            ${getBudgetBadge(v)}
            ${getCategoryBadge(v)}
            ${getUpmeBadge(v)}
            ${v.dealerVisited ? `<span class="badge badge-success">📍 Visitada en Cali</span>` : ""}
            ${v.testDriveDone ? `<span class="badge badge-purple">🏁 Ya la manejamos</span>` : ""}
          </div>
          <span style="font-size:0.78rem; color:var(--text-light); font-weight:700;">
            Opción #${carouselIndex + 1} de ${list.length}
          </span>
        </div>

        <!-- FOTO GRANDE DEL VEHÍCULO -->
        <div class="car-photo-banner">
          <img src="${imgSrc}" alt="${v.brand} ${v.model}" onerror="window.handleCarImgError(this, '${v.id}')" />
          <button type="button" class="change-photo-btn" onclick="window.promptChangePhoto('${v.id}')">
            📷 Cambiar foto
          </button>
        </div>

        <div class="stage-top-row">
          <div class="stage-title">
            <span style="font-size:0.78rem; font-weight:800; text-transform:uppercase; color:var(--text-light); letter-spacing:0.05em;">
              ${v.brand} • Concesionario Cali: ${v.dealerName || suggestedDealer}
            </span>
            <h3>${v.model}</h3>
            <p style="color:var(--text-muted); font-size:0.92rem; font-weight:600;">Versión: ${v.trim}</p>
          </div>
          <div class="stage-price">
            <div class="big-price">${formatCop(v.priceCop)}</div>
            <div style="font-size:0.78rem; color:var(--text-light);">${v.priceRange}</div>
          </div>
        </div>

        <!-- REGISTRO DE VISITA A CONCESIONARIO Y TEST DRIVE EN CALI -->
        <div class="visit-tracker-box ${v.dealerVisited ? "visited-active" : ""}">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <strong style="font-size:0.9rem; color:var(--text-main);">
              📍 Bitácora de Visita al Concesionario (${v.brand} en Cali)
            </strong>
            <span style="font-size:0.76rem; color:var(--text-muted);">
              Sede sugerida: <strong>${suggestedDealer}</strong>
            </span>
          </div>

          <div class="visit-toggles-row">
            <button type="button" class="visit-status-btn ${v.dealerVisited ? "active-visited" : ""}" onclick="window.toggleVisited('${v.id}', event)">
              <span>${v.dealerVisited ? "✅" : "📍"}</span>
              <span>${v.dealerVisited ? "¡Ya fuimos al concesionario!" : "Marcar: Ya fuimos a verla"}</span>
            </button>
            <button type="button" class="visit-status-btn ${v.testDriveDone ? "active-testdrive" : ""}" onclick="window.toggleTestDrive('${v.id}', event)">
              <span>${v.testDriveDone ? "🏁" : "🛞"}</span>
              <span>${v.testDriveDone ? "¡Ya hicimos Test Drive!" : "Marcar: Ya hicimos Test Drive"}</span>
            </button>
          </div>

          <div class="dealer-fields-grid">
            <div>
              <label style="font-size:0.74rem; font-weight:700; color:var(--text-muted); display:block;">🏢 Concesionario / Sede en Cali:</label>
              <input type="text" class="input-field" style="width:100%; margin-top:0.2rem;" value="${v.dealerName || ""}" placeholder="Ej. ${suggestedDealer}" onchange="window.updateField('${v.id}', 'dealerName', this.value)" />
            </div>
            <div>
              <label style="font-size:0.74rem; font-weight:700; color:var(--text-muted); display:block;">👤 Asesor y WhatsApp:</label>
              <input type="text" class="input-field" style="width:100%; margin-top:0.2rem;" value="${v.advisorContact || ""}" placeholder="Ej. Carlos - 315 000 0000" onchange="window.updateField('${v.id}', 'advisorContact', this.value)" />
            </div>
            <div>
              <label style="font-size:0.74rem; font-weight:700; color:var(--text-muted); display:block;">💰 Precio Cotizado / Bonos:</label>
              <input type="text" class="input-field" style="width:100%; margin-top:0.2rem;" value="${v.quotedPrice || ""}" placeholder="Ej. $142M + matrícula gratis" onchange="window.updateField('${v.id}', 'quotedPrice', this.value)" />
            </div>
          </div>

          <div>
            <label style="font-size:0.74rem; font-weight:700; color:var(--text-muted); display:block;">📝 Notas de nuestra visita (colores, tiempos de entrega, financiación):</label>
            <input type="text" class="input-field" style="width:100%; margin-top:0.2rem;" value="${v.dealerNotes || ""}" placeholder="Ej. Nos gustó el color gris, entregan en 15 días..." onchange="window.updateField('${v.id}', 'dealerNotes', this.value)" />
          </div>
        </div>

        <!-- Resumen Esposa + Nota Cali -->
        <div class="wife-summary-box">
          <span class="wife-summary-label">💡 Resumen claro para los dos</span>
          ${v.forWifeSummary}
          ${v.caliNote ? `<div style="margin-top:0.55rem; padding-top:0.55rem; border-top:1px dashed #bbf7d0; font-size:0.85rem; color:#0f766e; font-weight:600;">${v.caliNote}</div>` : ""}
        </div>

        ${fordComparisonBanner}

        <!-- Ficha General de 6 bloques claros -->
        <div>
          <h4 style="font-size:0.82rem; font-weight:800; text-transform:uppercase; color:var(--text-light); margin-bottom:0.5rem;">
            📋 Ficha General de un Vistazo
          </h4>
          <div class="specs-mini-grid">
            <div class="spec-mini-item">
              <span class="spec-mini-label">⚡ Potencia y Torque</span>
              <span class="spec-mini-val">${v.specs.horsepower} / ${v.specs.torque}</span>
            </div>
            <div class="spec-mini-item">
              <span class="spec-mini-label">⛽ Consumo Estimado</span>
              <span class="spec-mini-val" style="color:var(--success);">${v.specs.fuelEconomy}</span>
            </div>
            <div class="spec-mini-item">
              <span class="spec-mini-label">🧳 Baúl y Pasajeros</span>
              <span class="spec-mini-val">${v.specs.trunkLiters} Litros (${v.specs.seats} puestos)</span>
            </div>
            <div class="spec-mini-item">
              <span class="spec-mini-label">⚙️ Motor</span>
              <span class="spec-mini-val">${v.specs.engine}</span>
            </div>
            <div class="spec-mini-item">
              <span class="spec-mini-label">🕹️ Caja y Tracción</span>
              <span class="spec-mini-val">${v.specs.transmission.split("(")[0]} • ${v.specs.drivetrain.split("(")[0]}</span>
            </div>
            <div class="spec-mini-item">
              <span class="spec-mini-label">🛡️ Seguridad</span>
              <span class="spec-mini-val">${v.specs.airbags} Airbags • ${v.specs.adasLevel}</span>
            </div>
          </div>
        </div>

        <!-- Calificación en Pareja -->
        <div class="couple-rating-bar">
          <div style="font-weight:800; font-size:0.9rem;">⭐ ¿Cuánto nos gusta esta camioneta?</div>
          <div class="rater-group">
            <span>🙋‍♂️ Él:</span>
            <span>${renderStars(v.id, "ratingHusband", v.ratingHusband)}</span>
          </div>
          <div class="rater-group">
            <span>🙋‍♀️ Ella:</span>
            <span>${renderStars(v.id, "ratingWife", v.ratingWife)}</span>
          </div>
          <span class="couple-avg-badge">💚 Promedio: ${avg} / 5</span>
        </div>

        <!-- Listado Interactivo de lo que nos gusta y no nos gusta -->
        <div class="pros-cons-columns">
          <div class="pc-box pros-box">
            <h4>👍 Cosas que NOS GUSTAN de ${v.model}</h4>
            <div>
              ${v.initialLikes
                .map(
                  (like, i) => `
                  <div class="editable-list-item">
                    <span>✅ ${like}</span>
                    <button class="delete-item-btn" onclick="window.removeProCon('${v.id}', 'likes', ${i})" title="Quitar">✕</button>
                  </div>
                `
                )
                .join("")}
            </div>
            <div class="add-item-row">
              <input type="text" id="inputLike_${v.id}" class="input-field" placeholder="Anotar algo que nos gustó..." onkeydown="if(event.key==='Enter'){window.addProCon('${v.id}', 'likes');}" />
              <button class="btn btn-primary btn-sm" onclick="window.addProCon('${v.id}', 'likes')">+ Agregar</button>
            </div>
          </div>

          <div class="pc-box cons-box">
            <h4>👎 Cosas que NO NOS GUSTAN o Dudas</h4>
            <div>
              ${v.initialDislikes
                .map(
                  (dislike, i) => `
                  <div class="editable-list-item">
                    <span>⚠️ ${dislike}</span>
                    <button class="delete-item-btn" onclick="window.removeProCon('${v.id}', 'dislikes', ${i})" title="Quitar">✕</button>
                  </div>
                `
                )
                .join("")}
            </div>
            <div class="add-item-row">
              <input type="text" id="inputDislike_${v.id}" class="input-field" placeholder="Anotar algo que no nos convenció..." onkeydown="if(event.key==='Enter'){window.addProCon('${v.id}', 'dislikes');}" />
              <button class="btn btn-outline btn-sm" onclick="window.addProCon('${v.id}', 'dislikes')">+ Agregar</button>
            </div>
          </div>
        </div>

        <!-- Botones inferiores de carrusel -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; padding-top:0.5rem;">
          <button class="btn btn-outline btn-sm" style="flex:1;" onclick="window.prevCarouselCar()">
            ← Anterior
          </button>
          <span style="font-size:0.82rem; color:var(--text-muted); font-weight:700; white-space:nowrap;">
            ${carouselIndex + 1} / ${list.length}
          </span>
          <button class="btn btn-primary btn-sm" style="flex:1;" onclick="window.nextCarouselCar()">
            Siguiente →
          </button>
        </div>
      </article>
    `;
  }

  function renderGridStage() {
    const grid = document.getElementById("vehiclesGrid");
    if (!grid) return;
    const list = getVehiclesForActiveRound();

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="carousel-stage-card" style="grid-column: 1 / -1; text-align:center; padding:2.5rem 1.5rem;">
          <div style="font-size:2rem; margin-bottom:0.5rem;">📍</div>
          <h3 style="font-size:1.2rem; font-weight:800;">Aún no hay camionetas en este filtro</h3>
          <p style="font-size:0.9rem; color:var(--text-muted); margin:0.4rem 0 1.2rem;">
            Marca las camionetas que vayan visitando en Cali con el botón <strong>📍 Visitada</strong> o vuelve a la Ronda 1 ($130M–$150M).
          </p>
          <button class="btn btn-primary" onclick="document.querySelector('[data-round=IDEAL_130_150]').click()">
            Ver las 6 de $130M–$150M
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = list
      .map((v, idx) => {
        const avg = getCoupleScore(v);
        const imgSrc = v.imageUrl || getSvgFallbackDataUri(v);
        const suggestedDealer = getSuggestedCaliDealer(v.brand);
        return `
          <article class="vehicle-card-compact">
            <div class="car-photo-grid-thumb" onclick="window.openCarInCarousel(${idx})" style="cursor:pointer;">
              <img src="${imgSrc}" alt="${v.brand} ${v.model}" onerror="window.handleCarImgError(this, '${v.id}')" />
            </div>
            <div style="display:flex; justify-content:space-between; gap:0.4rem; flex-wrap:wrap;">
              ${getBudgetBadge(v)}
              ${getUpmeBadge(v)}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
              <div>
                <div style="font-size:0.75rem; font-weight:700; color:var(--text-light);">${v.brand} • 🏢 ${v.dealerName || suggestedDealer}</div>
                <h3 style="font-size:1.15rem; font-weight:800;">${v.model}</h3>
                <div style="font-size:0.8rem; color:var(--text-muted);">${v.trim}</div>
              </div>
              <div style="font-weight:800; color:var(--primary); font-size:1.05rem; white-space:nowrap;">${formatCop(v.priceCop)}</div>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); background:var(--bg-subtle); padding:0.45rem 0.65rem; border-radius:8px;">
              ⚡ <strong>${v.specs.horsepower}</strong> • ⛽ <strong>${v.specs.fuelEconomy}</strong> • 🧳 ${v.specs.trunkLiters} L
            </div>
            <div style="display:flex; gap:0.4rem;">
              <button type="button" class="btn btn-sm ${v.dealerVisited ? "btn-primary" : "btn-outline"}" style="flex:1;" onclick="window.toggleVisited('${v.id}', event)">
                ${v.dealerVisited ? "✅ Visitada" : "📍 Visitada"}
              </button>
              <button type="button" class="btn btn-sm ${v.testDriveDone ? "btn-accent" : "btn-outline"}" style="flex:1;" onclick="window.toggleTestDrive('${v.id}', event)">
                ${v.testDriveDone ? "🏁 Manejada" : "🛞 Test Drive"}
              </button>
            </div>
            <div class="couple-rating-bar" style="padding:0.5rem 0.75rem;">
              <div class="rater-group"><span>🙋‍♂️</span>${renderStars(v.id, "ratingHusband", v.ratingHusband)}</div>
              <div class="rater-group"><span>🙋‍♀️</span>${renderStars(v.id, "ratingWife", v.ratingWife)}</div>
              <span class="couple-avg-badge">${avg}★</span>
            </div>
            <button class="btn btn-outline btn-sm" onclick="window.openCarInCarousel(${idx})">
              🎴 Abrir ficha completa y notas
            </button>
          </article>
        `;
      })
      .join("");
  }

  window.openCarInCarousel = function (idx) {
    carouselIndex = idx;
    window.setViewMode("CAROUSEL");
    const anchor = document.getElementById("carouselViewContainer");
    if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ==================== PASO 6: PODIUM & SIDE-BY-SIDE COMPARATOR ====================
  function getTop3Favorites() {
    return [...vehicles]
      .filter((v) => v.upmeApplies && v.budgetTier !== "OVER_170_REF")
      .sort((a, b) => {
        const diff = getCoupleScore(b) - getCoupleScore(a);
        if (diff !== 0) return diff;
        return a.priceCop - b.priceCop;
      })
      .slice(0, 3);
  }

  function syncTop3ToComparator() {
    const top3 = getTop3Favorites();
    if (top3.length === 3) {
      compSelection = [top3[0].id, top3[1].id, top3[2].id];
    }
  }

  function renderPodiumAndComparator() {
    const podiumEl = document.getElementById("podiumContainer");
    const top3 = getTop3Favorites();
    const medals = ["🥇 #1 Favorita", "🥈 #2 Favorita", "🥉 #3 Favorita"];

    if (podiumEl) {
      podiumEl.innerHTML = top3
        .map((v, i) => {
          const avg = getCoupleScore(v);
          const imgSrc = v.imageUrl || getSvgFallbackDataUri(v);
          return `
            <div class="podium-card ${i === 0 ? "rank-1" : ""}">
              <div class="car-photo-grid-thumb" style="height:140px; margin-bottom:0.65rem; cursor:pointer;" onclick="window.selectCarFromBrand('${v.id}'); window.goToStep(5);">
                <img src="${imgSrc}" alt="${v.brand} ${v.model}" onerror="window.handleCarImgError(this, '${v.id}')" />
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                <span class="badge ${i === 0 ? "badge-success" : "badge-info"}">${medals[i]}</span>
                <span class="couple-avg-badge">💚 ${avg} / 5</span>
              </div>
              <h3 style="font-size:1.2rem; font-weight:800;">${v.brand} ${v.model}</h3>
              <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.5rem;">${v.trim} • <strong>${formatCop(v.priceCop)}</strong></p>
              <div style="font-size:0.78rem; margin-bottom:0.5rem; color:var(--primary); font-weight:700;">
                ${v.dealerVisited ? `✅ Visitada (${v.dealerName || getSuggestedCaliDealer(v.brand)})` : `⏳ Pendiente visitar (${getSuggestedCaliDealer(v.brand)})`}
              </div>
              <div style="font-size:0.82rem; color:var(--text-main); background:var(--bg-subtle); padding:0.65rem; border-radius:10px;">
                <strong>👍 Lo que más nos gusta:</strong> ${v.initialLikes[0] || "—"}
              </div>
            </div>
          `;
        })
        .join("");
    }

    const selects = [
      document.getElementById("compSelect1"),
      document.getElementById("compSelect2"),
      document.getElementById("compSelect3")
    ];

    selects.forEach((sel, idx) => {
      if (!sel) return;
      sel.innerHTML = vehicles
        .map(
          (v) =>
            `<option value="${v.id}" ${compSelection[idx] === v.id ? "selected" : ""}>${v.brand} ${v.model} (${formatCop(v.priceCop)})</option>`
        )
        .join("");
      sel.onchange = (e) => {
        compSelection[idx] = e.target.value;
        renderComparatorTable();
      };
    });

    renderComparatorTable();
  }

  function renderComparatorTable() {
    const table = document.getElementById("comparatorTable");
    if (!table) return;

    const cols = compSelection.map((id) => vehicles.find((v) => v.id === id) || vehicles[0]);

    const rows = [
      {
        label: "Foto y Modelo",
        render: (v) => {
          const imgSrc = v.imageUrl || getSvgFallbackDataUri(v);
          return `
            <img src="${imgSrc}" alt="${v.brand} ${v.model}" class="car-photo-comp-thumb" onerror="window.handleCarImgError(this, '${v.id}')" />
            <strong style="font-size:1rem;">${v.brand} ${v.model}</strong><br>
            <span style="color:var(--text-muted); font-size:0.78rem;">${v.trim}</span>
          `;
        }
      },
      {
        label: "📍 Visita Concesionario Cali",
        render: (v) => `
          <div>${v.dealerVisited ? `<span class="badge badge-success">✅ Ya la visitamos</span>` : `<span class="badge" style="background:var(--bg-subtle);">⏳ Por visitar</span>`} ${v.testDriveDone ? `<span class="badge badge-purple">🏁 Manejada</span>` : ""}</div>
          <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.25rem;">🏢 ${v.dealerName || getSuggestedCaliDealer(v.brand)}</div>
          ${v.quotedPrice ? `<div style="font-size:0.8rem; font-weight:700; color:var(--primary); margin-top:0.2rem;">💬 Cotizado: ${v.quotedPrice}</div>` : ""}
        `
      },
      {
        label: "💰 Precio y Presupuesto",
        render: (v) => `<strong style="color:var(--primary); font-size:1rem;">${formatCop(v.priceCop)}</strong><div style="margin-top:0.25rem;">${getBudgetBadge(v)}</div>`
      },
      {
        label: "🏛️ Beneficio UPME",
        render: (v) => `${getUpmeBadge(v)}<div style="font-size:0.76rem; color:var(--text-muted); margin-top:0.2rem;">${v.upmeStatusText}</div>`
      },
      {
        label: "💚 Puntaje de los Dos",
        render: (v) => `<span class="couple-avg-badge">💚 ${getCoupleScore(v)} / 5</span> (Él: ${v.ratingHusband}★ | Ella: ${v.ratingWife}★)`
      },
      {
        label: "⚡ Potencia / Subida Montaña",
        render: (v) => `<strong>${v.specs.horsepower}</strong> (${v.specs.torque})<br><span style="font-size:0.78rem; color:var(--text-muted);">${v.specs.engine}</span>`
      },
      {
        label: "⛽ Consumo en Cali",
        render: (v) => `<strong style="color:var(--success);">${v.specs.fuelEconomy}</strong>`
      },
      {
        label: "🕹️ Caja y Tracción",
        render: (v) => `${v.specs.transmission}<br><span style="font-size:0.78rem; color:var(--text-muted);">${v.specs.drivetrain}</span>`
      },
      {
        label: "🧳 Baúl y Seguridad",
        render: (v) => `<strong>${v.specs.trunkLiters} L</strong> • ${v.specs.airbags} Airbags (${v.specs.adasLevel})`
      },
      {
        label: "👍 Lo que nos gusta",
        render: (v) => `<ul style="padding-left:1rem; font-size:0.8rem;">${v.initialLikes.map((l) => `<li>${l}</li>`).join("")}</ul>`
      },
      {
        label: "👎 Lo que no nos gusta / Dudas",
        render: (v) => `<ul style="padding-left:1rem; font-size:0.8rem;">${v.initialDislikes.map((d) => `<li>${d}</li>`).join("")}</ul>`
      }
    ];

    table.innerHTML = `
      <tbody>
        ${rows
          .map(
            (r) => `
          <tr>
            <th>${r.label}</th>
            ${cols.map((c) => `<td>${r.render(c)}</td>`).join("")}
          </tr>
        `
          )
          .join("")}
      </tbody>
    `;
  }

  // ==================== RATING & PROS/CONS MUTATIONS ====================
  window.setRating = function (vehicleId, personKey, value) {
    const v = vehicles.find((item) => item.id === vehicleId);
    if (!v) return;
    v[personKey] = value;
    saveState();
    renderBrandDirectory();
    renderCandidatesStep();
    if (currentStep === 6) renderPodiumAndComparator();
    showToast(`Calificación guardada para ${v.brand} ${v.model}`);
  };

  window.addProCon = function (vehicleId, type) {
    const v = vehicles.find((item) => item.id === vehicleId);
    if (!v) return;
    const prefix = type === "likes" ? "inputLike_" : "inputDislike_";
    const input = document.getElementById(prefix + vehicleId);
    if (!input || !input.value.trim()) return;

    if (type === "likes") {
      v.initialLikes.push(input.value.trim());
    } else {
      v.initialDislikes.push(input.value.trim());
    }
    input.value = "";
    saveState();
    renderCandidatesStep();
    showToast("Nota agregada a la ficha");
  };

  window.removeProCon = function (vehicleId, type, index) {
    const v = vehicles.find((item) => item.id === vehicleId);
    if (!v) return;
    if (type === "likes") {
      v.initialLikes.splice(index, 1);
    } else {
      v.initialDislikes.splice(index, 1);
    }
    saveState();
    renderCandidatesStep();
  };

  window.updateField = function (vehicleId, field, value) {
    const v = vehicles.find((item) => item.id === vehicleId);
    if (!v) return;
    v[field] = value;
    saveState();
    showToast("Dato guardado automáticamente");
  };

  // ==================== WHATSAPP & BACKUP ====================
  function copyWhatsappSummary() {
    const valid = vehicles
      .filter((v) => v.upmeApplies && (v.budgetTier === "IDEAL_130_150" || v.budgetTier === "STRETCH_150_170"))
      .sort((a, b) => getCoupleScore(b) - getCoupleScore(a))
      .slice(0, 6);

    const visitedCount = vehicles.filter((v) => v.dealerVisited).length;
    let text = `🌴🚗 *NUESTRO PROYECTO CAMIONETA HÍBRIDA EN CALI* 💚\n📍 Concesionarios visitados: ${visitedCount}\n\n`;
    valid.forEach((v, idx) => {
      const avg = getCoupleScore(v);
      const visitTag = v.dealerVisited ? `✅ Visitada (${v.dealerName || getSuggestedCaliDealer(v.brand)})` : `⏳ Pendiente visitar`;
      text += `*${idx + 1}. ${v.brand} ${v.model}* (${formatCop(v.priceCop)})\n`;
      text += `   • Estado: ${visitTag}${v.testDriveDone ? " | 🏁 Manejada" : ""}\n`;
      text += `   • Puntaje: ${avg}/5 (Él: ${v.ratingHusband}★, Ella: ${v.ratingWife}★)\n`;
      if (v.quotedPrice) text += `   • Cotización Cali: ${v.quotedPrice}\n`;
      if (v.advisorContact) text += `   • Asesor: ${v.advisorContact}\n`;
      if (v.initialLikes.length > 0) text += `   • 👍 Nos gusta: ${v.initialLikes[0]}\n`;
      text += "\n";
    });

    navigator.clipboard
      .writeText(text)
      .then(() => showToast("📋 ¡Resumen con visitas copiado para WhatsApp!"))
      .catch(() => alert(text));
  }

  function exportJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vehicles, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "nuestras-camionetas-cali-upme.json");
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("💾 Copia de seguridad descargada");
  }

  function importJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed)) {
          vehicles = parsed;
          saveState();
          renderBrandDirectory();
          renderCandidatesStep();
          renderPodiumAndComparator();
          showToast("📂 ¡Datos cargados con éxito!");
        }
      } catch (err) {
        alert("Archivo JSON no válido.");
      }
    };
    reader.readAsText(file);
  }

  // ==================== INIT ====================
  document.addEventListener("DOMContentLoaded", () => {
    loadState();
    updateRoundCounts();
    updateVisitsSummaryBanner();
    renderHybridStep();
    setupUpmeSimulator();
    renderMiniGuideSpotlight();
    renderBrandDirectory();
    renderCandidatesStep();
    syncTop3ToComparator();
    renderPodiumAndComparator();

    // Round filter pills in Step 5
    document.querySelectorAll("#roundFilterPills .round-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        activeRound = pill.getAttribute("data-round");
        carouselIndex = 0;
        document.querySelectorAll("#roundFilterPills .round-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        renderBrandDirectory();
        renderCandidatesStep();
      });
    });

    // Close visits modal on backdrop click
    const visitsModal = document.getElementById("visitsLogModal");
    if (visitsModal) {
      visitsModal.addEventListener("click", (e) => {
        if (e.target === visitsModal) window.closeVisitsModal();
      });
    }

    // Add vehicle modal
    const addModal = document.getElementById("addVehicleModal");
    document.getElementById("btnAddVehicle").addEventListener("click", () => addModal.classList.add("open"));
    document.getElementById("closeAddModal").addEventListener("click", () => addModal.classList.remove("open"));
    document.getElementById("cancelAddModal").addEventListener("click", () => addModal.classList.remove("open"));

    document.getElementById("formAddVehicle").addEventListener("submit", (e) => {
      e.preventDefault();
      const brand = document.getElementById("newBrand").value.trim();
      const model = document.getElementById("newModel").value.trim();
      const trim = document.getElementById("newTrim").value.trim() || "Híbrida";
      const price = Number(document.getElementById("newPrice").value);
      const cat = document.getElementById("newCategory").value;
      const hp = Number(document.getElementById("newHp").value) || 180;
      const fuel = Number(document.getElementById("newFuel").value) || 65;
      const trunk = Number(document.getElementById("newTrunk").value) || 450;
      const summary = document.getElementById("newSummary").value.trim() || "Vehículo agregado por nosotros en Cali.";
      const imgUrlInput = document.getElementById("newImageUrl");
      const imageUrl = imgUrlInput && imgUrlInput.value.trim() ? imgUrlInput.value.trim() : "";

      const upmeApplies = cat !== "MHEV_DESCARTADO";
      const techLabelMap = {
        HEV: "Híbrido Completo (HEV)",
        PHEV: "Híbrido Enchufable (PHEV)",
        EPOWER: "Rango Extendido (e-POWER)",
        MHEV_DESCARTADO: "Híbrido Ligero (MHEV) — NO UPME"
      };

      let budgetTier = "IDEAL_130_150";
      let budgetLabel = "🎯 En presupuesto ($130M–$150M)";
      if (!upmeApplies) {
        budgetTier = "DESCARTADO_UPME";
        budgetLabel = "❌ No aplica a UPME";
      } else if (price > 170000000) {
        budgetTier = "OVER_170_REF";
        budgetLabel = "🟠 Supera tope de $170M";
      } else if (price > 150000000) {
        budgetTier = "STRETCH_150_170";
        budgetLabel = "🟡 Estirando ($150M–$170M)";
      }

      const newCar = {
        id: "custom-" + Date.now(),
        brand,
        model,
        trim,
        imageUrl,
        category: cat,
        budgetTier,
        budgetLabel,
        techLabel: techLabelMap[cat],
        upmeApplies,
        upmeStatusText: upmeApplies ? "SÍ aplica a Certificado UPME" : "❌ NO aplica a UPME (MHEV)",
        upmeDetail: upmeApplies
          ? "Elegible para beneficios tributarios UPME (50% renta) y 60% dto. impuesto en el Valle."
          : "Excluido de UPME por ser MHEV.",
        priceCop: price,
        priceRange: formatCop(price) + " COP",
        tagline: summary,
        forWifeSummary: summary,
        caliNote: "📍 Agregado de concesionario en Cali.",
        specs: {
          engine: "Híbrido",
          engineType: techLabelMap[cat],
          horsepower: `${hp} hp`,
          hpNumeric: hp,
          torque: "—",
          torqueNumeric: 250,
          transmission: "Automática",
          drivetrain: "4x2 / AWD",
          fuelEconomy: `~${fuel} km/galón`,
          fuelNumeric: fuel,
          trunkLiters: trunk,
          airbags: 6,
          adasLevel: "Paquete ADAS",
          seats: 5
        },
        initialLikes: ["Agregado manualmente por nosotros"],
        initialDislikes: ["Pendiente prueba de manejo en Cali"],
        ratingHusband: 4,
        ratingWife: 4,
        dealerVisited: true,
        dealerName: getSuggestedCaliDealer(brand),
        advisorContact: "",
        dealerNotes: "",
        quotedPrice: "",
        testDriveDone: false
      };

      vehicles.unshift(newCar);
      saveState();
      activeRound = budgetTier === "DESCARTADO_UPME" ? "MHEV_DESCARTADO" : budgetTier;
      carouselIndex = 0;
      window.goToStep(5);
      addModal.classList.remove("open");
      e.target.reset();
      showToast(`✅ ${brand} ${model} agregado`);
    });

    document.getElementById("btnShareWhatsapp").addEventListener("click", copyWhatsappSummary);
    document.getElementById("btnShareWhatsapp2").addEventListener("click", copyWhatsappSummary);
    document.getElementById("btnExportData").addEventListener("click", exportJson);
    document.getElementById("inputImportData").addEventListener("change", importJson);

    document.getElementById("btnResetDefaults").addEventListener("click", () => {
      if (confirm("¿Desean restaurar las notas y calificaciones iniciales?")) {
        localStorage.removeItem(STORAGE_KEY);
        PREV_KEYS.forEach((k) => localStorage.removeItem(k));
        loadState();
        saveState();
        renderBrandDirectory();
        renderCandidatesStep();
        renderPodiumAndComparator();
        showToast("🔄 Datos restaurados");
      }
    });
  });
})();
