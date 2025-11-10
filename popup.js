document.addEventListener('DOMContentLoaded', async () => {
  const toggleButton = document.getElementById('toggle');

  // Load saved state
  const { calmMode } = await chrome.storage.sync.get('calmMode');
  updateButton(calmMode);

  toggleButton.addEventListener('click', async () => {
    const newState = !toggleButton.classList.contains('on');
    await chrome.storage.sync.set({ calmMode: newState });
    updateButton(newState);

    // Run content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: toggleCalmMode,
      args: [newState],
    });
  });

  function updateButton(isOn) {
    toggleButton.textContent = isOn ? 'Disable Calm Mode' : 'Enable Calm Mode';
    toggleButton.classList.toggle('on', isOn);
    toggleButton.classList.toggle('off', !isOn);
  }
});

function toggleCalmMode(isOn) {
  if (isOn) {
    // Apply calm mode
    document.body.style.backgroundColor = '#F5F5F5';
    document.body.style.color = '#222';
    document.body.style.fontFamily = "'OpenDyslexic', Arial, sans-serif";
    document.querySelectorAll('video, iframe, [role="banner"], [class*="ad"], [id*="ad"]').forEach(el => el.remove());
    document.querySelectorAll('*').forEach(el => {
      el.style.animation = 'none';
      el.style.transition = 'none';
    });
    console.log('✅ Calm Mode enabled');
  } else {
    // Reload to restore normal layout
    window.location.reload();
    console.log('🌀 Calm Mode disabled');
  }
}
