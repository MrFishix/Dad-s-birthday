const storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
};

function setTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  storage.set("bday_theme", theme);
  const label = document.querySelector("[data-theme-label]");
  if (label) label.textContent = theme === "light" ? "Светлая" : "Тёмная";
}

function initTheme() {
  const saved = storage.get("bday_theme");
  if (saved === "light" || saved === "dark") {
    setTheme(saved);
    return;
  }
  // default: follow system (no attribute) but show label
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
  const label = document.querySelector("[data-theme-label]");
  if (label) label.textContent = prefersLight ? "Светлая" : "Тёмная";
}

function initEditableName() {
  const el = document.querySelector('[data-edit="name"]');
  if (!el) return;

  const DEFAULT_NAME = "Валеры, Леры и Кристины";
  const savedNameRaw = storage.get("bday_name");
  const savedName = (savedNameRaw || "").trim();
  const isLegacyPlaceholder =
    savedName === "Твоего ребёнка" || savedName === "твоего ребёнка" || savedName === "Твоего ребенка";
  if (savedName && !isLegacyPlaceholder) {
    el.textContent = savedName;
  } else {
    el.textContent = DEFAULT_NAME;
    if (isLegacyPlaceholder) storage.set("bday_name", DEFAULT_NAME);
  }

  const clamp = (s) => s.replace(/\s+/g, " ").trim().slice(0, 48);

  el.addEventListener("input", () => {
    storage.set("bday_name", clamp(el.textContent || ""));
  });

  el.addEventListener("blur", () => {
    const v = clamp(el.textContent || "");
    el.textContent = v || DEFAULT_NAME;
    storage.set("bday_name", v);
  });
}

function initDate() {
  const el = document.querySelector("[data-date]");
  if (!el) return;
  const d = new Date(1977, 3, 24);
  const fmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
  el.textContent = fmt.format(d);
}

function getCongratsText() {
  const name = (storage.get("bday_name") || "").trim();
  const from = name ? name : "Валеры, Леры и Кристины";
  return [
    "Дорогой папа!",
    "",
    "Поздравляем тебя с днём рождения!",
    "",
    "Желаем тебе крепкого здоровья, железных нервов, огромного счастья и чтобы мы вели себя так хорошо, что тебе даже не пришлось бы нас воспитывать! Пусть работа не утомляет, кошелёк не пустеет, настроение всегда будет отличным, а телевизор, диван и вкусный ужин всегда ждут тебя в полной боевой готовности.",
    "",
    "Спасибо тебе за твою силу, заботу, чувство юмора, мудрость и за все твои фирменные папины фразы, которые мы запомнили на всю жизнь. Ты у нас самый лучший: можешь всё починить, всё объяснить, всех защитить и ещё пошутить так, что смеётся вся семья.",
    "",
    "Оставайся таким же крутым, весёлым, надёжным и самым любимым папой!",
    "",
    "Мы тебя очень любим и обещаем хотя бы сегодня не слишком сильно тебя удивлять!",
    "",
    "С днём рождения!",
    "",
    `${from}.`,
  ].join("\n");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.setAttribute("readonly", "true");
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  return ok;
}

function initCopy() {
  const btn = document.querySelector('[data-action="copy"]');
  if (!btn) return;
  const label = document.querySelector("[data-copy-label]");
  btn.addEventListener("click", async () => {
    try {
      await copyText(getCongratsText());
      if (label) label.textContent = "Скопировано";
      btn.disabled = true;
      setTimeout(() => {
        btn.disabled = false;
        if (label) label.textContent = "Скопировать текст";
      }, 1400);
    } catch {
      if (label) label.textContent = "Не удалось";
      setTimeout(() => {
        if (label) label.textContent = "Скопировать текст";
      }, 1400);
    }
  });
}

const MUSIC_DUCK = 0.12;
/** Сохранённая громкость фона до приглушения (null = не приглушали). */
let musicVolumeBeforeDuck = null;

function duckBackgroundMusic() {
  const audio = document.getElementById("engine");
  if (!audio || audio.paused) return;
  if (musicVolumeBeforeDuck !== null) return;
  musicVolumeBeforeDuck = audio.volume;
  audio.volume = MUSIC_DUCK;
}

function unduckBackgroundMusic() {
  const audio = document.getElementById("engine");
  if (musicVolumeBeforeDuck === null) return;
  if (audio) audio.volume = musicVolumeBeforeDuck;
  musicVolumeBeforeDuck = null;
}

