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

function loadAppearance(usepref) {
  if (!first) {
    $('.card-title-lg').addClass('changing');
    $('.card-title-md').addClass('changing');
    $('.note-container').addClass('changing');
    $('.settings-container').addClass('changing');
    $('.filter-btn').addClass('changing');
    $('.panel-lg').addClass('changing');
  } else {
    first = false;
  }
  chrome.storage.local.get('theme', (result) => {
    let decision = result.theme;
    if (usepref === true && window.matchMedia) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        decision = 'dark';
      } else {
        decision = 'light';
      }
    }
    if (decision === 'dark') {
      $('html').addClass('dark');
      $('html').attr('data-bs-theme', 'dark');
    } else {
      $('html').removeClass('dark');
      $('html').attr('data-bs-theme', 'light');
    }
    loadCustomBackground();
  });
  setTimeout(() => {
    $('.card-title-lg').removeClass('changing');
    $('.card-title-md').removeClass('changing');
    $('.note-container').removeClass('changing');
    $('.settings-container').removeClass('changing');
    $('.filter-btn').removeClass('changing');
    $('.panel-lg').removeClass('changing');
  }, 500);
}

if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
  chrome.runtime.onMessage.addListener(
    (request) => {
      if (request === 'wallpaper') {
        loadCustomBackground();
      } else if (request === 'theme') {
        chrome.storage.local.get('useprefer', (result) => {
          loadAppearance(result.useprefer);
        });
      }
    },
  );
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    chrome.storage.local.get('useprefer', (result) => {
      if (result.useprefer === true) {
        loadAppearance(true);
      }
    });
  });
  chrome.storage.local.get('useprefer', (result) => {
    loadAppearance(result.useprefer);
  });
  $('body').removeClass('hidden');
}
