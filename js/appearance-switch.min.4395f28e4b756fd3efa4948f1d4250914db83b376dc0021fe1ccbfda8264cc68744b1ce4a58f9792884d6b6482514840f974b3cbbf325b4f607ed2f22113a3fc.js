(function(){const e=localStorage.getItem("appearance");document.documentElement.setAttribute("data-appearance",e==="light"?"light":e==="dark"?"dark":"auto");const t=document.createElement("style");t.textContent=`
    .appearance-auto { display: none; align-items: center; justify-content: center; }
    .appearance-auto .icon svg { height: 1em; width: 1em; }
    html[data-appearance="auto"] #appearance-switcher > div:not(.appearance-auto),
    html[data-appearance="auto"] #appearance-switcher-mobile > div:not(.appearance-auto) { display: none; }
    html[data-appearance="auto"] .appearance-auto { display: flex; }
  `,document.head.appendChild(t);const n=`<div class="appearance-auto"><span class="relative block icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9"/>
  <path d="M12 3 A 9 9 0 0 1 12 21 Z" fill="currentColor" stroke="none"/>
</svg>
</span></div>`;addEventListener("DOMContentLoaded",()=>{for(const s of["appearance-switcher","appearance-switcher-mobile"]){const t=document.getElementById(s);if(!t)continue;const e=t.querySelectorAll(":scope > div");e.length>=2&&([e[0].innerHTML,e[1].innerHTML]=[e[1].innerHTML,e[0].innerHTML]),t.insertAdjacentHTML("beforeend",n)}}),addEventListener("click",e=>{if(!e.target.closest("#appearance-switcher,#appearance-switcher-mobile"))return;e.stopImmediatePropagation();const n=localStorage.getItem("appearance"),t=n==="light"?"dark":n==="dark"?null:"light";t===null?localStorage.removeItem("appearance"):localStorage.setItem("appearance",t),document.documentElement.setAttribute("data-appearance",t??"auto");const s=t==="dark"||t===null&&matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",s),window.updateMeta?.(),window.updateMermaidTheme?.()},!0)})()