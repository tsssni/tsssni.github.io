(function () {
  const cur = localStorage.getItem("appearance");
  document.documentElement.setAttribute(
    "data-appearance",
    cur === "light" ? "light" : cur === "dark" ? "dark" : "auto"
  );

  const style = document.createElement("style");
  style.textContent = `
    .appearance-auto { display: none; align-items: center; justify-content: center; }
    .appearance-auto .icon svg { height: 1em; width: 1em; }
    html[data-appearance="auto"] #appearance-switcher > div:not(.appearance-auto),
    html[data-appearance="auto"] #appearance-switcher-mobile > div:not(.appearance-auto) { display: none; }
    html[data-appearance="auto"] .appearance-auto { display: flex; }
  `;
  document.head.appendChild(style);

  const autoIconHTML = `<div class="appearance-auto"><span class="relative block icon">{{ (resources.Get "icons/auto.svg").Content | safeHTML }}</span></div>`;
  addEventListener("DOMContentLoaded", () => {
    for (const id of ["appearance-switcher", "appearance-switcher-mobile"]) {
      document.getElementById(id)?.insertAdjacentHTML("beforeend", autoIconHTML);
    }
  });

  addEventListener("click", (e) => {
    if (!e.target.closest("#appearance-switcher,#appearance-switcher-mobile")) return;
    e.stopImmediatePropagation();
    const c = localStorage.getItem("appearance");
    const next = c === "light" ? "dark" : c === "dark" ? null : "light";
    next === null ? localStorage.removeItem("appearance") : localStorage.setItem("appearance", next);
    document.documentElement.setAttribute("data-appearance", next ?? "auto");
    const dark = next === "dark" || (next === null && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    window.updateMeta?.();
    window.updateMermaidTheme?.();
  }, true);
})();
