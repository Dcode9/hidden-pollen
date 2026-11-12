/* Hidden Pollen - UI wiring. All processing stays in the browser. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var coverImg = $('cover'), secretEl = $('secret'), capEl = $('capacity');
  var encStatus = $('enc-status'), decStatus = $('dec-status');
  var coverBitmap = null; // ImageBitmap of the current cover

  function say(el, msg, kind) { el.textContent = msg; el.className = 'status' + (kind ? ' ' + kind : ''); }

  function loadImageFile(file) {
    return createImageBitmap(file).then(function (bmp) { return bmp; });
  }
  function loadImageUrl(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('image fetch failed: ' + r.status);
      return r.blob();
    }).then(loadImageFile);
  }
  function drawToImageData(bmp) {
    var c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0);
    return { canvas: c, ctx: ctx, imageData: ctx.getImageData(0, 0, c.width, c.height) };
  }
  function setCover(bmp) {
    coverBitmap = bmp;
    coverImg.src = (function () { var d = drawToImageData(bmp); return d.canvas.toDataURL('image/png'); })();
    coverImg.hidden = false;
    var cap = Stego.capacityBytes(bmp.width * bmp.height);
    capEl.textContent = 'cover ' + bmp.width + 'x' + bmp.height + ' - hides up to ' + cap + ' bytes';
    $('encode').disabled = false;
    say(encStatus, '');
  }

  // --- cover sources ---
  $('gen').addEventListener('click', function () {
    var prompt = $('prompt').value.trim() || 'a meadow of glowing flowers, digital art';
    if (!needKey(encStatus)) return;
    say(encStatus, 'generating cover image with Pollinations (uses your connected Pollen balance)...');
    $('gen').disabled = true;
    var url = 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) +
      '?width=1024&height=1024&nologo=true&seed=' + Math.floor(Math.random() * 1e9) +
      '&key=' + encodeURIComponent(userKey());
    loadImageUrl(url).then(setCover).then(function () {
      say(encStatus, 'cover ready', 'ok'); $('gen').disabled = false;
    }).catch(function (e) {
      say(encStatus, 'generation failed: ' + e.message, 'err'); $('gen').disabled = false;
    });
  });
  $('pick').addEventListener('click', function () { $('file').click(); });
  $('file').addEventListener('change', function (e) {
    if (e.target.files[0]) loadImageFile(e.target.files[0]).then(setCover).catch(function (err) {
      say(encStatus, 'could not read image: ' + err.message, 'err');
    });
  });
  function wireDrop(el, onFile) {
    el.addEventListener('dragover', function (e) { e.preventDefault(); el.classList.add('over'); });
    el.addEventListener('dragleave', function () { el.classList.remove('over'); });
    el.addEventListener('drop', function (e) {
      e.preventDefault(); el.classList.remove('over');
      if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
    });
  }
  wireDrop($('drop'), function (f) { loadImageFile(f).then(setCover).catch(function (err) {
    say(encStatus, 'could not read image: ' + err.message, 'err'); }); });
  $('drop').addEventListener('click', function () { $('file').click(); });

  // --- encode ---
  $('encode').addEventListener('click', function () {
    if (!coverBitmap) return;
    var msg = secretEl.value;
    try {
      var d = drawToImageData(coverBitmap);
      Stego.encode(d.imageData, msg);
      d.ctx.putImageData(d.imageData, 0, 0);
      d.canvas.toBlob(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'hidden-pollen.png';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
        say(encStatus, 'message hidden - PNG downloaded. Share it; only this page reveals the secret.', 'ok');
      }, 'image/png');
    } catch (e) {
      say(encStatus, e.message, 'err');
    }
  });

  // --- decode ---
  function decodeFile(file) {
    loadImageFile(file).then(function (bmp) {
      var d = drawToImageData(bmp);
      var msg = Stego.decode(d.imageData);
      $('revealed').value = msg;
      say(decStatus, msg ? 'message revealed' : 'the image hides an empty message', 'ok');
    }).catch(function (e) {
      say(decStatus, 'no hidden message found (' + e.message + ')', 'err');
    });
  }
  $('pick2').addEventListener('click', function () { $('file2').click(); });
  $('file2').addEventListener('change', function (e) { if (e.target.files[0]) decodeFile(e.target.files[0]); });
  wireDrop($('drop2'), decodeFile);
  $('drop2').addEventListener('click', function () { $('file2').click(); });
  // --- fable mode ---
  var lastSvg = null;
  var polliEl = $('polli');
  function userKey() { return polliEl && polliEl.apiKey ? polliEl.apiKey : null; }
  function needKey(statusEl) {
    var k = userKey();
    if (!k) say(statusEl, 'connect your Pollen balance first (button in AI hide-and-seek above)', 'err');
    return k;
  }
  $('fable-hide').addEventListener('click', function () {
    var secret = $('fable-secret').value.trim();
    if (!secret) { say($('fable-status'), 'enter a secret first', 'err'); return; }
    if (!needKey($('fable-status'))) return;
    say($('fable-status'), 'AI is drawing your secret into an SVG...');
    $('fable-hide').disabled = true;
    Fable.hide(secret, { key: userKey() }).then(function (r) {
      lastSvg = r.svg;
      $('svg-view').innerHTML = r.svg;
      $('fable-detect').disabled = false;
      $('fable-hide').disabled = false;
      say($('fable-status'), 'SVG drawn. Can a fresh AI session spot the secret?', 'ok');
    }).catch(function (e) {
      $('fable-hide').disabled = false;
      say($('fable-status'), 'hide failed: ' + e.message, 'err');
    });
  });
  $('fable-detect').addEventListener('click', function () {
    if (!lastSvg) return;
    if (!needKey($('fable-status'))) return;
    say($('fable-status'), 'fresh AI session is inspecting the SVG...');
    $('fable-detect').disabled = true;
    Fable.detect(lastSvg, { key: userKey() }).then(function (r) {
      $('fable-result').value = r.analysis;
      $('fable-detect').disabled = false;
      say($('fable-status'), r.hidden ? 'detected - the cover was blown' : 'clean - the secret stayed hidden',
          r.hidden ? 'err' : 'ok');
    }).catch(function (e) {
      $('fable-detect').disabled = false;
      say($('fable-status'), 'detect failed: ' + e.message, 'err');
    });
  });

})();
