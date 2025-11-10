// === DECLUTTERER: Calm Mode Script ===

// Remove autoplay videos, ads, and banners
document.querySelectorAll('video, iframe, [role="banner"], [class*="ad"], [id*="ad"]').forEach(el => el.remove());

// Stop any carousels or animations
document.querySelectorAll('*').forEach(el => {
  el.style.animation = 'none';
  el.style.transition = 'none';
});

// Replace fonts with dyslexia-friendly, clean sans-serif
document.body.style.fontFamily = "'OpenDyslexic', Arial, sans-serif";
document.body.style.lineHeight = '1.6';
document.body.style.letterSpacing = '0.05em';

// Set calm, low-contrast background and readable colours
document.body.style.backgroundColor = '#F5F5F5';
document.body.style.color = '#222';

// Remove popups or overlays
document.querySelectorAll('[class*="popup"], [class*="modal"], [id*="overlay"]').forEach(el => el.remove());

// Optional: Focus main content area
let main = document.querySelector('main') || document.body;
main.scrollIntoView({ behavior: "smooth" });

console.log("✅ Declutterer: Calm Mode activated");
