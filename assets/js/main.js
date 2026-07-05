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
     Hero scroll-shrink: pins the hero while it scales/pushes back in
     z-space/fades, scrubbed to scroll. Header reveal is now driven by
     this ScrollTrigger's progress rather than IntersectionObserver,
     since that doesn't fire correctly against a pinned element.
     ------------------------------------------------------------------- */
  var header = document.querySelector('.site-header');
  var hero = document.getElementById('hero');
  var heroAboutStack = document.querySelector('.hero-about-stack');

  function initHeaderRevealFallback() {
    if (header && hero && 'IntersectionObserver' in window) {
      var headerIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          header.classList.toggle('is-visible', !entry.isIntersecting);
        });
      }, { threshold: 0, rootMargin: '-85% 0px 0px 0px' });
      headerIo.observe(hero);
    }
  }

  function initHeroShrink() {
    if (!header || !hero) return;

    if (prefersReducedMotion || !hasGsap) {
      initHeaderRevealFallback();
      return;
    }

    var heroShrink = hero.querySelector('.hero-shrink');
    if (!heroShrink) { initHeaderRevealFallback(); return; }

    if (!heroAboutStack) { initHeaderRevealFallback(); return; }
    // Only turn on the absolute-positioned overlap once we're sure GSAP is
    // actually going to drive it - without this class, .hero and
    // .about-intro just stack normally (About, opaque and higher z-index,
    // would otherwise permanently hide the hero with no scroll effect to
    // ever reveal it).
    heroAboutStack.classList.add('is-stacked');

    var asideLeft = hero.querySelector('.hero-aside-left');
    var asideRight = hero.querySelector('.hero-aside-right');

    var aboutIntro = document.querySelector('.about-intro');
    var aboutPhoto = document.querySelector('.about-intro-photo');
    var aboutHeading = document.querySelector('.about-intro-heading');
    var aboutBody = document.querySelector('.about-intro-body');

    // The aside links play their own CSS entrance fade/slide-in on load.
    // GSAP force-renders a tween's start state the moment it's created, so
    // handing an element to GSAP before that entrance has finished would
    // freeze it at its pre-entrance (invisible) state instead. Wait for the
    // entrance's transitionend before ever giving GSAP control of it - once
    // this fires, also switch off the CSS transition (it would otherwise
    // fight the scrub's own per-frame inline styles, making it lag instead
    // of tracking scroll 1:1); hover keeps its own short fade.
    var entranceSettled = false;
    var onSettled = [];
    function whenEntranceSettled(fn) {
      if (entranceSettled) { fn(); } else { onSettled.push(fn); }
    }
    var entranceWatchEl = asideLeft || asideRight;
    if (entranceWatchEl) {
      // .hero-aside's transition list declares 'opacity' twice; the browser
      // resolves the property to the later (shorter, undelayed) entry, so
      // opacity's transitionend fires well before 'transform' has even
      // started its own longer, delayed one - watch 'transform' specifically.
      entranceWatchEl.addEventListener('transitionend', function onEntranceEnd(e) {
        if (e.propertyName !== 'transform') return;
        entranceWatchEl.removeEventListener('transitionend', onEntranceEnd);
        entranceSettled = true;
        onSettled.forEach(function (fn) { fn(); });
        onSettled = [];
      });
    } else {
      entranceSettled = true;
    }

    // A pure ease-in (sine.in, power1.in) stays too flat near progress 0 to
    // clear "hear more"'s linear pace, collapsing the two together around
    // the midpoint - blend in some linear speed to keep a faster floor
    // early while still trailing the hero's rate.
    function asideRightEase(p) {
      return p * 0.7 + p * p * 0.3;
    }

    var mm = gsap.matchMedia();
    mm.add({
      isMobile: '(max-width: 760px)',
      isDesktop: '(min-width: 761px)'
    }, function (context) {
      // mobile drops translateZ (scale + fade only) - 3D compositing is costlier there
      var isMobile = context.conditions.isMobile;

      // Timing model (all values in the timeline's own "time" units, where
      // the hero's own tween - untouched, 0 to 0.5 - fixes the scroll-
      // distance-per-unit pace at 2 viewport-heights per unit, since it
      // used to span the entire old pin (100% = 1 viewport) over exactly
      // 0.5 units): About now starts at 0.375 (75% of the way through the
      // hero's own 0->0.5 span, i.e. hero's final quarter overlaps with
      // About's start), and reuses the same "0.5 units = 1 viewport" pace
      // for its own sequence (0.375 to 0.875) that its combined sequence
      // used previously, so it isn't rushed relative to before. A further
      // 0.2 units (0.4 viewports, ~19% of the new grand total) of nothing-
      // scheduled time is appended after that as the static hold, per
      // point 4. Grand total = 0.875 + 0.2 = 1.075 units = 2.15 viewports
      // of scroll = 215%.
      var ABOUT_START = 0.375;
      var ABOUT_MID = 0.625;
      var ABOUT_END = 0.875;
      var GRAND_END = 1.075;

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroAboutStack,
          start: 'top top',
          end: '+=215%',
          scrub: true,
          pin: true,
          onUpdate: function (self) {
            header.classList.toggle('is-visible', self.progress >= 0.85);
          }
        }
      });

      // Hero's own tween - untouched from before this round, same values,
      // same 0->0.5 span, same resulting absolute scroll-distance pace.
      tl.to(heroShrink, { scale: 0.7, z: isMobile ? 0 : -650, opacity: 0, ease: 'none' }, 0);

      // About now sits in the exact same rectangle as the hero (both
      // position:absolute inset:0 in .hero-about-stack), so its own opaque
      // background - not just its content - would otherwise cover the hero
      // instantly rather than progressively. Fade the background itself in
      // across About's own range (backgroundColor, not opacity, so it
      // doesn't compound with the children's own opacity tweens below) so
      // the two cross-dissolve together, finishing as About settles.
      if (aboutIntro) {
        var bgRgb = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-bg').trim().match(/[\d.]+/g);
        gsap.set(aboutIntro, { backgroundColor: 'rgba(' + bgRgb.join(',') + ',0)' });
        tl.to(aboutIntro, { backgroundColor: 'rgb(' + bgRgb.join(',') + ')', ease: 'none', duration: ABOUT_END - ABOUT_START }, ABOUT_START);
      }

      // Photo and heading now animate together and finish together at
      // About's own midpoint; body copy starts there and runs to About's
      // own completion. xPercent (not a fixed px offset) scales with each
      // element's own width, so the off-screen start clears the viewport at
      // any width - .about-intro has overflow:hidden to contain it either way.
      if (aboutPhoto && aboutHeading && aboutBody) {
        gsap.set(aboutPhoto, { xPercent: -100, opacity: 0 });
        gsap.set(aboutHeading, { xPercent: 100, opacity: 0 });
        gsap.set(aboutBody, { xPercent: 100, opacity: 0 });

        tl.to(aboutPhoto, { xPercent: 0, opacity: 1, ease: 'none', duration: ABOUT_MID - ABOUT_START }, ABOUT_START);
        tl.to(aboutHeading, { xPercent: 0, opacity: 1, ease: 'none', duration: ABOUT_MID - ABOUT_START }, ABOUT_START);
        tl.to(aboutBody, { xPercent: 0, opacity: 1, ease: 'none', duration: ABOUT_END - ABOUT_MID }, ABOUT_MID);
      }

      // Nothing is scheduled from ABOUT_END to GRAND_END - GSAP otherwise
      // auto-computes the timeline's own total duration as the max end time
      // of its real children (0.875), which would silently stretch the
      // whole sequence to fill the full (already-extended) pin distance
      // and eliminate the hold entirely. This empty tween, targeting
      // nothing, forces the timeline's real total to match GRAND_END so
      // the scrollTrigger's scroll-distance-to-progress mapping lines up
      // with what the position numbers above assume.
      tl.to({}, { duration: GRAND_END - ABOUT_END }, ABOUT_END);

      whenEntranceSettled(function () {
        if (asideLeft) {
          tl.to(asideLeft, { z: isMobile ? 0 : -300, opacity: 0, ease: 'none' }, 0);
          asideLeft.classList.add('is-parallaxing');
        }
        if (asideRight) {
          // opacity fades linearly like the other two (so it stays comparably
          // visible throughout), but z recedes on its own curve - slower
          // early, faster late - so its motion reads as distinct, not just
          // a different endpoint
          tl.to(asideRight, { opacity: 0, ease: 'none' }, 0);
          tl.to(asideRight, { z: isMobile ? 0 : -550, ease: isMobile ? 'none' : asideRightEase }, 0);
          asideRight.classList.add('is-parallaxing');
        }
        tl.progress(tl.progress()); // re-render at current scroll position now the tweens exist
      });
    });
  }
  initHeroShrink();

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
     incoming glyph slides up into place from below, repeating through
     random letters before landing on the correct character - a vertical
     slot-reel decode. Holds for `holdMs` once fully settled, then decodes
     into the next word.

     Flip cadence is eased rather than fixed-interval: each character
     flips through `flipsPerChar` random letters plus one final settling
     flip, with the GAP between successive flips slow at the start and
     end (~maxGapMs) and fast in the middle (~minGapMs). There's no fixed
     total-duration target anymore - it falls out of flipsPerChar x the
     eased gaps x the per-character stagger.
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

    var flipsPerChar = 10; // random flips before the final settling flip
    var minGapMs = 250; // gap between flips at the fastest point (middle of the sequence)
    var maxGapMs = 500; // gap between flips at the slowest point (start/end of the sequence)
    var staggerStepMs = 80; // ripple delay between the start of each character's own sequence
    var flipDuration = 0.03; // seconds, each slide-in/slide-out tween - kept short so
                              // flips read as a crisp flicker rather than a blur
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    // Sample GSAP's power2.inOut ease against a triangular "distance from
    // the middle of the sequence" value: that ease is slow-velocity at its
    // own edges (0 and 1) and fast in the middle, so applying it to
    // `centered` (1 at the sequence's edges, 0 at its middle) produces a
    // smoothed bowl - eased(1)=1 -> maxGapMs at the edges, eased(0)=0 ->
    // minGapMs in the middle.
    var bowlEase = gsap.parseEase('power2.inOut');
    function gapForFlipIndex(g, totalGaps) {
      var t = g / (totalGaps - 1);
      var centered = Math.abs(t - 0.5) * 2;
      var eased = bowlEase(centered);
      return minGapMs + (maxGapMs - minGapMs) * eased;
    }

    var totalGaps = flipsPerChar + 1; // +1 for the final settling flip
    var sequenceDurationMs = 0;
    for (var gi = 0; gi < totalGaps; gi++) {
      sequenceDurationMs += gapForFlipIndex(gi, totalGaps);
    }

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
      // Ripple: character i's own eased flip sequence starts staggerStepMs
      // later than character i-1's, left-to-right across the word.
      var t = i * staggerStepMs;
      for (var g = 0; g < totalGaps; g++) {
        t += gapForFlipIndex(g, totalGaps);
        var isFinal = (g === totalGaps - 1);
        (function (time, final) {
          gsap.delayedCall(time / 1000, function () {
            doFlip(i, final ? toChar : randomLetter(), final);
          });
        })(t, isFinal);
      }
    }

    var index = 0;
    function cycle() {
      var toChars = words[index].split('');
      for (var i = 0; i < maxLen; i++) {
        scheduleSlot(i, toChars[i] || '');
      }
      // The last character starts latest and takes the same eased-sequence
      // duration as every other character, so it's always the one that
      // settles last.
      var totalSettleMs = (maxLen - 1) * staggerStepMs + sequenceDurationMs;
      gsap.delayedCall(totalSettleMs / 1000, function () {
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
