document.addEventListener("DOMContentLoaded", () => {

  // Show the actual logged-in user (set during login/registration) instead
  // of the static placeholder markup.
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem("medbridge-auth"));
  } catch (e) {
    session = null;
  }

  if (session && session.username) {
    const nameEl = document.querySelector(".user-menu__name");
    const avatarEl = document.querySelector(".user-menu__avatar");

    if (nameEl) nameEl.textContent = session.username;
    if (avatarEl) {
      avatarEl.textContent = session.username.slice(0, 2).toUpperCase();
    }
  }

  const trigger = document.getElementById("userMenuTrigger");
  const dropdown = document.getElementById("userMenuDropdown");
  const userMenu = document.getElementById("userMenu");

  if (trigger && dropdown && userMenu) {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = dropdown.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
      if (!userMenu.contains(event.target)) {
        dropdown.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        dropdown.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Dismiss drug interaction alert
  const dismissAlert = document.getElementById("dismissAlert");
  const interactionAlert = document.getElementById("interactionAlert");

  if (dismissAlert && interactionAlert) {
    dismissAlert.addEventListener("click", () => {
      interactionAlert.classList.add("hidden");
    });
  }

  // Highlight active nav item based on current page
  const navItems = document.querySelectorAll(".nav-item");
  const currentPage = window.location.pathname.split("/").pop();

  navItems.forEach((item) => {
    if (item.getAttribute("href") === currentPage) {
      item.classList.add("active");
    }
  });
});