function initThemeToggle() {
  const btn = document.querySelector('[data-action="toggle-theme"]');
  if (!btn) return;
  btn.addEventListener("click", () => {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme");
    if (current === "light") return setTheme("dark");
    if (current === "dark") return setTheme("light");
    // if unset, choose opposite of system
    const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
    setTheme(prefersLight ? "dark" : "light");
  });
}

// Confetti
function initConfetti() {
  const canvas = document.querySelector(".confetti");
  const btn = document.querySelector('[data-action="confetti"]');
  if (!canvas || !btn) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let raf = 0;
  let running = false;
  let particles = [];

  const colors = ["#FFB000", "#00D1FF", "#ffffff", "#A78BFA", "#34D399"];

  const resize = () => {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const spawn = (count = 160) => {
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = -10 - Math.random() * 80;
      const s = 5 + Math.random() * 7;
      const vx = (Math.random() - 0.5) * 2.2;
      const vy = 2.4 + Math.random() * 3.2;
      const rot = Math.random() * Math.PI;
      const vr = (Math.random() - 0.5) * 0.2;
      particles.push({
        x,
        y,
        s,
        vx,
        vy,
        rot,
        vr,
        hue: colors[(Math.random() * colors.length) | 0],
        born: now,
        life: 2400 + Math.random() * 1400,
        shape: Math.random() < 0.35 ? "circle" : "rect",
      });
    }
  };

  const draw = (t) => {
    ctx.clearRect(0, 0, w, h);
    const gravity = 0.018;
    particles = particles.filter((p) => t - p.born < p.life);

    for (const p of particles) {
      p.vy += gravity * p.s;
      p.x += p.vx * p.s * 0.18;
      p.y += p.vy * 0.55;
      p.rot += p.vr * p.s;

      const fade = 1 - (t - p.born) / p.life;
      ctx.globalAlpha = Math.max(0, Math.min(1, fade));
      ctx.fillStyle = p.hue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.s * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.72);
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;

    if (particles.length > 0) {
      raf = requestAnimationFrame(draw);
    } else {
      running = false;
      cancelAnimationFrame(raf);
    }
  };

  const runConfetti = () => {
    resize();
    spawn(190);
    if (!running) {
      running = true;
      raf = requestAnimationFrame(draw);
    }
  };

  const overlay = document.getElementById("celebration-video");
  const video = document.getElementById("celebration-player");

  const closeVideo = () => {
    if (!overlay || !video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // ignore
    }
    unduckBackgroundMusic();
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  const openVideo = async () => {
    if (!overlay || !video) return;
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    try {
      await video.play();
      duckBackgroundMusic();
    } catch {
      // Автозапуск заблокирован — приглушим фон, когда пользователь нажмёт play (событие playing)
    }
  };

  video.addEventListener("playing", () => {
    duckBackgroundMusic();
  });
  video.addEventListener("pause", () => {
    if (overlay.hidden) return;
    unduckBackgroundMusic();
  });
  video.addEventListener("ended", () => {
    unduckBackgroundMusic();
  });

  document.querySelectorAll("[data-close-video]").forEach((el) => {
    el.addEventListener("click", closeVideo);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && !overlay.hidden) closeVideo();
  });

  const run = () => {
    runConfetti();
    openVideo();
  };

  window.addEventListener("resize", resize);
  btn.addEventListener("click", run);
}

function initAtmosphereToggle() {
  const btn = document.querySelector('[data-action="play"]');
  if (!btn) return;
  const label = document.querySelector("[data-play-label]");
  const audio = document.getElementById("engine");
  const canPlay = audio && typeof audio.play === "function";

  const DEFAULT_LABEL = "Включить атмосферу";
  let on = false;

  const setUI = (nextOn) => {
    on = nextOn;
    document.documentElement.style.scrollBehavior = "smooth";
    document.documentElement.classList.toggle("atmo", on);
    btn.setAttribute("aria-pressed", String(on));
    if (label) label.textContent = on ? "Атмосфера включена" : DEFAULT_LABEL;
  };

  setUI(false);

  btn.addEventListener("click", async () => {
    if (!canPlay) return setUI(!on);

    if (!on) {
      try {
        audio.volume = 0.85;
        await audio.play();
        setUI(true);
      } catch {
        // Autoplay policy or file access restrictions: keep visual toggle only.
        setUI(true);
      }
      return;
    }

    audio.pause();
    setUI(false);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initThemeToggle();
  initEditableName();
  initDate();
  initConfetti();
  initCopy();
  initAtmosphereToggle();
});

