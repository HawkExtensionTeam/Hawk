first = true;

function loadCustomBackground() {
  chrome.storage.local.get('bg', (result) => {
    if (!$('body').hasClass('popup') && !$('body').hasClass('settings-body')) {
      if (result.bg !== '' && result.bg !== undefined) {
        $('body').css('background-image', `url(${result.bg})`);
      } else {
        $('body').css('background-image', 'var(--comic-bg)');
      }
    }
  });
}

function loadAppearance() {
  if (!first) {
    $('.card-title-md').addClass('changing');
    $('.note-container').addClass('changing');
    $('.settings-container').addClass('changing');
  } else {
    first = false;
  }
  chrome.storage.local.get('theme', (result) => {
    if (result.theme === 'dark') {
      $('html').addClass('dark');
      $('html').attr('data-bs-theme', 'dark');
    } else {
      $('html').removeClass('dark');
      $('html').attr('data-bs-theme', 'light');
    }
    loadCustomBackground();
  });
  setTimeout(() => {
    $('.card-title-md').removeClass('changing');
    $('.note-container').removeClass('changing');
    $('.settings-container').removeClass('changing');
  }, 500);
}

if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
  chrome.runtime.onMessage.addListener(
    (request) => {
      if (request === 'wallpaper') {
        loadCustomBackground();
      } else if (request === 'theme') {
        loadAppearance();
      }
    },
  );
  loadAppearance();
  loadCustomBackground();
  $('body').removeClass('hidden');
}
