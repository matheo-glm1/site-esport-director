(function(){
  "use strict";

  /* ============================================================
     Publication en un clic depuis l'espace créateur : lit le dossier
     source du jeu, minifie tout le JavaScript (esbuild compilé en
     WebAssembly, chargé à la demande depuis un CDN — pas besoin de
     Node.js ni d'installer quoi que ce soit), compresse le résultat en
     .zip (fflate) et l'écrit directement dans build/ à côté de ce
     fichier. Réimplémente exactement la même logique que
     build_release.py (voir ce fichier, dans le dossier du jeu), mais
     entièrement dans le navigateur.
     ============================================================ */

  const EXCLUDE_TOP_LEVEL = new Set([
    ".claude", "__pycache__", ".git",
    "build_release.py", "Créer le paquet de vente.bat",
    "boutique_site.zip", "devtools",
  ]);

  const ESBUILD_VERSION = "0.28.2";
  const FFLATE_VERSION = "0.8.3";
  const INLINE_SCRIPT_RE = /(<script>)([\s\S]*?)(<\/script>)/g;

  function loadScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Échec de chargement : " + src));
      document.head.appendChild(s);
    });
  }

  let libsReady = null;
  function ensureLibs(log){
    if(!libsReady){
      libsReady = (async () => {
        log("Chargement des outils de minification (esbuild + fflate, ~14 Mo la première fois)…");
        await loadScript(`https://cdn.jsdelivr.net/npm/esbuild-wasm@${ESBUILD_VERSION}/lib/browser.min.js`);
        await loadScript(`https://cdn.jsdelivr.net/npm/fflate@${FFLATE_VERSION}/umd/index.js`);
        await window.esbuild.initialize({
          wasmURL: `https://cdn.jsdelivr.net/npm/esbuild-wasm@${ESBUILD_VERSION}/esbuild.wasm`,
        });
        log("Outils prêts.");
      })();
    }
    return libsReady;
  }

  async function minifyJs(code, label, log){
    if(!code.trim()) return { code, ok:false };
    try{
      const result = await window.esbuild.transform(code, { minify:true, loader:"js" });
      if(!result.code.trim()) throw new Error("résultat vide");
      return { code: result.code, ok:true };
    }catch(err){
      log(`  ! ${label} : échec de minification (${err.message || err}) — conservé tel quel.`);
      return { code, ok:false };
    }
  }

  function detectVersion(scriptJsText){
    const m = scriptJsText.match(/PATCH_NOTES_HISTORY\s*=\s*\[\s*\{\s*version\s*:\s*'([^']+)'/);
    return m ? m[1] : "dev";
  }

  async function collectFiles(dirHandle, relPath, isTopLevel, out){
    for await (const [name, handle] of dirHandle.entries()){
      if(isTopLevel && EXCLUDE_TOP_LEVEL.has(name)) continue;
      const rel = relPath ? `${relPath}/${name}` : name;
      if(handle.kind === "directory"){
        await collectFiles(handle, rel, false, out);
      } else {
        out.push({ rel, handle });
      }
    }
  }

  async function publishNewVersion({ log, setProgress }){
    if(!("showDirectoryPicker" in window)){
      log("❌ Ton navigateur ne supporte pas la sélection de dossier (Chrome ou Edge requis).");
      return null;
    }

    await ensureLibs(log);

    log("Choisis le dossier source du jeu (ex. « Version en developpement »)…");
    let gameDir;
    try{ gameDir = await window.showDirectoryPicker({ id:"game-source", mode:"read" }); }
    catch(e){ log("Annulé."); return null; }

    log("Lecture des fichiers…");
    const files = [];
    await collectFiles(gameDir, "", true, files);
    log(`${files.length} fichiers trouvés.`);

    const fileMap = {};
    let scriptJsText = null;
    let before = 0, after = 0, minifiedCount = 0;

    for(let i=0;i<files.length;i++){
      const { rel, handle } = files[i];
      setProgress(i+1, files.length, rel);
      const file = await handle.getFile();
      const lower = rel.toLowerCase();

      if(lower.endsWith(".js")){
        const text = await file.text();
        before += text.length;
        const { code, ok } = await minifyJs(text, rel, log);
        after += code.length;
        if(ok) minifiedCount++;
        if(lower === "script.js") scriptJsText = text; // version lue sur l'ORIGINAL, avant minification
        fileMap[rel] = new TextEncoder().encode(code);

      } else if(lower.endsWith(".html") || lower.endsWith(".htm")){
        const text = await file.text();
        before += text.length;
        let result = "", lastIndex = 0;
        const matches = [...text.matchAll(INLINE_SCRIPT_RE)];
        for(const m of matches){
          result += text.slice(lastIndex, m.index);
          const { code, ok } = await minifyJs(m[2], `${rel} (script inline)`, log);
          if(ok) minifiedCount++;
          result += m[1] + code + m[3];
          lastIndex = m.index + m[0].length;
        }
        result += text.slice(lastIndex);
        after += result.length;
        fileMap[rel] = new TextEncoder().encode(result);

      } else {
        fileMap[rel] = new Uint8Array(await file.arrayBuffer());
      }
    }

    const version = scriptJsText ? detectVersion(scriptJsText) : "dev";
    log(`Version détectée : ${version}`);
    log(`Fichiers minifiés : ${minifiedCount} — code : ${(before/1024).toFixed(0)} Ko → ${(after/1024).toFixed(0)} Ko`);

    log("Compression du paquet…");
    const zipped = window.fflate.zipSync(fileMap, { level:6 });

    log("Choisis le dossier de CE SITE (celui qui contient creator.html) pour enregistrer le paquet…");
    let siteDir;
    try{ siteDir = await window.showDirectoryPicker({ id:"site-dest", mode:"readwrite" }); }
    catch(e){ log("Annulé (le paquet n'a pas été enregistré)."); return null; }

    const buildDir = await siteDir.getDirectoryHandle("build", { create:true });

    // Nettoie les anciens paquets, comme build_release.py.
    for await (const [name, handle] of buildDir.entries()){
      if(handle.kind === "file" && /^EsportsDirector_.*\.zip$/i.test(name)){
        await buildDir.removeEntry(name);
      }
    }

    const zipHandle = await buildDir.getFileHandle(`EsportsDirector_${version}.zip`, { create:true });
    const writable = await zipHandle.createWritable();
    await writable.write(zipped);
    await writable.close();

    log(`✅ Paquet publié : build/EsportsDirector_${version}.zip (${(zipped.length/1024/1024).toFixed(1)} Mo)`);
    return version;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("publishBtn");
    const logEl = document.getElementById("publishLog");
    const progressEl = document.getElementById("publishProgress");
    if(!btn) return;

    const log = (msg) => {
      logEl.style.display = "block";
      logEl.textContent += msg + "\n";
      logEl.scrollTop = logEl.scrollHeight;
    };
    const setProgress = (i, total, rel) => {
      progressEl.textContent = `${i} / ${total} — ${rel}`;
    };

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      logEl.textContent = "";
      progressEl.textContent = "";
      try{
        const version = await publishNewVersion({ log, setProgress });
        if(version){
          const versionField = document.getElementById("f_version");
          if(versionField) versionField.value = version;
        }
      }catch(err){
        console.error(err);
        log(`❌ Erreur inattendue : ${err.message || err}`);
      }finally{
        btn.disabled = false;
        progressEl.textContent = "";
      }
    });
  });
})();
