document.addEventListener('DOMContentLoaded', function () {

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     Lenis smooth scroll
     ------------------------------------------------------------------- */
  var lenis = null;
  if (window.Lenis && !prefersReducedMotion) {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    (function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    })();

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
     Hero word-scramble: cycles through a list of words, decoding each
     letter from random characters over `scrambleMs`, then holding the
     settled word for `holdMs` before scrambling into the next one.
     ------------------------------------------------------------------- */
  function TextScramble(el) {
    this.el = el;
    this.chars = '!<>-_\\/[]{}—=+*^?#0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    this.queue = [];
    this.frameRequest = null;
    this.startTime = null;
    this.resolve = null;
    this.update = this.update.bind(this);
  }
  TextScramble.prototype.randomChar = function () {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  };
  TextScramble.prototype.setText = function (newText, duration) {
    var oldText = this.el.textContent;
    var length = Math.max(oldText.length, newText.length);
    var self = this;
    var promise = new Promise(function (resolve) { self.resolve = resolve; });

    this.queue = [];
    for (var i = 0; i < length; i++) {
      var from = oldText[i] || '';
      var to = newText[i] || '';
      // Staggered cascade: character i starts decoding partway through the
      // first half of the animation and is guaranteed settled by `duration`
      // (the very last character lands exactly on `duration`).
      var start = (i / length) * duration * 0.5;
      var end = duration * (0.5 + 0.5 * ((i + 1) / length));
      this.queue.push({ from: from, to: to, start: start, end: end, char: '' });
    }

    if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
    this.startTime = null;
    this.duration = duration;
    this.frameRequest = requestAnimationFrame(this.update);
    return promise;
  };
  TextScramble.prototype.update = function (now) {
    if (this.startTime === null) this.startTime = now;
    var elapsed = now - this.startTime;
    var output = '';
    var doneCount = 0;

    for (var i = 0; i < this.queue.length; i++) {
      var item = this.queue[i];
      if (elapsed >= item.end) {
        doneCount++;
        if (item.to) output += item.to;
      } else if (elapsed >= item.start) {
        if (!item.char || Math.random() < 0.3) {
          item.char = this.randomChar();
        }
        output += '<span class="scramble-char">' + item.char + '</span>';
      } else if (item.from) {
        output += item.from;
      }
    }

    this.el.innerHTML = output;

    if (doneCount === this.queue.length) {
      this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
    }
  };

  function initHeroScramble() {
    var el = document.getElementById('heroScramble');
    if (!el) return;

    var words = ['Advertising', 'Explainer', 'Web-Video', 'Corporate', 'Commercial', 'Character'];
    var scrambleMs = prefersReducedMotion ? 0 : 3000;
    var holdMs = 3000;
    var fx = new TextScramble(el);
    var index = 0;

    function cycle() {
      fx.setText(words[index], scrambleMs).then(function () {
        setTimeout(function () {
          index = (index + 1) % words.length;
          cycle();
        }, holdMs);
      });
    }
    cycle();
  }
  initHeroScramble();

});
