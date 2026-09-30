// Runs before styles/boot: appearance has no map, scene or History API effects.
(()=>{
  const key='hallv3.theme.v1';
  const choices=['light','dark'];let preference='light';
  try{const saved=localStorage.getItem(key);if(choices.includes(saved))preference=saved;}catch{}
  function apply(){
    const theme=preference;
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.colorScheme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#101B1A':'#F4F2EC');
    const ar=document.documentElement.lang==='ar',dark=theme==='dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(button=>{
      button.textContent=dark?(ar?'☀ فاتح':'☀ Light'):(ar?'☾ داكن':'☾ Dark');
      button.setAttribute('aria-label',ar?(dark?'التبديل إلى الوضع الفاتح':'التبديل إلى الوضع الداكن'):(dark?'Switch to light mode':'Switch to dark mode'));
      button.setAttribute('aria-pressed',String(dark));
    });
    dispatchEvent(new CustomEvent('hallv3-theme-change',{detail:{preference,theme}}));
  }
  function choose(value){if(!choices.includes(value))return;preference=value;try{localStorage.setItem(key,value);}catch{}apply();}
  document.addEventListener('click',event=>{if(event.target.closest('[data-theme-toggle]'))choose(preference==='dark'?'light':'dark');});
  new MutationObserver(apply).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  document.addEventListener('DOMContentLoaded',apply,{once:true});apply();
})();
