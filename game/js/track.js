// King of the Jungle — play analytics (v17.1)
// Sends a few game events to Google Analytics 4 so we can see where new players stop playing.
// OFF until a Measurement ID is pasted below (it looks like "G-AB12CD34EF"). With no ID nothing is sent anywhere.
(function () {
  var GA_ID = ''; // <-- paste the Google Analytics Measurement ID here

  var on = /^G-[A-Z0-9]{4,}$/.test(GA_ID);
  var dbg = /[?&]trackdebug/.test(location.search);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (on) {
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
    // one-line notice on the cover so players know
    addEventListener('DOMContentLoaded', function () {
      var n = document.createElement('div');
      n.className = 'track-note';
      n.textContent = 'This game uses Google Analytics to see how it’s played.';
      n.style.cssText = 'position:fixed;left:0;right:0;bottom:2px;text-align:center;font:11px/1.2 sans-serif;color:rgba(255,255,255,.45);pointer-events:none;z-index:5';
      var menu = document.getElementById('menu'); (menu || document.body).appendChild(n);
      var hide = function () { if (!menu || menu.classList.contains('hidden')) n.remove(); };
      new MutationObserver(hide).observe(menu || document.body, { attributes: true, attributeFilter: ['class'] });
    });
  }
  function count(k) { try { var v = +(localStorage.getItem('kotj.trk.' + k) || 0); localStorage.setItem('kotj.trk.' + k, v + 1); return v; } catch (_) { return 1; } }
  // KOTJTrack(name, params) — safe to call anywhere; does nothing when analytics is off
  window.KOTJTrack = function (name, params) {
    params = params || {};
    if (dbg) console.log('[track]', name, params);
    if (on) gtag('event', name, params);
  };
  // funnel helpers used by the game
  window.KOTJTrack.fightStart = function (p) {
    var n = count('fights');
    window.KOTJTrack('fight_start', Object.assign({ fight_number: n + 1 }, p));
    if (n === 0) window.KOTJTrack('first_fight_start', p);
    if (n === 1) window.KOTJTrack('second_fight_start', p);
  };
  window.KOTJTrack.fightEnd = function (p) {
    var n = count('fightsDone');
    window.KOTJTrack('fight_end', Object.assign({ fight_number: n + 1 }, p));
    if (n === 0) window.KOTJTrack('first_fight_end', p);
  };
  addEventListener('load', function () { window.KOTJTrack('title_view', { returning: count('visits') > 0 }); });
})();
