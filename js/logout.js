document.addEventListener("DOMContentLoaded", () => {
  const countdownEl = document.getElementById("countdown");
  let secondsLeft = 5;

  const interval = setInterval(() => {
    secondsLeft -= 1;
    if (secondsLeft <= 0) {
      clearInterval(interval);
      window.location.href = "index.html";
      return;
    }
    countdownEl.textContent = secondsLeft;
  }, 1000);

  // Cancel the auto-redirect if the user interacts with the page.
  document.getElementById("loginAgainBtn").addEventListener("click", () => {
    clearInterval(interval);
  });
});
