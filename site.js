(function(){
  "use strict";

  const FEATURE_ICONS = ['★','🤝','🎨','🏆','🛠️','📈','⚔️','🎯'];

  function escapeHtml(s){
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function showToast(msg){
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=> t.classList.remove('show'), 3200);
  }

  // Lien de téléchargement : par défaut le paquet produit par l'espace
  // créateur (bouton "Publier une nouvelle version", qui écrit toujours
  // build/EsportsDirector_<version>.zip). Renseigner downloadUrl dans
  // config.js permet de pointer ailleurs — utile si le zip est hébergé
  // hors du site (Drive, GitHub Releases...), notamment parce que
  // beaucoup d'hébergeurs statiques refusent un fichier de cette taille.
  function resolveDownloadUrl(cfg){
    if(cfg.downloadUrl) return cfg.downloadUrl;
    if(!cfg.version) return '';
    return `build/EsportsDirector_${cfg.version}.zip`;
  }

  function render(cfg){
    document.title = `${cfg.gameName || 'Jeu'} — Télécharger la bêta`;
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };

    set('hdrGameName', cfg.gameName);
    set('footerGameName', cfg.gameName);
    set('footerYear', new Date().getFullYear());
    set('heroVersion', cfg.version || '');
    set('heroTitle', cfg.gameName);
    set('heroTagline', cfg.tagline);
    set('betaNotice', cfg.betaNotice || '');
    set('descriptionText', cfg.description);
    set('downloadVersion', cfg.version || '—');
    set('downloadNote', cfg.downloadNote || '');

    // Fonctionnalités
    const grid = document.getElementById('featuresGrid');
    grid.innerHTML = (cfg.features || []).map((f, i) => `
      <div class="feature-card">
        <div class="icon">${FEATURE_ICONS[i % FEATURE_ICONS.length]}</div>
        <p>${escapeHtml(f)}</p>
      </div>`).join('');

    // Captures d'écran (ou placeholders si aucune n'est encore configurée)
    const shots = document.getElementById('shotsGrid');
    const list = cfg.screenshots && cfg.screenshots.length ? cfg.screenshots : [null,null,null];
    shots.innerHTML = list.map(src => src
      ? `<div class="shot"><img src="${src}" alt="Capture d'écran"></div>`
      : `<div class="shot">Capture à venir</div>`
    ).join('');

    // Bouton de téléchargement : désactivé tant qu'aucune version n'est
    // publiée (plutôt qu'un lien mort qui renverrait une page 404 au
    // testeur sans lui dire pourquoi).
    const url = resolveDownloadUrl(cfg);
    const label = cfg.downloadButtonLabel
      || (cfg.version ? `Télécharger ${cfg.version}` : 'Télécharger');
    const downloadBtn = document.getElementById('downloadBtn');
    if(downloadBtn){
      if(url){
        downloadBtn.href = url;
        downloadBtn.textContent = label;
        downloadBtn.removeAttribute('disabled');
      } else {
        downloadBtn.href = '#';
        downloadBtn.textContent = 'Bientôt disponible';
        downloadBtn.setAttribute('disabled','');
        downloadBtn.addEventListener('click', (e)=>{
          e.preventDefault();
          showToast("Aucune version n'est encore publiée au téléchargement.");
        });
      }
    }
    // Le bouton du hero mène simplement à la section, mais son libellé
    // suit l'état réel du téléchargement.
    const heroBtn = document.getElementById('heroDownloadBtn');
    if(heroBtn && !url) heroBtn.textContent = 'Bientôt disponible';

    set('downloadHelp', cfg.downloadHelpText || '');

    // Notes de patch
    const cl = document.getElementById('changelogList');
    cl.innerHTML = (cfg.changelog || []).map(e => `
      <div class="changelog-entry">
        <div class="v">${escapeHtml(e.version)}</div>
        <p>${escapeHtml(e.highlight)}</p>
      </div>`).join('') || '<p class="section-sub">Aucune note de patch pour le moment.</p>';
  }

  if(window.SITE_CONFIG){
    render(window.SITE_CONFIG);
  } else {
    document.getElementById('heroTagline').textContent =
      "Impossible de charger le contenu du site (config.js absent ou non chargé avant site.js).";
  }
})();
