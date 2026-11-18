// Game entry. Phase C replaces this with the full boot. For now it hides the splash.
const splash = document.getElementById('splash');
if (splash) {
  splash.classList.add('gone');
  setTimeout(() => splash.remove(), 300);
}
