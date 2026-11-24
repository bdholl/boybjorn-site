/* Boy Bjorn Radio, shared by the homepage and /press.
   Needs <section class="radio hidden" id="radio"></section> on the page, radio.css,
   and window.BB with RELEASE, LINKS.presave and RADIO { preview, appleArtistId }.
   Plays a 1-minute preview of The River first (until release day), then shuffled
   30-second previews of every released song from Apple's public catalog. */
(function(){
  var box = document.getElementById('radio'), BB = window.BB || {};
  if (!box || !BB.RADIO) return;
  var R = BB.RADIO, L = BB.LINKS || {}, out = new Date() >= new Date(BB.RELEASE);
  var q = [], i = 0, started = false, au = new Audio(); au.preload = 'none';
  var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  var PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
  box.innerHTML =
    '<div class="radio-top"><span>Boy Bjorn Radio</span><span class="onair"><i></i><span data-r="onair">Tune in</span></span></div>' +
    '<div class="dial" aria-hidden="true"><div class="ticks"></div><div class="nums"><span>88</span><span>92</span><span>96</span><span>100</span><span>104</span><span>108</span></div><div class="needle" data-r="needle" style="left:8%"></div></div>' +
    '<div class="np"><img data-r="art" alt="" src="/cover.jpg"><div class="np-text"><small data-r="kicker">Up first</small><b data-r="title">The River</b><span data-r="sub"></span></div></div>' +
    '<div class="bar"><i data-r="bar"></i></div>' +
    '<div class="ctrls"><button class="play" data-r="play" type="button" aria-label="Play">' + PLAY + '</button>' +
    '<button class="skip" data-r="skip" type="button" aria-label="Next song"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6v12l8.5-6zM16 6h2v12h-2z"/></svg></button>' +
    '<div class="full" data-r="links"></div></div>' +
    '<p class="radio-note">Song previews, shuffled. Tap a link to hear the full song.</p>';
  var $ = function(k){ return box.querySelector('[data-r="' + k + '"]'); };
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function spotify(t){ return 'https://open.spotify.com/search/' + encodeURIComponent('Boy Bjorn ' + t); }
  if (!out && R.preview) q.push({ title: 'The River', sub: 'New single · out Dec 4', art: '/cover.jpg', src: R.preview, kicker: 'World premiere', links: L.presave ? [['Pre-save', L.presave, 'presave']] : [] });
  function render(){
    var t = q[i]; if (!t) return;
    $('title').textContent = t.title; $('sub').textContent = t.sub; $('art').src = t.art;
    $('kicker').textContent = started ? (t.kicker || 'Now playing') : 'Up first';
    $('needle').style.left = (8 + (i % 12) * 7.6) + '%';
    var lk = $('links'); lk.innerHTML = '';
    t.links.forEach(function(l){
      var a = el('a', null, l[0]); a.href = l[1]; a.target = '_blank'; a.rel = 'noopener';
      a.addEventListener('click', function(){ if (window.fbq) fbq('trackCustom', 'MusicClick', {service: l[2], from: 'radio', song: t.title}); });
      lk.appendChild(a);
    });
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: 'Boy Bjorn', album: t.sub, artwork: [{ src: new URL(t.art, location.href).href, sizes: '300x300' }] });
  }
  function load(n){ i = (n + q.length) % q.length; au.src = q[i].src; render(); }
  function play(){ if (!au.src) load(i); au.play().catch(function(){}); }
  $('play').addEventListener('click', function(){
    if (au.paused) { started = true; play(); if (window.fbq && !box.dataset.played) { box.dataset.played = 1; fbq('trackCustom', 'RadioPlay'); } }
    else au.pause();
  });
  $('skip').addEventListener('click', function(){ started = true; load(i + 1); play(); });
  au.addEventListener('ended', function(){ load(i + 1); play(); });
  au.addEventListener('play', function(){ box.classList.add('playing'); $('play').innerHTML = PAUSE; $('play').setAttribute('aria-label', 'Pause'); $('onair').textContent = 'On air'; render(); });
  au.addEventListener('pause', function(){ box.classList.remove('playing'); $('play').innerHTML = PLAY; $('play').setAttribute('aria-label', 'Play'); $('onair').textContent = 'Paused'; });
  au.addEventListener('timeupdate', function(){ $('bar').style.width = (au.duration ? au.currentTime / au.duration * 100 : 0) + '%'; });
  if ('mediaSession' in navigator) navigator.mediaSession.setActionHandler('nexttrack', function(){ load(i + 1); play(); });

  fetch('https://itunes.apple.com/lookup?id=' + R.appleArtistId + '&entity=song&limit=200&country=us')
    .then(function(r){ return r.json(); })
    .then(function(d){
      var seen = {}, songs = (d.results || []).filter(function(r){ return r.wrapperType === 'track' && r.previewUrl && !/remix/i.test(r.trackName) && (r.artistName || '').toLowerCase() === 'boy bjorn'; });
      songs.sort(function(a, b){ return /coffee music|sessions/i.test(a.collectionName) - /coffee music|sessions/i.test(b.collectionName); });
      songs = songs.filter(function(r){ var k = r.trackName.toLowerCase(); if (seen[k] || (!out && k === 'the river')) return false; return (seen[k] = true); });
      for (var j = songs.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)), x = songs[j]; songs[j] = songs[k]; songs[k] = x; }
      songs.sort(function(a, b){ return (b.trackName === 'The River') - (a.trackName === 'The River'); });
      songs.forEach(function(r){
        var album = (r.collectionName || '').replace(/ - (Single|EP)$/, ''), single = / - Single$/.test(r.collectionName || '');
        q.push({ title: r.trackName, sub: (single ? 'Single' : album) + ' · ' + (r.releaseDate || '').slice(0, 4), art: (r.artworkUrl100 || '').replace('100x100bb', '300x300bb'), src: r.previewUrl,
                 links: [['Spotify', spotify(r.trackName), 'spotify'], ['Apple Music', r.trackViewUrl, 'apple']] });
      });
    })
    .catch(function(){})
    .then(function(){ if (q.length) { render(); box.classList.remove('hidden'); } });
})();
