/** Clé de stockage du thème et script exécuté avant le premier rendu (évite le flash de thème). */
export const THEME_STORAGE_KEY = 'nexafi-theme';

export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var d=t==='dark'||((t!=='light')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;
