const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.primary-nav');

function setMenuOpen(open) {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  navigation.classList.toggle('is-open', open);
}

menuButton?.addEventListener('click', () => {
  const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
  setMenuOpen(willOpen);
  if (willOpen) navigation.querySelector('a')?.focus();
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenuOpen(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
    setMenuOpen(false);
    menuButton.focus();
  }
});

document.addEventListener('click', (event) => {
  if (menuButton?.getAttribute('aria-expanded') === 'true' && !navigation.contains(event.target) && !menuButton.contains(event.target)) {
    setMenuOpen(false);
  }
});

const year = document.querySelector('#current-year');
if (year) year.textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const heroVideo = document.querySelector('.hero-video');
const closingVideo = document.querySelector('.closing-video');
const videos = [heroVideo, closingVideo].filter(Boolean);

function pauseVideosForPreference() {
  if (!reducedMotion.matches) return;
  videos.forEach((video) => {
    video.removeAttribute('autoplay');
    video.pause();
  });
}

function playVideo(video) {
  if (!video || reducedMotion.matches || document.hidden) return;
  const playAttempt = video.play();
  if (playAttempt?.catch) playAttempt.catch(() => {});
}

pauseVideosForPreference();
reducedMotion.addEventListener?.('change', () => {
  if (reducedMotion.matches) {
    videos.forEach((video) => video.pause());
  } else {
    playVideo(heroVideo);
  }
});

if (heroVideo && !reducedMotion.matches) playVideo(heroVideo);

if (closingVideo && 'IntersectionObserver' in window) {
  const closingObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting }) => {
      if (isIntersecting) {
        closingVideo.preload = 'metadata';
        playVideo(closingVideo);
      } else {
        closingVideo.pause();
      }
    });
  }, { rootMargin: '120px 0px', threshold: 0.15 });
  closingObserver.observe(closingVideo);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    videos.forEach((video) => video.pause());
  } else if (!reducedMotion.matches) {
    playVideo(heroVideo);
  }
});

function revealHeroLetters() {
  const title = document.querySelector('.hero h1');
  if (!title || reducedMotion.matches) return;

  const accessibleText = title.textContent.replace(/\s+/g, ' ').trim();
  title.setAttribute('aria-label', accessibleText);
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('pt-BR', { granularity: 'grapheme' })
    : null;
  let letterIndex = 0;

  const wrapTextNode = (node) => {
    const fragment = document.createDocumentFragment();
    const parts = node.nodeValue.match(/\s+|[^\s]+/gu) || [];
    parts.forEach((part) => {
      if (/^\s+$/u.test(part)) {
        fragment.append(document.createTextNode(part));
        return;
      }

      const word = document.createElement('span');
      word.className = 'hero-word';
      word.setAttribute('aria-hidden', 'true');
      const letters = segmenter
        ? Array.from(segmenter.segment(part), (entry) => entry.segment)
        : Array.from(part);

      letters.forEach((letter) => {
        const character = document.createElement('span');
        character.className = 'hero-letter';
        character.style.setProperty('--letter-delay', `${90 + letterIndex * 27}ms`);
        character.textContent = letter;
        word.append(character);
        letterIndex += 1;
      });
      fragment.append(word);
    });
    node.replaceWith(fragment);
  };

  const wrapDescendantText = (element) => {
    Array.from(element.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) wrapTextNode(child);
      else if (child.nodeType === Node.ELEMENT_NODE) wrapDescendantText(child);
    });
  };

  wrapDescendantText(title);
  title.classList.add('is-letter-reveal');
}

