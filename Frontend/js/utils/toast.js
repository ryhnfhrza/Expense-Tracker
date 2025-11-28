export function toast({
  title = "",
  message = "",
  status = "error",
  suggestion = null,
}) {
  const el = document.getElementById("toast");
  const color =
    status === "success"
      ? "#1de9b6"
      : status === "warn"
      ? "#ffb86b"
      : "#ff6b6b";
  el.style.background =
    "linear-gradient(90deg, rgba(10,12,22,0.85), rgba(6,8,16,0.7))";
  el.style.border = `1px solid ${color}`;
  el.style.color = "#e8f6ff";
  el.style.padding = "12px 14px";
  el.style.borderRadius = "10px";
  el.style.minWidth = "320px";
  el.style.boxShadow = "0 12px 40px rgba(2,6,23,0.6)";
  el.innerHTML = `
    <div style="font-weight:700; color:${color}; margin-bottom:6px">${title}</div>
    <div style="font-size:13px; color:#cfe6ff; margin-bottom:6px">${message}</div>
    ${
      suggestion
        ? `<div style="font-size:12px; color:#9fc8ff">Tip: ${suggestion}</div>`
        : ""
    }
  `;
  el.classList.remove("hidden");
  el.style.opacity = 0;
  el.style.transform = "translateY(12px)";
  requestAnimationFrame(() => {
    el.style.transition = "opacity .35s ease, transform .35s ease";
    el.style.opacity = 1;
    el.style.transform = "translateY(0)";
  });
  setTimeout(() => {
    el.style.opacity = 0;
    el.style.transform = "translateY(12px)";
    setTimeout(() => el.classList.add("hidden"), 350);
  }, 4200);
}
