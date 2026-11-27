(function(){
  "use strict";
  const { cfg, escapeHtml } = window.SiteUtils;
  const wrap = document.getElementById('faqList');
  if(!cfg){ wrap.textContent = 'Impossible de charger le contenu (config.js absent).'; return; }
  wrap.innerHTML = (cfg.faq || []).map(q => `
    <details class="fold">
      <summary>${escapeHtml(q.question)}</summary>
      <p>${escapeHtml(q.answer)}</p>
    </details>`).join('') || '<p>Aucune question pour le moment.</p>';
})();