function setupScrollReveals() {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  const selector = [
    '.hero-copy > .eyebrow', '.hero-copy > .hero-lede', '.hero-copy > .hero-actions', '.hero-copy > .hero-trust',
    '.material-ribbon .ribbon-inner', '.section-heading', '.product-card',
    '.about-visual', '.about-copy > .eyebrow', '.about-copy > h2', '.about-copy > .about-lede', '.feature-row', '.about-copy > .text-link',
    '.instagram-copy > .eyebrow', '.instagram-copy > h2', '.instagram-copy > p:not(.eyebrow)', '.instagram-copy > .button', '.instagram-handle', '.instagram-preview',
    '.reviews-heading', '.location-copy > *', '.map-frame', '.closing-media', '.closing-copy > *', '.footer-main > *', '.footer-bottom-inner',
  ].join(',');
  const elements = Array.from(document.querySelectorAll(selector));
  if (!elements.length) return;

  document.documentElement.classList.add('has-reveals');
  elements.forEach((element, index) => {
    element.classList.add('reveal-item');
    let delay = (index % 4) * 75;
    if (element.matches('.hero-copy > .hero-lede')) delay = 440;
    if (element.matches('.hero-copy > .hero-actions')) delay = 650;
    if (element.matches('.hero-copy > .hero-trust')) delay = 800;
    element.style.setProperty('--reveal-delay', `${delay}ms`);
  });

  const observer = new IntersectionObserver((entries, activeObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      activeObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

  elements.forEach((element) => observer.observe(element));
}

revealHeroLetters();
setupScrollReveals();

const reviewsViewport = document.querySelector('.reviews-viewport');
const reviewTrack = document.querySelector('.reviews-track');
const reviewSets = document.querySelectorAll('.review-set');

if (reviewsViewport && reviewTrack && reviewSets.length === 2 && !reducedMotion.matches) {
  document.documentElement.classList.add('motion-ready');
  let loopWidth = 0;
  let lastTime = 0;
  let frameId = 0;
  let resumeTimer = 0;
  let hoverPaused = false;
  let interactionPaused = false;
  const speed = 12;

  const measureLoop = () => {
    const trackStyle = getComputedStyle(reviewTrack);
    const gap = parseFloat(trackStyle.columnGap || trackStyle.gap || '0');
    loopWidth = reviewSets[0].getBoundingClientRect().width + gap;
    if (loopWidth > 0 && reviewsViewport.scrollLeft === 0) reviewsViewport.scrollLeft = loopWidth;
  };

  const animate = (time) => {
    frameId = 0;
    if (document.hidden || hoverPaused || interactionPaused || reducedMotion.matches) {
      lastTime = 0;
      return;
    }
    if (!lastTime) lastTime = time;
    const elapsed = Math.min(time - lastTime, 48);
    lastTime = time;
    reviewsViewport.scrollLeft -= speed * (elapsed / 1000);
    if (loopWidth > 0 && reviewsViewport.scrollLeft <= 0) reviewsViewport.scrollLeft += loopWidth;
    frameId = requestAnimationFrame(animate);
  };

  const start = () => {
    if (!frameId && !document.hidden && !hoverPaused && !interactionPaused && !reducedMotion.matches) {
      frameId = requestAnimationFrame(animate);
    }
  };

  const pause = () => {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    lastTime = 0;
  };

  measureLoop();
  requestAnimationFrame(measureLoop);
  start();

  reviewsViewport.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') {
      hoverPaused = true;
      pause();
    }
  });
  reviewsViewport.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') {
      hoverPaused = false;
      start();
    }
  });
  reviewsViewport.addEventListener('pointerdown', () => {
    interactionPaused = true;
    window.clearTimeout(resumeTimer);
    pause();
  });
  window.addEventListener('pointerup', () => {
    interactionPaused = false;
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(start, 1400);
  });
  reviewsViewport.addEventListener('focusin', () => {
    interactionPaused = true;
    pause();
  });
  reviewsViewport.addEventListener('focusout', (event) => {
    if (!reviewsViewport.contains(event.relatedTarget)) {
      interactionPaused = false;
      window.setTimeout(start, 1400);
    }
  });
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : start());
  window.addEventListener('resize', () => {
    measureLoop();
    start();
  }, { passive: true });
  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) {
      pause();
      document.documentElement.classList.remove('motion-ready');
      reviewsViewport.scrollLeft = 0;
    } else {
      document.documentElement.classList.add('motion-ready');
      measureLoop();
      start();
    }
  });
}
