(function(){
  "use strict";
  const { cfg, setText } = window.SiteUtils;
  if(!cfg){ setText('contactText', 'Impossible de charger le contenu (config.js absent).'); return; }
  const btn = document.getElementById('mailBtn');
  const email = String(cfg.contactEmail || '').trim();
  if(/^[^\s@?&#]+@[^\s@?&#]+$/.test(email)){
    btn.href = `mailto:${email}?subject=${encodeURIComponent((cfg.gameName || 'Jeu') + ' : contact')}`;
    setText('contactText', `Écrivez-nous à ${email}.`);
  } else {
    btn.hidden = true;
    setText('contactText', "L'adresse de contact n'est pas encore disponible.");
  }
})();
