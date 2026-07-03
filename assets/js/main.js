document.addEventListener('DOMContentLoaded', function () {

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     GSAP: register plugins used elsewhere in this file. ScrollTrigger
     isn't driving anything yet (that lands in a later round) - this just
     gets the plumbing (and its Lenis sync, below) in place.
     ------------------------------------------------------------------- */
  var hasGsap = !!(window.gsap && window.ScrollTrigger && window.SplitText);
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger, SplitText);
  }

  /* ---------------------------------------------------------------------
     Lenis smooth scroll
     ------------------------------------------------------------------- */
  var lenis = null;
  if (window.Lenis && !prefersReducedMotion) {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      autoRaf: false
    });

    if (hasGsap) {
      // Official GSAP + Lenis recipe: keep ScrollTrigger in sync with
      // Lenis's scroll position, and drive Lenis's raf loop from GSAP's
      // own ticker so both share a single frame clock instead of running
      // two independent requestAnimationFrame loops against each other.
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      })();
    }

    // Smooth-scroll same-page anchor links through Lenis
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        var target = id ? document.getElementById(id) : null;
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -20 });
        }
      });
    });

    // If we've arrived from another page with a #hash (e.g. /notes/#contact
    // linking back to the homepage's contact section), smooth-scroll to it
    // instead of the browser's instant jump.
    if (window.location.hash) {
      var hashTarget = document.querySelector(window.location.hash);
      if (hashTarget) {
        window.scrollTo(0, 0);
        setTimeout(function () {
          lenis.scrollTo(hashTarget, { offset: -20, immediate: false });
        }, 120);
      }
    }
  }

  /* ---------------------------------------------------------------------
     Hero entrance animation (staggered lines)
     ------------------------------------------------------------------- */
  document.querySelectorAll('.reveal-lines .line').forEach(function (el, i) {
    el.style.transitionDelay = (i * 100) + 'ms';
  });
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.body.classList.add('is-loaded');
    });
  });

  /* ---------------------------------------------------------------------
     Scroll-triggered reveal for the rest of the site
     ------------------------------------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = ((i % 4) * 90) + 'ms';
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------------------------------------------------------------
     Header: hidden over the hero, fades in once you scroll past it
     ------------------------------------------------------------------- */
  var header = document.querySelector('.site-header');
  var hero = document.getElementById('hero');
  if (header && hero && 'IntersectionObserver' in window) {
    var headerIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        header.classList.toggle('is-visible', !entry.isIntersecting);
      });
    }, { threshold: 0, rootMargin: '-85% 0px 0px 0px' });
    headerIo.observe(hero);
  }

  /* ---------------------------------------------------------------------
     Showreel play button -> expands into an audio player
     ------------------------------------------------------------------- */
  var trigger = document.getElementById('reelTrigger');
  if (trigger) {
    var btn = document.getElementById('playBtn');
    var audio = document.getElementById('reelAudio');
    var fill = document.getElementById('reelProgressFill');

    btn.addEventListener('click', function () {
      var isPlaying = trigger.classList.toggle('is-playing');
      btn.classList.toggle('is-playing', isPlaying);
      btn.setAttribute('aria-expanded', String(isPlaying));

      if (isPlaying) {
        audio.currentTime = 0;
        audio.play().catch(function () {
          // Autoplay-with-sound can be blocked before user gesture registers;
          // the click itself is a user gesture so this is mostly a safety net.
        });
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('timeupdate', function () {
      if (audio.duration) {
        fill.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
      }
    });

    audio.addEventListener('ended', function () {
      trigger.classList.remove('is-playing');
      btn.classList.remove('is-playing');
      btn.setAttribute('aria-expanded', 'false');
      fill.style.width = '0%';
    });
  }

  /* ---------------------------------------------------------------------
     Hero word-scramble: cycles through a list of words. Each character
     position is a small overflow-hidden "slot" (built once via SplitText);
     while decoding, the outgoing glyph slides up and out while the
     incoming glyph slides up into place from below, repeating rapidly
     through random letters before landing on the correct character - a
     vertical slot-reel decode. Settles after `scrambleMs`, holds for
     `holdMs`, then decodes into the next word.
     ------------------------------------------------------------------- */
  function initHeroScramble() {
    var el = document.getElementById('heroScramble');
    if (!el) return;

    var words = ['Advertising', 'Explainer', 'Web-Video', 'Corporate', 'Commercial', 'Character'];
    var holdMs = 3000;

    // Reduced motion (or GSAP failing to load off the CDN): swap the
    // settled word in directly, no slot markup, no animation at all.
    if (prefersReducedMotion || !hasGsap) {
      var plainIndex = 0;
      (function plainCycle() {
        el.textContent = words[plainIndex];
        plainIndex = (plainIndex + 1) % words.length;
        setTimeout(plainCycle, holdMs);
      })();
      return;
    }

    var scrambleMs = 3000;
    var flipInterval = 180; // ms between successive random flips on a slot
    var flipDuration = 0.03; // seconds, each slide-in/slide-out tween - short relative
                              // to flipInterval so slots read as a crisp flicker rather
                              // than a constant blur of overlapping glyphs
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    var longest = words.reduce(function (a, b) { return b.length > a.length ? b : a; });
    el.textContent = longest;

    var split = new SplitText(el, { type: 'chars', charsClass: 'scramble-slot' });
    var slots = split.chars;
    var maxLen = slots.length;
    var currentChars = longest.split('');
    var currentGlyphEls = [];

    slots.forEach(function (slot, i) {
      slot.textContent = '';
      var glyph = document.createElement('span');
      glyph.className = 'scramble-glyph is-settled';
      glyph.textContent = currentChars[i];
      slot.appendChild(glyph);
      currentGlyphEls[i] = glyph;
    });

    function randomLetter() {
      return letters[Math.floor(Math.random() * letters.length)];
    }

    function doFlip(i, char, isFinal) {
      var slot = slots[i];
      var oldGlyph = currentGlyphEls[i];

      if (oldGlyph) {
        gsap.killTweensOf(oldGlyph);
        oldGlyph.style.position = 'absolute';
        oldGlyph.style.top = '0';
        oldGlyph.style.left = '0';
        gsap.to(oldGlyph, {
          yPercent: -100,
          opacity: 0,
          duration: flipDuration,
          ease: 'power1.in',
          onComplete: function () { oldGlyph.remove(); }
        });
      }

      var newGlyph = document.createElement('span');
      newGlyph.className = 'scramble-glyph' + (isFinal ? ' is-settled' : '');
      newGlyph.textContent = char;
      slot.appendChild(newGlyph);
      gsap.fromTo(newGlyph,
        { yPercent: 100, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: flipDuration, ease: 'power1.out' }
      );

      currentGlyphEls[i] = newGlyph;
      currentChars[i] = char;
    }

    function scheduleSlot(i, toChar) {
      // Same staggered cascade as before: character i starts decoding
      // partway through the first half of the animation, and every slot
      // has an equal-length active window so the very last character's
      // final flip lands exactly on `scrambleMs`.
      var start = (i / maxLen) * scrambleMs * 0.5;
      var end = scrambleMs * (0.5 + 0.5 * ((i + 1) / maxLen));
      for (var t = start; t < end; t += flipInterval) {
        (function (time) {
          gsap.delayedCall(time / 1000, function () { doFlip(i, randomLetter(), false); });
        })(t);
      }
      gsap.delayedCall(end / 1000, function () { doFlip(i, toChar, true); });
    }

    var index = 0;
    function cycle() {
      var toChars = words[index].split('');
      for (var i = 0; i < maxLen; i++) {
        scheduleSlot(i, toChars[i] || '');
      }
      gsap.delayedCall(scrambleMs / 1000, function () {
        gsap.delayedCall(holdMs / 1000, function () {
          index = (index + 1) % words.length;
          cycle();
        });
      });
    }
    cycle();
  }
  initHeroScramble();

});
