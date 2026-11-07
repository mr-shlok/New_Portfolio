// Interactive behaviors for Shlok Jadhav's cinematic portfolio
// Handles navigation scrollspy, timeline accordion, domain filter tabs,
// audio toggle, clipboard copy, and contact form submission.

import { sound } from './audio.js';

export function initPortfolioInteractivity() {
  const hdr = document.getElementById('hdr');
  const soundToggle = document.getElementById('soundToggle');
  const toast = document.getElementById('hudToast');
  const toastText = document.getElementById('hudToastText');

  // 1. Audio — on by default, off only if the visitor said so last time
  const SOUND_KEY = 'shlok:sound';
  if (soundToggle) {
    const soundText = soundToggle.querySelector('.sound-text');

    // the toggle repaints from the engine, so it can never claim ON while the
    // browser is still holding the context asleep
    const paint = (enabled, running) => {
      soundToggle.classList.toggle('is-active', enabled && running);
      soundToggle.setAttribute('aria-pressed', String(enabled));
      if (soundText) soundText.textContent = enabled ? 'SOUND: ON' : 'SOUND: OFF';
    };
    sound.onState = paint;

    let muted = false;
    try { muted = localStorage.getItem(SOUND_KEY) === 'off'; } catch { /* private mode */ }
    if (muted) paint(false, false);
    else sound.autoStart();

    soundToggle.addEventListener('click', () => {
      const active = sound.toggle();
      paint(active, sound.ctx?.state === 'running');
      try { localStorage.setItem(SOUND_KEY, active ? 'on' : 'off'); } catch { /* private mode */ }
      showToast(active ? 'Cinematic Audio: Activated' : 'Cinematic Audio: Muted');
    });
  }

  // Bind subtle hover/click sounds to interactive elements
  document.querySelectorAll('a, button, .highlight-box, .t-card, .ach-card, .skill-card-badge, .contact-row-item').forEach((el) => {
    el.addEventListener('mouseenter', () => sound.playHover(), { passive: true });
    el.addEventListener('click', () => sound.playClick(), { passive: true });
  });

  // 2. Header Scroll Blur & Scrollspy
  const updateHeaderScroll = () => {
    if (!hdr) return;
    if (window.scrollY > 40) {
      hdr.classList.add('is-scrolled');
    } else {
      hdr.classList.remove('is-scrolled');
    }
  };
  window.addEventListener('scroll', updateHeaderScroll, { passive: true });
  updateHeaderScroll();

  // Scrollspy to highlight active nav link
  const sections = document.querySelectorAll('section[id], div[id="hero"]');
  const navLinks = document.querySelectorAll('[data-nav]');

  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach((link) => {
          const href = link.getAttribute('href');
          if (href === `#${id}`) {
            link.classList.add('is-active');
          } else {
            link.classList.remove('is-active');
          }
        });
      }
    });
  }, {
    rootMargin: '-20% 0px -60% 0px',
  });

  sections.forEach((sec) => spyObserver.observe(sec));

  // Smooth scroll with header offset
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const hdrH = hdr ? hdr.getBoundingClientRect().height : 70;
        const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - (targetId === '#hero' ? 0 : hdrH);
        window.scrollTo({
          top: Math.max(0, targetPos),
          behavior: 'smooth',
        });
        // Close mobile menu if open
        const root = document.documentElement;
        if (root.classList.contains('is-menu')) {
          const burger = document.getElementById('burger');
          const menu = document.getElementById('menu');
          burger?.setAttribute('aria-expanded', 'false');
          root.classList.remove('is-menu');
          setTimeout(() => { if (menu) menu.hidden = true; }, 400);
        }
      }
    });
  });

  // 3. Work Experience — Timeline Accordion
  const timelineCards = document.querySelectorAll('.t-card');
  timelineCards.forEach((card) => {
    const toggleBtn = card.querySelector('.t-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expanded = card.classList.toggle('is-expanded');
        toggleBtn.querySelector('span').textContent = expanded ? 'Collapse Details' : 'Expand Details';
        sound.playExpand();
      });
    }
  });

  const masterToggle = document.getElementById('toggleAllTimeline');
  if (masterToggle) {
    let allExpanded = false;
    masterToggle.addEventListener('click', () => {
      allExpanded = !allExpanded;
      timelineCards.forEach((card) => {
        card.classList.toggle('is-expanded', allExpanded);
        const btn = card.querySelector('.t-toggle-btn span');
        if (btn) btn.textContent = allExpanded ? 'Collapse Details' : 'Expand Details';
      });
      masterToggle.textContent = allExpanded ? '[ - Collapse All ]' : '[ + Expand All ]';
      sound.playExpand();
    });
  }

  // 4. Skills Domain Filter Tabs
  const tabBtns = document.querySelectorAll('.skill-tab-btn');
  const domainGroups = document.querySelectorAll('.domain-group');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const filter = btn.getAttribute('data-domain');

      domainGroups.forEach((group) => {
        const groupDomain = group.getAttribute('data-domain');
        if (filter === 'all' || filter === groupDomain) {
          group.style.display = 'block';
          group.style.opacity = '1';
        } else {
          group.style.display = 'none';
          group.style.opacity = '0';
        }
      });
      sound.playClick();
    });
  });

  // 5. One-click Copy Helper
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const val = btn.getAttribute('data-copy');
      try {
        await navigator.clipboard.writeText(val);
        showToast(`Copied to clipboard: ${val}`);
        sound.playSuccess();
      } catch {
        showToast(`Text: ${val}`);
      }
    });
  });

  // 6. Contact Form Submission
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = contactForm.querySelector('#formName')?.value?.trim() || '';
      const email = contactForm.querySelector('#formEmail')?.value?.trim() || '';
      const subject = contactForm.querySelector('#formSubject')?.value?.trim() || '';
      const message = contactForm.querySelector('#formMessage')?.value?.trim() || '';

      if (!name || !email || !message) {
        showToast('Please fill in required fields.');
        return;
      }

      // Build mailto link as fallback/action
      const mailtoUrl = `mailto:shlokjadhav.dev@gmail.com?subject=${encodeURIComponent(subject ? `[Portfolio] ${subject}` : `[Portfolio] Message from ${name}`)}&body=${encodeURIComponent(`Name: ${name}
Email: ${email}

Message:
${message}`)}`;

      showToast('Opening email client...');
      sound.playSuccess();

      setTimeout(() => {
        window.location.href = mailtoUrl;
      }, 500);

      const submitBtn = contactForm.querySelector('.form-submit-btn span');
      if (submitBtn) {
        submitBtn.textContent = 'Message Prepared ✓';
        setTimeout(() => {
          submitBtn.textContent = 'Send Message';
          contactForm.reset();
        }, 4000);
      }
    });
  }

  // 7. Toast notification helper
  let toastTimer = null;
  function showToast(msg) {
    if (!toast || !toastText) return;
    toastText.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 3200);
  }
}
