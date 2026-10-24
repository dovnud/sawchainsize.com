/* Motion layer (GSAP + Lenis). Everything here is decoration: if it fails, the site works exactly as before. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/* --- Lenis smooth scroll, driven by GSAP's ticker --- */
let lenis: Lenis | null = null;
try {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  gsap.ticker.add((time) => lenis!.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.on('scroll', ScrollTrigger.update);
} catch { lenis = null; }

/* --- Reading progress hairline --- */
gsap.to('#scrollProgress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

/* --- Scroll reveals for below-the-fold blocks only (no-JS and above-the-fold stay fully visible) --- */
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { gsap.to(en.target, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out' }); io.unobserve(en.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('main .block, main .diagram, main .faq, main .callout').forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    gsap.set(el, { y: 26, opacity: 0 });
    io.observe(el);
  });
  ScrollTrigger.refresh();
}

/* --- Spotlight cards: light follows the cursor --- */
let ticking = false;
document.addEventListener('pointermove', (e) => {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const card = (e.target as Element | null)?.closest?.('.card') as HTMLElement | null;
    if (card) {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
    }
  });
});

/* --- Magnetic pull on the finder button, capped at a few px --- */
const btn = document.getElementById('fGo');
if (btn && window.matchMedia('(pointer: fine)').matches) {
  btn.addEventListener('pointermove', (e) => {
    const r = btn.getBoundingClientRect();
    gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.06, y: (e.clientY - r.top - r.height / 2) * 0.18, duration: 0.4 });
  });
  btn.addEventListener('pointerleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1,.45)' }));
}
