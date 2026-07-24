document.addEventListener("DOMContentLoaded", () => {

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
