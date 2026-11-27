(function(){
  "use strict";
  const { cfg, setText } = window.SiteUtils;
  if(!cfg){ setText('editorInfo', 'Impossible de charger le contenu (config.js absent).'); return; }
  setText('lawCountry', cfg.legalCountry || '—');
  setText('editorInfo', [cfg.legalEntityName, cfg.legalAddress, cfg.contactEmail && `Contact : ${cfg.contactEmail}`]
    .filter(Boolean).join(' · ') || 'Informations non renseignées.');
  if(cfg.hostingInfo){
    document.getElementById('hostingBlock').hidden = false;
    setText('hostingInfo', cfg.hostingInfo);
  }
})();
