(function(){
  "use strict";

  let cfg = null;        // configuration en cours d'édition
  let fileHandle = null; // handle d'écriture (File System Access API), si disponible

  function showToast(msg){
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=> t.classList.remove('show'), 3200);
  }

  async function sha256Hex(text){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  /* ============================================================
     CHARGEMENT — config.js (chargé en <script> avant ce fichier, voir
     creator.html) pose déjà window.SITE_CONFIG ; on en fait une copie
     profonde pour éditer librement sans toucher l'objet d'origine.
     L'écriture réelle (Enregistrer) est gérée à part, plus bas.
     ============================================================ */
  async function loadConfig(){
    if(!window.SITE_CONFIG) throw new Error('config.js introuvable ou non chargé');
    return JSON.parse(JSON.stringify(window.SITE_CONFIG));
  }

  function initGate(){
    document.getElementById('lockSub').textContent =
      cfg.creatorPasswordHash
        ? 'Entrez le mot de passe créateur pour continuer.'
        : 'Premier lancement : choisissez un mot de passe créateur.';
    if(cfg.creatorPasswordHash){
      document.getElementById('loginForm').style.display = 'block';
    } else {
      document.getElementById('setupForm').style.display = 'block';
    }
  }

  function unlockEditor(){
    document.getElementById('lockWrap').classList.add('hide');
    document.getElementById('editorShell').classList.add('show');
    populateForm();
  }

  document.getElementById('setupBtn').addEventListener('click', async ()=>{
    const p1 = document.getElementById('setupPass1').value;
    const p2 = document.getElementById('setupPass2').value;
    if(!p1 || p1.length < 4){ showToast('Mot de passe trop court (4 caractères minimum).'); return; }
    if(p1 !== p2){ showToast('Les deux mots de passe ne correspondent pas.'); return; }
    cfg.creatorPasswordHash = await sha256Hex(p1);
    unlockEditor();
    showToast('Mot de passe défini — pensez à cliquer sur Enregistrer pour le sauvegarder.');
  });

  document.getElementById('loginBtn').addEventListener('click', async ()=>{
    const p = document.getElementById('loginPass').value;
    const hash = await sha256Hex(p);
    if(hash === cfg.creatorPasswordHash){
      unlockEditor();
    } else {
      document.getElementById('loginError').style.display = 'block';
    }
  });

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
      box.innerHTML = `<img src="${src}"><button class="rm" style="position:absolute;top:4px;right:4px;padding:2px 6px;">✕</button>`;
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

  document.getElementById('changePassBtn').addEventListener('click', async ()=>{
    const p1 = document.getElementById('f_newPass1').value;
    const p2 = document.getElementById('f_newPass2').value;
    if(!p1 || p1.length < 4){ showToast('Mot de passe trop court (4 caractères minimum).'); return; }
    if(p1 !== p2){ showToast('Les deux mots de passe ne correspondent pas.'); return; }
    cfg.creatorPasswordHash = await sha256Hex(p1);
    document.getElementById('f_newPass1').value = '';
    document.getElementById('f_newPass2').value = '';
    showToast('Mot de passe mis à jour — cliquez sur Enregistrer pour le sauvegarder.');
  });

  function escapeAttr(s){ return String(s ?? '').replace(/"/g, '&quot;'); }

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
    cfg.legalEntityName = val('f_legalEntityName');
    cfg.legalCountry = val('f_legalCountry');
    cfg.legalAddress = val('f_legalAddress');
    // features / screenshots / changelog / faq sont déjà tenus à jour en
    // direct par les listeners d'input ci-dessus.
  }

  /* ============================================================
     ENREGISTREMENT — File System Access API si disponible (réécrit
     directement le config.js déjà ouvert, sans manipulation manuelle) ;
     sinon repli universel : déclenche le téléchargement du fichier mis
     à jour, à glisser soi-même dans le dossier du site pour remplacer
     l'ancien. Format .js (window.SITE_CONFIG = {...}) et non .json : un
     <script src> se charge sans serveur, y compris en double-clic
     (file://), contrairement à un fetch('config.json').
     ============================================================ */
  function refreshFileStatus(){
    document.getElementById('fileStatus').textContent = fileHandle
      ? '📄 config.js ouvert en écriture directe'
      : ('showSaveFilePicker' in window)
        ? '📄 Enregistrer vous demandera de choisir config.js une première fois'
        : '📄 Enregistrer téléchargera un config.js à remplacer manuellement';
  }

  async function saveConfig(){
    gatherFormIntoConfig();
    const fileContent = `window.SITE_CONFIG = ${JSON.stringify(cfg, null, 2)};\n`;

    if('showSaveFilePicker' in window){
      try{
        if(!fileHandle){
          fileHandle = await window.showSaveFilePicker({
            suggestedName: 'config.js',
            types: [{ description:'JavaScript', accept: { 'text/javascript': ['.js'] } }],
          });
        }
        const writable = await fileHandle.createWritable();
        await writable.write(fileContent);
        await writable.close();
        refreshFileStatus();
        showToast('✅ config.js enregistré.');
        return;
      }catch(err){
        if(err && err.name === 'AbortError') return; // l'utilisateur a annulé la boîte de dialogue
        console.warn('Écriture directe impossible, repli sur le téléchargement :', err);
      }
    }

    // Repli : téléchargement classique.
    const blob = new Blob([fileContent], { type:'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'config.js';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast('⬇️ config.js téléchargé — remplacez le fichier dans le dossier du site.');
  }
  document.getElementById('saveBtn').addEventListener('click', saveConfig);

  /* ============================================================ */
  loadConfig()
    .then(data => { cfg = data; initGate(); })
    .catch(err => {
      console.error(err);
      document.getElementById('lockSub').textContent =
        "Impossible de charger config.js. Vérifiez que le fichier est bien présent à côté de creator.html.";
    });
})();
