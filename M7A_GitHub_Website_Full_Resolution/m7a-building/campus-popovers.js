// Transient overlays never participate in saved directory or sheet state.
export function createCampusPopovers(root, chooseLanguage) {
  const controller=new AbortController(),signal=controller.signal;
  const pairs=[['campus-settings','campus-settings-panel'],['campus-filter-toggle','campus-filter-panel']].map(([a,b])=>[root.querySelector('#'+a),root.querySelector('#'+b)]);
  let active=null;
  function position(){if(!active)return;const [button,panel]=active,v=visualViewport,top=v?.offsetTop||0,left=v?.offsetLeft||0,width=v?.width||innerWidth,height=v?.height||innerHeight,rect=button.getBoundingClientRect();panel.style.maxHeight=Math.max(80,height-24)+'px';panel.style.width=Math.min(310,width-24)+'px';const box=panel.getBoundingClientRect();panel.style.left=Math.max(left+12,Math.min(left+width-box.width-12,rect.left))+'px';panel.style.top=Math.max(top+12,Math.min(top+height-box.height-12,rect.bottom+8))+'px';}
  function close(restore=false){if(!active)return;const [button,panel]=active;active=null;panel.hidden=true;button.setAttribute('aria-expanded','false');if(restore&&button.isConnected)button.focus({preventScroll:true});}
  for(const pair of pairs){pair[0].addEventListener('click',()=>{if(active===pair){close(true);return;}close();active=pair;pair[1].hidden=false;pair[0].setAttribute('aria-expanded','true');position();pair[1].querySelector('button')?.focus({preventScroll:true});},{signal});}
  document.addEventListener('pointerdown',e=>{if(active&&!active.some(el=>el.contains(e.target)))close();},{signal});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();e.stopImmediatePropagation();close(true);}},{signal,capture:true});
  root.querySelectorAll('[data-language-choice]').forEach(button=>button.addEventListener('click',()=>chooseLanguage(button.dataset.languageChoice),{signal}));
  root.querySelector('#campus-about').addEventListener('click',()=>close(),{signal});
  window.addEventListener('resize',()=>close(),{signal});visualViewport?.addEventListener('resize',position,{signal});visualViewport?.addEventListener('scroll',position,{signal});
  function update(){const ar=document.documentElement.lang==='ar';root.querySelector('#campus-settings').setAttribute('aria-label',ar?'الإعدادات':'Settings');root.querySelector('#campus-settings-title').textContent=ar?'الإعدادات':'Settings';root.querySelector('[data-settings-label=language]').textContent=ar?'اللغة':'Language';root.querySelector('[data-settings-label=appearance]').textContent=ar?'المظهر':'Appearance';for(const button of root.querySelectorAll('[data-language-choice]'))button.setAttribute('aria-pressed',String(button.dataset.languageChoice===document.documentElement.lang));for(const [i,button]of [...root.querySelectorAll('[data-theme-choice]')].entries())button.textContent=(ar?['فاتح','داكن','النظام']:['Light','Dark','System'])[i];root.querySelector('#campus-about').textContent=ar?'عن دليل الحرم الجامعي':'About Campus Navigator';root.querySelector('#campus-filter-title').textContent=ar?'التصفية':'Filters';position();}
  const observer=new MutationObserver(update);observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});update();
  return {close,destroy(){close();observer.disconnect();controller.abort();}};
}
