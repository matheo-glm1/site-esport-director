/* Page d'accueil. */
(function(){
  "use strict";
  const { cfg, escapeHtml, safeUrl, safeImage, setText } = window.SiteUtils;
  if(!cfg){
    setText('heroTagline', "Impossible de charger le contenu du site (config.js absent).");
    return;
  }
  const $ = id => document.getElementById(id);
  const fill = (id, items, html) => { const el = $(id); if(el) el.innerHTML = (items || []).map(html).join(''); };

  document.title = `${cfg.gameName || 'Jeu'} : démo gratuite à télécharger`;
  setText('heroTagline', cfg.tagline);
  setText('betaNotice', cfg.betaNotice);
  setText('descriptionText', cfg.description);
  setText('downloadVersion', cfg.version);
  setText('downloadNote', cfg.downloadNote);
  setText('downloadHelp', cfg.downloadHelpText);

  fill('featuresGrid', cfg.features, f => `<li>${escapeHtml(f)}</li>`);
  fill('originsList', cfg.origins, o => `<li>${escapeHtml(o)}</li>`);
  fill('rosterList', cfg.disciplines, d => `
    <li class="${d.playable ? 'playable' : 'later'}">${escapeHtml(d.name)}
      <span>${d.playable ? 'Jouable dans la démo' : 'Pas encore disponible'}</span></li>`);

  /* ---- Téléchargement ---- */
  // Sans downloadUrl, on pointe sur le paquet écrit par l'espace créateur.
  const url = safeUrl(cfg.downloadUrl || (cfg.version ? `build/EsportsDirector_${cfg.version}.zip` : ''));
  const label = cfg.downloadButtonLabel || `Télécharger la démo ${cfg.version || ''}`.trim();
  ['heroDownloadBtn','downloadBtn'].forEach(id => {
    const btn = $(id);
    if(url){
      btn.textContent = label;
      if(id === 'downloadBtn') btn.href = url;
    } else {
      btn.textContent = 'Bientôt disponible';
      if(id === 'downloadBtn'){ btn.removeAttribute('href'); btn.setAttribute('aria-disabled','true'); }
    }
  });

  /* ---- Cagnotte ---- */
  const donation = safeUrl(cfg.donationUrl, { httpsOnly:true });
  const donateBtn = $('donateBtn');
  setText('donationText', cfg.donationText);
  if(donation){
    donateBtn.href = donation;
    donateBtn.removeAttribute('aria-disabled');
    donateBtn.textContent = 'Faire un don';
    setText('donationNote', `Le don se fait sur ${new URL(donation).hostname}, dans un nouvel onglet. Aucun paiement ne passe par ce site.`);
  }
  const goal = Number(cfg.donationGoal), raised = Number(cfg.donationRaised) || 0;
  if(donation && goal > 0){
    const euros = n => n.toLocaleString('fr-FR') + ' €';
    $('donationGauge').hidden = false;
    $('donationBar').max = goal;
    $('donationBar').value = Math.min(raised, goal);
    setText('donationAmount', `${euros(raised)} récoltés sur ${euros(goal)}`);
  }

  /* ---- Notes de patch : la plus récente est ouverte ---- */
  fill('changelogList', cfg.changelog, (e, i) => `
    <details class="fold"${i === 0 ? ' open' : ''}>
      <summary>${escapeHtml(e.version)}</summary>
      ${String(e.highlight || '').split('\n').filter(Boolean).map(l => `<p>${escapeHtml(l)}</p>`).join('')}
    </details>`);

  /* ---- Loupe 4K ---- */
  const shots = (cfg.screenshots || []).map((s, i) => {
    const o = typeof s === 'string' ? { src:s } : (s || {});
    const src = safeImage(o.src);
    return { src, full: safeImage(o.full) || src, title: o.title || `Image ${i + 1}`, text: o.text || '' };
  }).filter(s => s.src);
  if(!shots.length){ $('loupe').hidden = true; return; }

  const tabs = $('shotTabs'), stage = $('stage'), img = $('stageImg'), lens = $('lens'), link = $('stageLink');
  let current = 0;
  tabs.innerHTML = shots.map((s, i) =>
    `<button type="button" role="tab" id="tab-${i}" aria-controls="stage">${escapeHtml(s.title)}</button>`).join('');

  function show(i){
    current = (i + shots.length) % shots.length;
    const s = shots[current];
    img.src = s.src;
    img.alt = `Capture du jeu : ${s.title}`;
    lens.style.backgroundImage = '';
    link.hidden = s.full.startsWith('data:');
    if(!link.hidden) link.href = s.full;
    setText('stageText', s.text);
    [...tabs.children].forEach((b, n) => {
      b.setAttribute('aria-selected', n === current);
      b.tabIndex = n === current ? 0 : -1;
    });
    stage.setAttribute('aria-labelledby', `tab-${current}`);
  }
  tabs.addEventListener('click', e => {
    const i = [...tabs.children].indexOf(e.target.closest('button'));
    if(i >= 0) show(i);
  });
  tabs.addEventListener('keydown', e => {
    const step = { ArrowRight:1, ArrowLeft:-1 }[e.key];
    if(!step) return;
    e.preventDefault();
    show(current + step);
    tabs.children[current].focus();
  });

  // La loupe ne sert qu'à la souris ; au tactile, on ouvre l'image 4K.
  stage.addEventListener('pointermove', e => {
    if(e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const zoom = 2.4, half = 150, border = 5;
    if(!lens.style.backgroundImage) lens.style.backgroundImage = `url("${shots[current].full}")`;
    lens.style.left = x + 'px';
    lens.style.top = y + 'px';
    lens.style.backgroundSize = `${r.width * zoom}px ${r.height * zoom}px`;
    lens.style.backgroundPosition = `${half - border - x * zoom}px ${half - border - y * zoom}px`;
    stage.classList.add('zooming');
  });
  stage.addEventListener('pointerleave', () => stage.classList.remove('zooming'));

  show(0);
})();
