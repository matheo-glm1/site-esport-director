/* Fonctions partagées par les pages publiques. */
window.SiteUtils = (function(){
  "use strict";

  function escapeHtml(s){
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* N'accepte qu'un lien https ou un chemin relatif au site : un
     « javascript: » ou « data: » glissé dans config.js n'est jamais suivi. */
  function safeUrl(value, { httpsOnly = false } = {}){
    const s = String(value ?? '').trim();
    if(!s) return '';
    if(/^https:\/\//i.test(s)) return s;
    if(httpsOnly) return '';
    return /^[a-z][a-z0-9+.-]*:|^[\\/]{2}|[\x00-\x1f]/i.test(s) ? '' : s;
  }

  function safeImage(value){
    const s = String(value ?? '').trim();
    return /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(s) ? s : safeUrl(s);
  }

  function setText(id, value){
    const el = document.getElementById(id);
    if(el) el.textContent = value ?? '';
  }

  const cfg = window.SITE_CONFIG;
  if(cfg){
    document.querySelectorAll('[data-game-name]').forEach(el => el.textContent = cfg.gameName || 'Esports Director');
  }
  setText('footerYear', new Date().getFullYear());

  return { cfg, escapeHtml, safeUrl, safeImage, setText };
})();
