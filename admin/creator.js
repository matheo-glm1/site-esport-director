(function(){
  "use strict";

  let cfg = null;        // configuration en cours d'édition

  function showToast(msg){
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=> t.classList.remove('show'), 3200);
  }

  /* ============================================================
     CHARGEMENT — config.js (chargé en <script> avant ce fichier, voir
     admin/editor.php) pose déjà window.SITE_CONFIG ; on en fait une copie
     profonde pour éditer librement sans toucher l'objet d'origine.
     L'écriture réelle (Enregistrer) est gérée à part, plus bas.
     ============================================================ */
  async function loadConfig(){
    if(!window.SITE_CONFIG) throw new Error('config.js introuvable ou non chargé');
    return JSON.parse(JSON.stringify(window.SITE_CONFIG));
  }

  /* ============================================================
     FORMULAIRE
     ============================================================ */
  function populateForm(){
    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val ?? ''; };
    setVal('f_gameName', cfg.gameName);
    setVal('f_version', cfg.version);
    setVal('f_tagline', cfg.tagline);
    setVal('f_description', cfg.description);
    setVal('f_downloadUrl', cfg.downloadUrl);
    setVal('f_downloadButtonLabel', cfg.downloadButtonLabel);
    setVal('f_betaNotice', cfg.betaNotice);
    setVal('f_downloadNote', cfg.downloadNote);
    setVal('f_downloadHelpText', cfg.downloadHelpText);
    setVal('f_contactEmail', cfg.contactEmail);
    ['donationUrl','donationText','donationGoal','donationRaised','hostingInfo'].forEach(k => setVal('f_' + k, cfg[k]));
    setVal('f_legalEntityName', cfg.legalEntityName);
    setVal('f_legalCountry', cfg.legalCountry);
    setVal('f_legalAddress', cfg.legalAddress);

    renderFeatures();
    renderShots();
    renderChangelog();
    renderFaq();
    refreshFileStatus();
  }

  function renderFeatures(){
    const wrap = document.getElementById('featuresList');
    wrap.innerHTML = '';
    (cfg.features || []).forEach((val, i) => {
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML = `<input type="text" value="${escapeAttr(val)}"><button class="rm" title="Supprimer">✕</button>`;
      row.querySelector('input').addEventListener('input', e => cfg.features[i] = e.target.value);
      row.querySelector('.rm').addEventListener('click', () => { cfg.features.splice(i,1); renderFeatures(); });
      wrap.appendChild(row);
    });
  }
  document.getElementById('addFeatureBtn').addEventListener('click', ()=>{
    cfg.features = cfg.features || [];
    cfg.features.push('');
    renderFeatures();
  });

  function renderShots(){
    const wrap = document.getElementById('shotsList');
    wrap.innerHTML = '';
    (cfg.screenshots || []).forEach((src, i) => {
      const box = document.createElement('div');
      box.className = 'shot-thumb';
      const path = typeof src === 'string' ? src : src.src;
      box.innerHTML = `<img src="${escapeAttr(/^(data:|https:)/i.test(path) ? path : '../' + path)}" alt=""><button class="rm" style="position:absolute;top:4px;right:4px;padding:2px 6px;">✕</button>`;
      box.querySelector('.rm').addEventListener('click', () => { cfg.screenshots.splice(i,1); renderShots(); });
      wrap.appendChild(box);
    });
  }
  document.getElementById('addShotBtn').addEventListener('click', ()=> document.getElementById('shotUpload').click());
  document.getElementById('shotUpload').addEventListener('change', (e)=>{
    const files = Array.from(e.target.files || []);
    cfg.screenshots = cfg.screenshots || [];
    let pending = files.length;
    if(!pending) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        cfg.screenshots.push(reader.result);
        if(--pending === 0) renderShots();
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });

  function renderChangelog(){
    const wrap = document.getElementById('changelogList');
    wrap.innerHTML = '';
    (cfg.changelog || []).forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML = `
        <div style="flex:1;">
          <input type="text" placeholder="Version (ex. V0.3.4)" value="${escapeAttr(entry.version)}" style="margin-bottom:6px;">
          <textarea placeholder="Résumé de la mise à jour">${escapeAttr(entry.highlight)}</textarea>
        </div>
        <button class="rm" title="Supprimer">✕</button>`;
      const inputs = row.querySelectorAll('input,textarea');
      inputs[0].addEventListener('input', e => entry.version = e.target.value);
      inputs[1].addEventListener('input', e => entry.highlight = e.target.value);
      row.querySelector('.rm').addEventListener('click', () => { cfg.changelog.splice(i,1); renderChangelog(); });
      wrap.appendChild(row);
    });
  }
  document.getElementById('addChangelogBtn').addEventListener('click', ()=>{
    cfg.changelog = cfg.changelog || [];
    cfg.changelog.unshift({ version:'', highlight:'' });
    renderChangelog();
  });

  function renderFaq(){
    const wrap = document.getElementById('faqList');
    wrap.innerHTML = '';
    (cfg.faq || []).forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML = `
        <div style="flex:1;">
          <input type="text" placeholder="Question" value="${escapeAttr(entry.question)}" style="margin-bottom:6px;">
          <textarea placeholder="Réponse">${escapeAttr(entry.answer)}</textarea>
        </div>
        <button class="rm" title="Supprimer">✕</button>`;
      const inputs = row.querySelectorAll('input,textarea');
      inputs[0].addEventListener('input', e => entry.question = e.target.value);
      inputs[1].addEventListener('input', e => entry.answer = e.target.value);
      row.querySelector('.rm').addEventListener('click', () => { cfg.faq.splice(i,1); renderFaq(); });
      wrap.appendChild(row);
    });
  }
  document.getElementById('addFaqBtn').addEventListener('click', ()=>{
    cfg.faq = cfg.faq || [];
    cfg.faq.push({ question:'', answer:'' });
    renderFaq();
  });

  function escapeAttr(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function gatherFormIntoConfig(){
    const val = id => document.getElementById(id).value;
    cfg.gameName = val('f_gameName');
    cfg.version = val('f_version');
    cfg.tagline = val('f_tagline');
    cfg.description = val('f_description');
    cfg.downloadUrl = val('f_downloadUrl').trim();
    cfg.downloadButtonLabel = val('f_downloadButtonLabel');
    cfg.betaNotice = val('f_betaNotice');
    cfg.downloadNote = val('f_downloadNote');
    cfg.downloadHelpText = val('f_downloadHelpText');
    cfg.contactEmail = val('f_contactEmail').trim();
    ['donationUrl','donationText','donationGoal','donationRaised','hostingInfo'].forEach(k => cfg[k] = val('f_' + k).trim());
    cfg.legalEntityName = val('f_legalEntityName');
    cfg.legalCountry = val('f_legalCountry');
    cfg.legalAddress = val('f_legalAddress');
    // features / screenshots / changelog / faq sont déjà tenus à jour en
    // direct par les listeners d'input ci-dessus.
  }

  /* ============================================================
     ENREGISTREMENT — envoyé à save.php, qui vérifie la session, le jeton
     CSRF et chaque champ avant d'écrire config.js.
     ============================================================ */
  function refreshFileStatus(){
    document.getElementById('fileStatus').textContent = 'Connecté';
  }

  async function saveConfig(){
    gatherFormIntoConfig();
    delete cfg.creatorPasswordHash;
    try{
      const res = await fetch('save.php', {
        method:'POST',
        credentials:'same-origin',
        headers:{
          'Content-Type':'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
        },
        body: JSON.stringify(cfg),
      });
      const data = await res.json().catch(() => ({}));
      showToast(res.ok && data.ok ? '✅ Modifications enregistrées.'
        : `Non enregistré : ${data.error || 'erreur ' + res.status}`);
    }catch(err){
      console.error(err);
      showToast('Non enregistré : le serveur ne répond pas.');
    }
  }
  document.getElementById('saveBtn').addEventListener('click', saveConfig);

  /* ============================================================ */
  loadConfig()
    .then(data => { cfg = data; populateForm(); })
    .catch(err => {
      console.error(err);
      showToast('Impossible de charger config.js.');
    });
})();
