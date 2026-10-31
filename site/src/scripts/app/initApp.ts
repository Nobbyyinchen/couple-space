import { normalizeAppPayload, type AppPayload } from './payload.ts';
import { APP_EVENTS, STORAGE_KEYS } from '../../constants/client.ts';

function readPayload(payloadElementId: string): AppPayload {
  const payloadEl = document.getElementById(payloadElementId);
  if (!(payloadEl instanceof HTMLScriptElement)) {
    return normalizeAppPayload({});
  }

  try {
    return normalizeAppPayload(JSON.parse(payloadEl.textContent || '{}'));
  } catch {
    return normalizeAppPayload({});
  }
}

function initMotto(quotes: string[]) {
  const el = document.getElementById('motto');
  if (!el) return;
  if (!quotes.length) {
    el.textContent = '';
    return;
  }

  const pickRandom = () => Math.floor(Math.random() * quotes.length);
  let idx = pickRandom();
  el.textContent = quotes[idx] || '';
  if (quotes.length <= 1) return;

  setInterval(() => {
    let next = pickRandom();
    while (quotes.length > 1 && next === idx) next = pickRandom();
    idx = next;

    // Start exit transition
    el.classList.add('motto-exit');

    setTimeout(() => {
      // Switch text while element is invisible (exit state)
      el.textContent = quotes[idx] || '';

      // Remove exit state and prepare for enter animation
      el.classList.remove('motto-exit');
      el.classList.add('motto-enter');

      // Trigger enter animation in next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.remove('motto-enter');
        });
      });
    }, 600); // Matches CSS transition duration
  }, 10000);
}

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -30px 0px' },
  );

  document.querySelectorAll('.reveal, .reveal-scale').forEach((el) => observer.observe(el));
  const timelineNodes = document.querySelectorAll<HTMLElement>('#timeline .timeline-node');
  timelineNodes.forEach((node, index) => {
    node.style.setProperty('--i', String(index));
    node.classList.add('reveal');
    observer.observe(node);
  });
}

