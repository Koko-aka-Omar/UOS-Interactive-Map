// Secondary views share the directory card; saved search and sheet state stay intact.
export function createCampusPopovers(root, chooseLanguage, directory, infoPanel) {
  const controller=new AbortController(),signal=controller.signal;
  const card=root.querySelector('.campus-map-card');
  const pairs=[['campus-settings','campus-settings-panel'],['campus-filter-toggle','campus-filter-panel'],['campus-route-toggle','campus-route-panel']].map(([a,b])=>[root.querySelector('#'+a),root.querySelector('#'+b)]);
  const view=document.createElement('section');view.className='campus-card-view';view.hidden=true;
  const header=document.createElement('div');header.className='campus-card-view-header';
  const back=document.createElement('button');back.type='button';back.className='campus-card-back';
  const title=document.createElement('h2');title.id='campus-card-view-title';
  view.setAttribute('aria-labelledby',title.id);header.append(back,title);view.append(header);card.append(view);
  for(const [,panel]of pairs){panel.setAttribute('role','region');view.append(panel);}
  const about=document.createElement('section');about.className='campus-card-about';about.hidden=true;view.append(about);
  const infoCopy=infoPanel.querySelector('.info-copy');
  const content=[...card.children].filter(el=>el!==view&&!el.classList.contains('directory-sheet-handle'));
  let active=null;
  function restoreAbout(){if(about.contains(infoCopy))infoPanel.append(infoCopy);about.hidden=true;}
  function close(restore=false){
    if(!active)return;
    const opener=active[0];restoreAbout();
    for(const [button,panel]of pairs){panel.hidden=true;button.setAttribute('aria-expanded','false');}
    active=null;view.hidden=true;delete card.dataset.cardView;
    for(const el of content)el.inert=false;
    directory.setCardView(false);
    if(restore&&opener.isConnected)opener.focus({preventScroll:true});
  }
  function open(pair){
    restoreAbout();active=pair;
    for(const [button,panel]of pairs){panel.hidden=pair[1]!==panel;button.setAttribute('aria-expanded',String(pair[0]===button));}
    view.hidden=false;card.dataset.cardView=pair===pairs[0]?'settings':pair===pairs[1]?'filters':'route';
    for(const el of content)el.inert=true;
    directory.setCardView(true);update();back.focus({preventScroll:true});
  }
  for(const pair of pairs)pair[0].addEventListener('click',()=>open(pair),{signal});
  back.addEventListener('click',()=>{if(card.dataset.cardView==='route'&&!pairs[2][1].dispatchEvent(new CustomEvent('campus-route-back',{cancelable:true})))return;if(card.dataset.cardView==='about'){open(pairs[0]);root.querySelector('#campus-about').focus({preventScroll:true});}else close(true);},{signal});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();e.stopImmediatePropagation();back.click();}},{signal,capture:true});
  root.querySelectorAll('[data-language-choice]').forEach(button=>button.addEventListener('click',()=>chooseLanguage(button.dataset.languageChoice),{signal}));
  root.querySelector('#campus-about').addEventListener('click',()=>{
    pairs[0][1].hidden=true;about.append(infoCopy);about.hidden=false;card.dataset.cardView='about';update();back.focus({preventScroll:true});
  },{signal});
  root.addEventListener('campus-selection-change',()=>close(),{signal});
  root.querySelector('#campus-focus')?.addEventListener('click',()=>close(),{signal,capture:true});
  function update(){
    const ar=document.documentElement.lang==='ar';
    root.querySelector('#campus-settings').setAttribute('aria-label',ar?'الإعدادات':'Settings');
    root.querySelector('#campus-settings-title').textContent=ar?'الإعدادات':'Settings';
    root.querySelector('[data-settings-label=language]').textContent=ar?'اللغة':'Language';
    root.querySelector('[data-settings-label=appearance]').textContent=ar?'المظهر':'Appearance';
    for(const button of root.querySelectorAll('[data-language-choice]'))button.setAttribute('aria-pressed',String(button.dataset.languageChoice===document.documentElement.lang));
    for(const [i,button]of [...root.querySelectorAll('[data-theme-choice]')].entries())button.textContent=(ar?['فاتح','داكن','النظام']:['Light','Dark','System'])[i];
    root.querySelector('#campus-about').textContent=ar?'عن دليل الحرم الجامعي':'About Campus Navigator';
    root.querySelector('#campus-filter-title').textContent=ar?'التصفية':'Filters';
    root.querySelector('#campus-route-title').textContent=ar?'تخطيط المسار':'Plan a route';
    back.textContent=ar?'رجوع':'Back';
    title.textContent=card.dataset.cardView==='about'?(ar?'عن الدليل':'About'):(active?.[1].querySelector('strong')?.textContent||'');
  }
  const observer=new MutationObserver(update);observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});update();
  return {close,destroy(){close();observer.disconnect();controller.abort();}};
}
