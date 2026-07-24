document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "medbridge-theme";

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  // Build the floating light/dark toggle button.
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "theme-toggle";
  toggle.setAttribute("aria-label", "Toggle dark mode");
  toggle.innerHTML =
    '<span class="theme-toggle__icon theme-toggle__icon--sun">☀️</span>' +
    '<span class="theme-toggle__icon theme-toggle__icon--moon">🌙</span>';

  toggle.addEventListener("click", () => {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  document.body.appendChild(toggle);

  // Keep in sync if the user changes their OS theme and hasn't explicitly
  // chosen one on this device yet.
  if (!localStorage.getItem(STORAGE_KEY) && window.matchMedia) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", (event) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        document.documentElement.setAttribute("data-theme", event.matches ? "dark" : "light");
      }
    });
  }
});