function initClickHearts() {
  function spawnHearts(x: number, y: number, count: number) {
    const icons = ['❤', '💕', '♥'];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'click-heart';
        el.textContent = icons[Math.floor(Math.random() * icons.length)] || '♥';
        el.style.left = `${x + (Math.random() - 0.5) * 40}px`;
        el.style.top = `${y + (Math.random() - 0.5) * 40}px`;
        el.style.fontSize = `${10 + Math.random() * 14}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1400);
      }, i * 70);
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('.music-btn, .music-panel, .photo-wall-entry, .photo-wall-overlay, button')) return;
    spawnHearts(event.clientX, event.clientY, 3);
  });

  document.addEventListener(
    'touchstart',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.music-btn, .music-panel, .photo-wall-entry, .photo-wall-overlay, button')) return;
      const touch = event.touches[0];
      if (!touch) return;
      spawnHearts(touch.clientX, touch.clientY, 2);
    },
    { passive: true },
  );
}

function initEasterEgg(secretMessage: string, closeLabel?: string) {
  const hero = document.getElementById('heroSection');
  const heart = hero?.querySelector('.hero-heart');
  let heartClicks = 0;
  let clickTimer = 0;
  let longPressTimer = 0;

  function showSecret() {
    const overlay = document.createElement('div');
    overlay.className = 'story-overlay';
    overlay.innerHTML =
      `<div class="story-card glass">` +
      `<button class="story-close" aria-label="${closeLabel || '关闭'}">×</button>` +
      `<p class="text-white/90 text-base leading-relaxed text-center font-hand" style="font-size:1.2em"></p>` +
      `</div>`;

    const textEl = overlay.querySelector('p');
    if (textEl) textEl.textContent = secretMessage;

    const close = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 350);
    };

    const closeBtn = overlay.querySelector('.story-close');
    if (closeBtn instanceof HTMLElement) closeBtn.onclick = close;
    overlay.onclick = (event) => {
      if (event.target === overlay) close();
    };

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
  }

  hero?.addEventListener('dblclick', (event) => {
    event.preventDefault();
    showSecret();
  });

  heart?.addEventListener('click', (event) => {
    event.stopPropagation();
    heartClicks += 1;
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = window.setTimeout(() => {
      heartClicks = 0;
    }, 1500);

    if (heartClicks >= 5) {
      heartClicks = 0;
      showSecret();
    }
  });

  const startLongPress = () => {
    longPressTimer = window.setTimeout(showSecret, 2000);
  };

  const cancelLongPress = () => {
    if (!longPressTimer) return;
    clearTimeout(longPressTimer);
    longPressTimer = 0;
  };

  hero?.addEventListener('mousedown', startLongPress);
  hero?.addEventListener('mouseup', cancelLongPress);
  hero?.addEventListener('mouseleave', cancelLongPress);
  hero?.addEventListener('touchstart', startLongPress, { passive: true });
  hero?.addEventListener('touchend', cancelLongPress, { passive: true });
  hero?.addEventListener('touchcancel', cancelLongPress, { passive: true });
}

function emitToast(message: string, duration = 3200) {
  const content = typeof message === 'string' ? message.trim() : '';
  if (!content) return;

  window.dispatchEvent(
    new CustomEvent(APP_EVENTS.toast, {
      detail: {
        message: content,
        duration,
        type: 'info',
      },
    }),
  );
}

function initWelcomeFlow(payload: AppPayload) {
  const store = window.__LOVE_STORE__;
  const i18n = payload.i18n;

  function getDynamicMessage(defaultMsg: string): string {
    const hour = new Date().getHours();
    const greeting = i18n?.welcomeMessage?.greetingTime;
    let prefix = '';
    if (hour >= 5 && hour < 12) prefix = greeting?.morning || '早上好，';
    else if (hour >= 12 && hour < 14) prefix = greeting?.noon || '中午好，';
    else if (hour >= 14 && hour < 18) prefix = greeting?.afternoon || '下午好，';
    else if (hour >= 18 && hour < 23) prefix = greeting?.evening || '晚上好，';
    else prefix = greeting?.night || '夜深了，';

    return `${prefix}${defaultMsg}`;
  }

  function showWelcomeToast(message = payload.defaultWelcomeMessage) {
    if (!payload.enableWelcomeMessage) return;

    try {
      const isReturning = store?.getLocal(STORAGE_KEYS.returningVisitor);
      if (store?.getSession(STORAGE_KEYS.visited)) return;

      store?.setSession(STORAGE_KEYS.visited, '1');

      if (isReturning) {
        message = i18n?.welcomeMessage?.returning || '欢迎回来，想你啦 ♥';
      } else {
        store?.setLocal(STORAGE_KEYS.returningVisitor, '1');
        message = getDynamicMessage(message);
      }
    } catch {
      // Fallback if storage access fails
    }

    const hero = document.getElementById('heroSection');
    if (!hero) return;
    emitToast(message, 3500);
  }

  addEventListener('load', () => {
    const loader = document.getElementById('loader');
    const guard = document.getElementById('passwordGuard');
    let locked = false;

    if (guard && payload.passwordGuardEnabled) {
      locked = true;
      try {
        const stored = store?.getLocal(payload.unlockedStorageKey);
        locked = stored !== payload.expectedPassword;
      } catch {
        locked = true;
      }
    }

    const finishLoading = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (loader) {
        setTimeout(() => {
          loader.classList.add('hidden');
          if (!locked) showWelcomeToast();
        }, 1800);
        return;
      }
      if (!locked) showWelcomeToast();
    };

    if (locked) {
      window.addEventListener(
        payload.pageUnlockedEvent,
        (event) => {
          const detail = event instanceof CustomEvent ? event.detail : undefined;
          const message = typeof detail?.message === 'string' ? detail.message.trim() : '';
          showWelcomeToast(message || payload.defaultWelcomeMessage);
        },
        { once: true },
      );
    }

    finishLoading();
  });
}

export function initAppEffects(options?: { payloadElementId?: string }) {
  const payload = readPayload(options?.payloadElementId || 'app-script-payload');
  initMotto(payload.quotes);
  initScrollReveal();
  initClickHearts();
  initEasterEgg(payload.secretMessage, payload.i18n?.easterEgg?.close);
  initWelcomeFlow(payload);
}
