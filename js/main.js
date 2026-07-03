/* Cuisine en Ville — interactions */
(function () {
  "use strict";

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Opening hours (Europe/Paris) ---------- */
  // day: 0=Sun … 6=Sat ; ranges in minutes from midnight
  const HOURS = {
    0: [], 1: [],
    2: [[720, 870], [1140, 1425]],
    3: [[720, 870], [1140, 1425]],
    4: [[720, 870], [1140, 1425]],
    5: [[720, 870], [1140, 1425]],
    6: [[1140, 1425]]
  };
  const DAY_KEYS = ["day.sun", "day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat"];

  function parisNow() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { day: dayIdx, min: parseInt(get("hour"), 10) % 24 * 60 + parseInt(get("minute"), 10) };
  }

  const fmt = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");

  /* ---------- i18n ---------- */
  let lang = localStorage.getItem("cev-lang") || "fr";
  const t = (key) => (I18N[lang] && I18N[lang][key]) || I18N.fr[key] || key;

  function applyLang(next) {
    lang = next;
    localStorage.setItem("cev-lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    $$("[data-i18n]").forEach(el => {
      const val = t(el.getAttribute("data-i18n"));
      if (val.indexOf("<") !== -1) el.innerHTML = val; else el.textContent = val;
    });
    $$("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    $$("[data-i18n-title]").forEach(el => { el.title = t(el.getAttribute("data-i18n-title")); });
    $$(".lang-switch button").forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
    updateOpenIndicator();
    updateTimeOptions();
  }

  $$(".lang-switch button").forEach(b => b.addEventListener("click", () => applyLang(b.dataset.lang)));

  /* ---------- Open / closed indicator ---------- */
  function updateOpenIndicator() {
    const el = $("#open-status"), dot = $("#open-dot");
    if (!el) return;
    const now = parisNow();
    const today = HOURS[now.day] || [];
    for (const [a, b] of today) {
      if (now.min >= a && now.min < b) {
        el.textContent = t("open.open").replace("{time}", fmt(b));
        dot.classList.remove("closed");
        return;
      }
    }
    // find next opening
    for (let i = 0; i < 8; i++) {
      const d = (now.day + i) % 7;
      for (const [a] of (HOURS[d] || [])) {
        if (i === 0 && a <= now.min) continue;
        const dayName = i === 0 ? t("open.today") : t(DAY_KEYS[d]);
        el.textContent = t("open.closed").replace("{day}", dayName).replace("{time}", fmt(a));
        dot.classList.add("closed");
        return;
      }
    }
  }

  /* highlight today's row in the hours table */
  (function () {
    const d = parisNow().day;
    const row = $('.hours-table tr[data-day="' + d + '"]');
    if (row) row.classList.add("today");
  })();

  /* ---------- Preloader ---------- */
  const preloader = $("#preloader");
  function hidePreloader() { if (preloader) preloader.classList.add("is-done"); }
  window.addEventListener("load", hidePreloader);
  setTimeout(hidePreloader, 1500);

  /* ---------- Hero title letter animation ---------- */
  (function () {
    const el = $("#hero-title");
    if (!el || reduceMotion) return;
    const text = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-label", text);
    [...text].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "ch";
      span.setAttribute("aria-hidden", "true");
      span.textContent = ch === " " ? " " : ch;
      span.style.animationDelay = (0.35 + i * 0.045) + "s";
      el.appendChild(span);
    });
  })();

  /* ---------- Hero slider (Ken Burns) ---------- */
  (function () {
    const slides = $$(".hero-slide");
    if (slides.length < 2 || reduceMotion) return;
    let i = 0;
    setInterval(() => {
      slides[i].classList.remove("is-active");
      i = (i + 1) % slides.length;
      slides[i].classList.add("is-active");
    }, 8000);
  })();

  /* ---------- Navbar ---------- */
  const navbar = $("#navbar");
  const backTop = $("#back-to-top");
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    navbar.classList.toggle("scrolled", y > 30);
    backTop.classList.toggle("show", y > 700);
  }, { passive: true });
  backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

  const burger = $("#nav-burger"), navLinks = $("#nav-links");
  burger.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open);
  });
  $$("#nav-links a").forEach(a => a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    burger.classList.remove("open");
  }));

  /* active section highlight */
  (function () {
    const links = $$("#nav-links a");
    const map = new Map();
    links.forEach(a => {
      const sec = $(a.getAttribute("href"));
      if (sec) map.set(sec, a);
    });
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          links.forEach(l => l.classList.remove("active"));
          const link = map.get(e.target);
          if (link) link.classList.add("active");
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    map.forEach((_, sec) => obs.observe(sec));
  })();

  /* ---------- Theme toggle ---------- */
  (function () {
    const saved = localStorage.getItem("cev-theme");
    if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");
    $("#theme-toggle").addEventListener("click", () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      if (dark) document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("cev-theme", dark ? "light" : "dark");
    });
  })();

  /* ---------- Scroll reveal ---------- */
  (function () {
    const els = $$(".reveal");
    if (reduceMotion) { els.forEach(e => e.classList.add("visible")); return; }
    $$(".sig-card").forEach((c, i) => c.style.setProperty("--d", i % 3));
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(e => obs.observe(e));
  })();

  /* ---------- Animated counters ---------- */
  (function () {
    const nums = $$("[data-count]");
    if (!nums.length) return;
    const animate = el => {
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || "0", 10);
      if (reduceMotion) { el.textContent = target.toFixed(dec).replace(".", ","); return; }
      const dur = 1600, start = performance.now();
      const tick = now => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(dec).replace(".", ",");
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { animate(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.5 });
    nums.forEach(n => obs.observe(n));
  })();

  /* ---------- Menu tabs ---------- */
  (function () {
    const tabs = $$(".menu-tabs button");
    tabs.forEach(btn => btn.addEventListener("click", () => {
      tabs.forEach(b => b.setAttribute("aria-selected", "false"));
      btn.setAttribute("aria-selected", "true");
      $$(".menu-panel").forEach(p => {
        const active = p.id === btn.dataset.tab;
        p.hidden = !active;
        p.classList.toggle("is-active", active);
      });
    }));
  })();

  /* ---------- Gallery filters + lightbox ---------- */
  (function () {
    const filters = $$(".gallery-filters button");
    const items = $$("#gallery-grid a");
    filters.forEach(btn => btn.addEventListener("click", () => {
      filters.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      items.forEach(a => a.classList.toggle("hide", f !== "all" && a.dataset.cat !== f));
    }));

    const lb = $("#lightbox"), lbImg = $("#lightbox img");
    let current = 0;
    const visible = () => items.filter(a => !a.classList.contains("hide"));
    function show(idx) {
      const list = visible();
      if (!list.length) return;
      current = (idx + list.length) % list.length;
      lbImg.src = list[current].href;
      lbImg.alt = list[current].querySelector("img").alt;
    }
    items.forEach(a => a.addEventListener("click", e => {
      e.preventDefault();
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
      show(visible().indexOf(a));
    }));
    function close() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); }
    $(".lb-close").addEventListener("click", close);
    $(".lb-prev").addEventListener("click", () => show(current - 1));
    $(".lb-next").addEventListener("click", () => show(current + 1));
    lb.addEventListener("click", e => { if (e.target === lb) close(); });
    document.addEventListener("keydown", e => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
  })();

  /* ---------- Awards carousel ---------- */
  (function () {
    const track = $("#awards-carousel");
    if (!track) return;
    const step = () => (track.querySelector(".award-card").offsetWidth + 24);
    $(".awards-prev").addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    $(".awards-next").addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
  })();

  /* ---------- Reviews carousel ---------- */
  (function () {
    const slides = $$(".review-slide");
    const dotsBox = $("#review-dots");
    if (!slides.length) return;
    let i = 0, timer;
    slides.forEach((_, idx) => {
      const b = document.createElement("button");
      b.setAttribute("aria-label", "Avis " + (idx + 1));
      b.addEventListener("click", () => { go(idx); restart(); });
      dotsBox.appendChild(b);
    });
    const dots = $$("button", dotsBox);
    function go(idx) {
      slides[i].classList.remove("is-active");
      dots[i].classList.remove("active");
      i = idx % slides.length;
      slides[i].classList.add("is-active");
      dots[i].classList.add("active");
    }
    function restart() {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(() => go(i + 1), 6000);
    }
    dots[0].classList.add("active");
    restart();
    $("#reviews").addEventListener("mouseenter", () => clearInterval(timer));
    $("#reviews").addEventListener("mouseleave", restart);
  })();

  /* ---------- Reservation form ---------- */
  const dateInput = $("#rf-date"), timeSelect = $("#rf-time"), dateHint = $("#rf-date-hint");

  function updateTimeOptions() {
    if (!timeSelect) return;
    const prev = timeSelect.value;
    timeSelect.innerHTML = "";
    let day = null;
    if (dateInput.value) day = new Date(dateInput.value + "T12:00:00").getDay();
    const addGroup = (labelKey, from, to) => {
      const og = document.createElement("optgroup");
      og.label = t(labelKey);
      for (let m = from; m <= to; m += 30) {
        const o = document.createElement("option");
        o.value = o.textContent = fmt(m);
        og.appendChild(o);
      }
      timeSelect.appendChild(og);
    };
    const lunchOk = day === null || (day >= 2 && day <= 5);
    const dinnerOk = day === null || (day >= 2 && day <= 6);
    if (lunchOk) addGroup("resa.lunch", 720, 840);   // 12:00 → 14:00
    if (dinnerOk) addGroup("resa.dinner", 1140, 1350); // 19:00 → 22:30
    if (prev) timeSelect.value = prev;
    if (!timeSelect.value && timeSelect.options.length) timeSelect.selectedIndex = 0;
  }

  if (dateInput) {
    const today = new Date();
    dateInput.min = today.toISOString().slice(0, 10);
    dateInput.addEventListener("change", () => {
      dateHint.textContent = "";
      if (!dateInput.value) { updateTimeOptions(); return; }
      const day = new Date(dateInput.value + "T12:00:00").getDay();
      if (day === 0 || day === 1) {
        dateHint.textContent = t("resa.errClosed");
        dateInput.value = "";
      } else if (day === 6) {
        dateHint.textContent = t("resa.hintSat");
      }
      updateTimeOptions();
    });
    updateTimeOptions();
  }

  (function () {
    const form = $("#reserve-form");
    if (!form) return;
    const err = $("#rf-error"), ok = $("#rf-success"), wa = $("#rf-whatsapp");

    function collect() {
      return {
        name: $("#rf-name").value.trim(),
        phone: $("#rf-phone").value.trim(),
        email: $("#rf-email").value.trim(),
        guests: $("#rf-guests").value,
        date: dateInput.value,
        time: timeSelect.value,
        occasion: $("#rf-occasion").value || "—",
        notes: $("#rf-notes").value.trim() || "—"
      };
    }
    function fill(tpl, d) {
      return tpl.replace("{name}", d.name).replace("{date}", d.date).replace("{time}", d.time)
        .replace("{guests}", d.guests).replace("{occasion}", d.occasion).replace("{notes}", d.notes);
    }
    function syncWhatsApp() {
      const d = collect();
      const msg = fill(t("resa.waMsg"), d);
      wa.href = "https://wa.me/33785835546?text=" + encodeURIComponent(msg);
    }
    form.addEventListener("input", syncWhatsApp);
    syncWhatsApp();

    form.addEventListener("submit", e => {
      e.preventDefault();
      err.hidden = true; ok.hidden = true;
      const d = collect();
      if (!d.name || !d.phone || !d.date || !d.time) {
        err.textContent = t("resa.errFields");
        err.hidden = false;
        return;
      }
      const subject = "Réservation — " + d.name + " — " + d.date + " " + d.time;
      const body = fill(t("resa.waMsg"), d) + "\nTél : " + d.phone + (d.email ? "\nE-mail : " + d.email : "");
      ok.hidden = false;
      window.location.href = "mailto:cuisineenvillechef@gmail.com?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
  })();

  /* ---------- Map (privacy consent) ---------- */
  (function () {
    const btn = $("#map-load");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const box = $("#map-box");
      box.innerHTML = '<iframe title="Google Maps — Cuisine en Ville" loading="lazy" allowfullscreen ' +
        'referrerpolicy="no-referrer-when-downgrade" ' +
        'src="https://www.google.com/maps?q=11+Rue+Bellecombe,+69100+Villeurbanne&output=embed"></iframe>';
    });
  })();

  /* ---------- Cookie banner ---------- */
  (function () {
    const banner = $("#cookie-banner");
    const choice = localStorage.getItem("cev-cookies");
    if (!choice) banner.hidden = false;
    const decide = v => { localStorage.setItem("cev-cookies", v); banner.hidden = true; };
    $("#ck-accept").addEventListener("click", () => decide("accepted"));
    $("#ck-refuse").addEventListener("click", () => decide("refused"));
    $("#ck-settings").addEventListener("click", () => decide("essential-only"));
    $("#cookie-settings-link").addEventListener("click", e => {
      e.preventDefault();
      localStorage.removeItem("cev-cookies");
      banner.hidden = false;
    });
  })();

  /* ---------- boot ---------- */
  applyLang(lang);
  setInterval(updateOpenIndicator, 60000);
})();
