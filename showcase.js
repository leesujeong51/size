// Responsive Viewport Studio - Master Hub Script

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. Mode Tab Switching
  // =========================================================================
  const modeTabs = document.querySelectorAll('.mode-tab');
  const modeViews = {
    comparison: document.getElementById('viewComparison'),
    simulator: document.getElementById('viewSimulator'),
    guide: document.getElementById('viewGuide')
  };
  const syncScrollControl = document.getElementById('syncScrollControl');
  const scaleSelect = document.getElementById('scaleSelect');

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetMode = tab.dataset.mode;
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      Object.keys(modeViews).forEach(key => {
        if (key === targetMode) {
          modeViews[key].classList.add('active');
        } else {
          modeViews[key].classList.remove('active');
        }
      });

      // Show/hide comparison-specific controls
      if (targetMode === 'comparison') {
        syncScrollControl.style.display = 'flex';
        scaleSelect.parentElement.style.display = 'flex';
      } else {
        syncScrollControl.style.display = 'none';
        scaleSelect.parentElement.style.display = 'none';
      }
    });
  });

  // =========================================================================
  // 2. Zoom Scale Control & Stepper for Comparison Stage
  // =========================================================================
  const comparisonStage = document.getElementById('comparisonStage');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  let isFocusActive = false;
  let previousScaleBeforeFocus = '0.65';

  function getCalculatedFitScale() {
    if (isFocusActive) return 1.0;
    // Available viewport width minus margins
    const availWidth = window.innerWidth - 60;
    // Mobile (390) + Tablet (768) + Desktop (1200) + gaps (72) = ~2430px
    const fullStageWidth = 2450;
    const computed = availWidth / fullStageWidth;
    return Math.min(1.0, Math.max(0.35, parseFloat(computed.toFixed(2))));
  }

  function applyScale(scaleVal) {
    if (!comparisonStage) return;
    comparisonStage.style.transform = `scale(${scaleVal})`;
    const stageWrapper = document.querySelector('.comparison-stage-wrapper');
    if (stageWrapper) {
      stageWrapper.style.minHeight = `${1050 * scaleVal + 60}px`;
    }
  }

  function handleScaleChange() {
    if (!scaleSelect) return;
    if (scaleSelect.value === 'fit') {
      applyScale(getCalculatedFitScale());
    } else {
      applyScale(parseFloat(scaleSelect.value));
    }
  }

  scaleSelect?.addEventListener('change', handleScaleChange);

  window.addEventListener('resize', () => {
    if (scaleSelect?.value === 'fit' && !isFocusActive) {
      handleScaleChange();
    }
  });

  zoomOutBtn?.addEventListener('click', () => {
    if (!scaleSelect) return;
    if (scaleSelect.selectedIndex > 0) {
      scaleSelect.selectedIndex--;
      handleScaleChange();
    }
  });

  zoomInBtn?.addEventListener('click', () => {
    if (!scaleSelect) return;
    if (scaleSelect.selectedIndex < scaleSelect.options.length - 1) {
      scaleSelect.selectedIndex++;
      handleScaleChange();
    }
  });

  // Apply default scale
  handleScaleChange();

  // =========================================================================
  // 3. Synchronized Scroll Across Iframes
  // =========================================================================
  const syncScrollCheckbox = document.getElementById('syncScrollCheckbox');
  const syncScrollText = document.getElementById('syncScrollText');
  const frameMobile = document.getElementById('frameMobile');
  const frameTablet = document.getElementById('frameTablet');
  const frameDesktop = document.getElementById('frameDesktop');
  const frameSimulator = document.getElementById('frameSimulator');
  const comparisonIframes = [frameMobile, frameTablet, frameDesktop];
  const allIframes = [frameMobile, frameTablet, frameDesktop, frameSimulator];

  syncScrollControl?.addEventListener('click', () => {
    if (syncScrollCheckbox) {
      syncScrollCheckbox.checked = !syncScrollCheckbox.checked;
      syncScrollControl.classList.toggle('active', syncScrollCheckbox.checked);
      if (syncScrollText) {
        syncScrollText.textContent = syncScrollCheckbox.checked ? '스크롤 연동 ON ✓' : '스크롤 연동 OFF';
      }
    }
  });

  window.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'sync_scroll') return;
    if (!syncScrollCheckbox || !syncScrollCheckbox.checked) return;

    const { percent, senderId } = event.data;

    comparisonIframes.forEach(iframe => {
      if (!iframe || iframe.name === senderId) return;
      try {
        iframe.contentWindow?.postMessage({
          type: 'apply_scroll',
          percent
        }, '*');
      } catch (err) {
        // cross-origin security boundary fallback
      }
    });
  });

  // =========================================================================
  // 4. Global URL Address Bar & Dynamic Navigation
  // =========================================================================
  const targetUrlInput = document.getElementById('targetUrlInput');
  const navigateBtn = document.getElementById('navigateBtn');
  const clearUrlBtn = document.getElementById('clearUrlBtn');
  const urlChips = document.querySelectorAll('.url-chip');
  const proxyModeToggle = document.getElementById('proxyModeToggle');
  const openExternalBtn = document.getElementById('openExternalBtn');
  const urlLoadingBar = document.getElementById('urlLoadingBar');
  const urlGuideBanner = document.getElementById('urlGuideBanner');
  const closeGuideBannerBtn = document.getElementById('closeGuideBannerBtn');

  const tabletUrlDisplay = document.getElementById('tabletUrlDisplay');
  const desktopUrlDisplay = document.getElementById('desktopUrlDisplay');
  const simUrlDisplay = document.getElementById('simUrlDisplay');

  // Check environment host
  const isFileProtocol = window.location.protocol === 'file:';
  const isLocalPyServer = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && !isFileProtocol;
  const isStaticWeb = !isFileProtocol && !isLocalPyServer; // e.g. GitHub Pages
  const fileProtocolWarning = document.getElementById('fileProtocolWarning');
  const proxyStatusPill = document.getElementById('proxyStatusPill');
  const xframeSecurityBanner = document.getElementById('xframeSecurityBanner');
  const xframeTargetDomain = document.getElementById('xframeTargetDomain');
  const closeSecurityBannerBtn = document.getElementById('closeSecurityBannerBtn');

  closeSecurityBannerBtn?.addEventListener('click', () => {
    if (xframeSecurityBanner) xframeSecurityBanner.style.display = 'none';
  });

  const knownBlockedDomains = ['naver.com', 'daum.net', 'google.com', 'youtube.com', 'instagram.com', 'facebook.com', 'twitter.com', 'x.com', 'github.com', 'tistory.com'];

  function checkFrameBlockingSites(url) {
    if (!xframeSecurityBanner) return;
    if (isLocalPyServer && proxyModeToggle?.checked) {
      xframeSecurityBanner.style.display = 'none';
      return;
    }
    const xframeText = document.querySelector('.xframe-text');

    // 1. Check for localhost on static web (Mixed Content)
    if (isStaticWeb && (url.includes('localhost') || url.includes('127.0.0.1'))) {
      if (xframeTargetDomain) xframeTargetDomain.textContent = 'localhost (로컬 개발 서버)';
      if (xframeText) {
        xframeText.innerHTML = '<strong>localhost</strong>는 브라우저 보안(Mixed Content)으로 인해 온라인 웹(GitHub Pages)에서 직접 연결할 수 없습니다. 컴퓨터에서 <strong>start_server.bat</strong>을 실행하여 로컬 서버(<code>http://localhost:8080</code>)로 접속하시면 정상 작동합니다.';
      }
      xframeSecurityBanner.style.display = 'block';
      return;
    }

    // 2. Check for known iframe-blocking domains on static web
    const isBlocked = knownBlockedDomains.some(d => url.toLowerCase().includes(d));
    if (isBlocked && isStaticWeb) {
      if (xframeTargetDomain) {
        try {
          const parsed = new URL(url);
          xframeTargetDomain.textContent = parsed.hostname;
        } catch (e) {
          xframeTargetDomain.textContent = '입력하신 사이트';
        }
      }
      if (xframeText) {
        xframeText.innerHTML = `<strong>${xframeTargetDomain?.textContent || '해당 사이트'}</strong>는 자체 보안 정책(X-Frame-Options)으로 인해 외부 임베드가 차단되어 있습니다. 우측 <strong>[새 탭]</strong> 버튼으로 확인하시거나, 방송대/위키백과/모어해빗 등 임베드 지원 사이트를 이용해주세요.`;
      }
      xframeSecurityBanner.style.display = 'block';
      return;
    }

    xframeSecurityBanner.style.display = 'none';
  }

  if (isFileProtocol) {
    if (fileProtocolWarning) fileProtocolWarning.style.display = 'block';
    if (proxyStatusPill) {
      proxyStatusPill.textContent = '⚠️ file:/// 모드';
      proxyStatusPill.closest('.proxy-pill-switch')?.classList.add('offline');
    }
  } else if (isLocalPyServer) {
    if (fileProtocolWarning) fileProtocolWarning.style.display = 'none';
    if (proxyStatusPill) {
      proxyStatusPill.textContent = '⚡ 로컬 프록시 ON';
    }
  } else {
    // Static web hosting like GitHub Pages
    if (fileProtocolWarning) fileProtocolWarning.style.display = 'none';
    if (proxyModeToggle) {
      proxyModeToggle.checked = false; // Do not call non-existent /proxy
    }
    if (proxyStatusPill) {
      proxyStatusPill.textContent = '🌐 웹 배포 모드';
      const switchEl = proxyStatusPill.closest('.proxy-pill-switch');
      if (switchEl) {
        switchEl.classList.add('static-mode');
        switchEl.setAttribute('title', '깃허브 정적 웹 호스팅 환경에서는 직접 로드(Direct Load) 방식으로 동작합니다.');
      }
    }
  }

  let currentLoadedUrl = 'https://www.knou.ac.kr/sites/knou/index.do';

  function formatDisplayUrl(url) {
    if (url.includes('knou.ac.kr')) return 'knou.ac.kr/sites/knou';
    if (url.includes('morehabit') || url.includes('myroutine-app')) return 'morehabit/index.html';
    if (url.startsWith('file://') || /^[a-zA-Z]:[\\\/]/.test(url)) {
      const parts = url.split(/[\\\/]/);
      return parts.slice(-2).join('/');
    }
    return url.replace(/^https?:\/\//, '');
  }

  function triggerLoadingBar() {
    if (!urlLoadingBar) return;
    urlLoadingBar.className = 'url-loading-bar loading';
    setTimeout(() => {
      urlLoadingBar.className = 'url-loading-bar complete';
      setTimeout(() => {
        urlLoadingBar.className = 'url-loading-bar';
      }, 500);
    }, 1200);
  }

  function navigateTo(rawUrl) {
    let url = (rawUrl || '').trim();
    if (!url) url = 'https://www.knou.ac.kr/sites/knou/index.do';

    // Auto-map myroutine local path to repository morehabit/index.html
    if (url.includes('myroutine-app') && (isStaticWeb || !url.startsWith('file://'))) {
      url = 'morehabit/index.html';
    }

    // 1. Check relative path in repository (e.g. morehabit/index.html)
    if (url.endsWith('.html') && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
      allIframes.forEach(frame => {
        if (frame) frame.src = url;
      });
      if (xframeSecurityBanner) xframeSecurityBanner.style.display = 'none';
      finishNavigation(url);
      return;
    }

    let iframeSrc = url;

    // 2. Check if it's a local file path (file:/// or C:\ or C:/)
    if (url.startsWith('file://') || /^[a-zA-Z]:[\\\/]/.test(url)) {
      let cleanPath = url.replace(/^file:\/\/\/?/, '').replace(/\\/g, '/');

      if (isLocalPyServer) {
        // Route through local filesystem bridge
        iframeSrc = `/localfs/${cleanPath}`;
      } else {
        iframeSrc = `file:///${cleanPath}`;
      }

      allIframes.forEach(frame => {
        if (frame) frame.src = iframeSrc;
      });

      finishNavigation(url);
      return;
    }

    // 3. Web URL formatting
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) {
        url = 'http://' + url;
      } else {
        url = 'https://' + url;
      }
    }

    const isProxyWanted = proxyModeToggle ? proxyModeToggle.checked : false;
    const isExternal = !url.includes('localhost') && !url.includes('127.0.0.1');

    // ONLY use /proxy on local Python server!
    if (isExternal && isLocalPyServer && isProxyWanted) {
      // Use device-aware proxy on local http server
      if (frameMobile) frameMobile.src = `/proxy?url=${encodeURIComponent(url)}&device=mobile`;
      if (frameTablet) frameTablet.src = `/proxy?url=${encodeURIComponent(url)}&device=tablet`;
      if (frameDesktop) frameDesktop.src = `/proxy?url=${encodeURIComponent(url)}&device=desktop`;
      if (frameSimulator) {
        const simDevice = currentW < 768 ? 'mobile' : (currentW < 1024 ? 'tablet' : 'desktop');
        frameSimulator.src = `/proxy?url=${encodeURIComponent(url)}&device=${simDevice}`;
      }
    } else {
      // Direct load (Default on GitHub Pages and static web)
      allIframes.forEach(frame => {
        if (frame) frame.src = url;
      });

      if (isFileProtocol && isExternal) {
        if (fileProtocolWarning) fileProtocolWarning.style.display = 'block';
      }
    }

    // Check for known X-Frame-Options blocking sites on static web
    checkFrameBlockingSites(url);

    finishNavigation(url);
  }

  function finishNavigation(url) {
    currentLoadedUrl = url;
    if (targetUrlInput) targetUrlInput.value = url;
    if (openExternalBtn) openExternalBtn.href = url;
    updateTargetPill(url);

    // Display URL strings in device headers
    const disp = formatDisplayUrl(url);
    if (tabletUrlDisplay) tabletUrlDisplay.textContent = disp;
    if (desktopUrlDisplay) desktopUrlDisplay.textContent = disp;
    if (simUrlDisplay) simUrlDisplay.textContent = disp;

    // Update desktop mockup browser tab
    const desktopTab = document.querySelector('.active-tab');
    if (desktopTab) {
      const tabTitle = desktopTab.querySelector('.tab-title');
      const tabFavicon = desktopTab.querySelector('.tab-favicon');
      if (tabTitle) {
        if (url.includes('knou.ac.kr')) {
          tabTitle.textContent = '국립한국방송통신대학교';
          if (tabFavicon) tabFavicon.textContent = '🎓';
        } else if (url.includes('morehabit') || url.includes('myroutine-app')) {
          tabTitle.textContent = '모어해빗 - 루틴 매니저';
          if (tabFavicon) tabFavicon.textContent = '⭐';
        } else {
          tabTitle.textContent = disp;
          if (tabFavicon) tabFavicon.textContent = '🌐';
        }
      }
    }

    // Trigger visual loading
    triggerLoadingBar();

    // Update active state of preset chips
    urlChips.forEach(chip => {
      if (chip.dataset.url === url || ((url.includes('morehabit') || url.includes('myroutine-app')) && chip.classList.contains('chip-myroutine'))) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    try {
      localStorage.setItem('responsive_studio_last_url', url);
    } catch (e) {}
  }

  // Project Selector & Target Pill Synchronization
  const projectSelect = document.getElementById('projectSelect');
  const currentTargetPill = document.getElementById('currentTargetPill');

  function updateTargetPill(url) {
    if (currentTargetPill) {
      if (url.includes('knou.ac.kr')) {
        currentTargetPill.textContent = '🎓 국립한국방송통신대학교';
      } else if (url.includes('morehabit') || url.includes('myroutine-app')) {
        currentTargetPill.textContent = '⭐ 모어해빗 (내 루틴 앱)';
      } else if (url.includes('naver.com')) {
        currentTargetPill.textContent = '🟢 네이버';
      } else if (url.includes('wikipedia.org')) {
        currentTargetPill.textContent = '📚 위키백과';
      } else if (url.includes('tailwindcss.com')) {
        currentTargetPill.textContent = '⚡ Tailwind CSS';
      } else if (url.includes('localhost:3000')) {
        currentTargetPill.textContent = '💻 React (3000)';
      } else if (url.includes('localhost:5173')) {
        currentTargetPill.textContent = '💻 Vite (5173)';
      } else {
        currentTargetPill.textContent = '🌐 ' + formatDisplayUrl(url);
      }
    }

    if (projectSelect) {
      let matched = false;
      for (let opt of projectSelect.options) {
        if (opt.value === url) {
          projectSelect.value = url;
          matched = true;
          break;
        }
      }
      if (!matched) {
        projectSelect.selectedIndex = -1;
      }
    }
  }

  projectSelect?.addEventListener('change', (e) => {
    if (e.target.value) {
      navigateTo(e.target.value);
    }
  });

  // Canvas Fullscreen Toggle
  const appFullscreenBtn = document.getElementById('appFullscreenBtn');
  appFullscreenBtn?.addEventListener('click', () => {
    document.body.classList.toggle('canvas-fullscreen');
  });

  // Navigate actions
  navigateBtn?.addEventListener('click', () => {
    navigateTo(targetUrlInput?.value);
  });

  targetUrlInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateTo(targetUrlInput.value);
    }
  });

  clearUrlBtn?.addEventListener('click', () => {
    if (targetUrlInput) {
      targetUrlInput.value = '';
      targetUrlInput.focus();
    }
  });

  // Preset Chips
  urlChips.forEach(chip => {
    chip.addEventListener('click', () => {
      navigateTo(chip.dataset.url);
    });
  });

  // Proxy Toggle change
  proxyModeToggle?.addEventListener('change', () => {
    if (!isLocalPyServer && proxyModeToggle.checked) {
      alert('스마트 프록시는 Python 로컬 서버(start_server.bat) 실행 시 지원됩니다.\n깃허브 페이지 등 정적 웹 호스팅 환경에서는 직접 로드(Direct Load) 모드로 동작합니다.');
      proxyModeToggle.checked = false;
      return;
    }
    navigateTo(currentLoadedUrl);
  });

  // Close Info Banner
  closeGuideBannerBtn?.addEventListener('click', () => {
    if (urlGuideBanner) urlGuideBanner.style.display = 'none';
  });

  // Refresh All
  const refreshAllBtn = document.getElementById('refreshAllBtn');
  refreshAllBtn?.addEventListener('click', () => {
    triggerLoadingBar();
    allIframes.forEach(frame => {
      if (frame) frame.src = frame.src;
    });
  });

  // Theme Toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  themeToggleBtn?.addEventListener('click', () => {
    document.body.classList.toggle('theme-light');
  });

  // =========================================================================
  // Focus Mode (Compare 3-way ↔ Expand Single Device)
  // =========================================================================
  const exitFocusModeBtn = document.getElementById('exitFocusModeBtn');
  const deviceCards = document.querySelectorAll('.device-card-container');

  function enterFocusMode(device) {
    if (!comparisonStage) return;
    isFocusActive = true;
    comparisonStage.classList.add('focus-active');

    deviceCards.forEach(card => {
      if (card.dataset.device === device) {
        card.classList.add('is-focused');
        card.classList.remove('is-hidden');
      } else {
        card.classList.remove('is-focused');
        card.classList.add('is-hidden');
      }
    });

    if (exitFocusModeBtn) exitFocusModeBtn.style.display = 'inline-flex';

    if (scaleSelect) {
      previousScaleBeforeFocus = scaleSelect.value;
      if (device === 'desktop') {
        const fitScale = Math.min(1.0, Math.max(0.6, (window.innerWidth - 60) / 1250));
        applyScale(fitScale);
      } else {
        applyScale(1.0);
      }
    }
  }

  function exitFocusMode() {
    if (!comparisonStage) return;
    isFocusActive = false;
    comparisonStage.classList.remove('focus-active');

    deviceCards.forEach(card => {
      card.classList.remove('is-focused');
      card.classList.remove('is-hidden');
    });

    if (exitFocusModeBtn) exitFocusModeBtn.style.display = 'none';

    if (scaleSelect) {
      scaleSelect.value = previousScaleBeforeFocus;
      handleScaleChange();
    }
  }

  document.querySelectorAll('.btn-focus-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const device = btn.dataset.device;
      enterFocusMode(device);
    });
  });

  exitFocusModeBtn?.addEventListener('click', exitFocusMode);

  // Esc key handles both Focus Mode and Canvas Fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isFocusActive) {
        exitFocusMode();
      } else if (document.body.classList.contains('canvas-fullscreen')) {
        document.body.classList.remove('canvas-fullscreen');
      }
    }
  });

  // Single Device Frame Reload
  document.querySelectorAll('.btn-reload-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.dataset.target;
      const targetIframe = document.getElementById(targetId);
      if (targetIframe) {
        btn.style.transform = 'rotate(360deg)';
        btn.style.transition = 'transform 0.4s ease';
        setTimeout(() => { btn.style.transform = ''; btn.style.transition = ''; }, 400);
        targetIframe.src = targetIframe.src;
      }
    });
  });

  // Collapsible QA & Notes System
  document.querySelectorAll('.btn-toggle-qa').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const device = btn.dataset.device;
      const panelId = 'qaPanel' + device.charAt(0).toUpperCase() + device.slice(1);
      const panel = document.getElementById(panelId);
      if (panel) {
        const isHidden = panel.style.display === 'none' || !panel.style.display;
        panel.style.display = isHidden ? 'block' : 'none';
        btn.classList.toggle('active', isHidden);
      }
    });
  });

  // QA Status Rating Buttons
  document.querySelectorAll('.qa-status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const device = btn.dataset.device;
      const status = btn.dataset.status;

      document.querySelectorAll(`.qa-status-btn[data-device="${device}"]`).forEach(b => {
        b.classList.toggle('active', b === btn);
      });

      const dotId = 'qaDot' + device.charAt(0).toUpperCase() + device.slice(1);
      const dot = document.getElementById(dotId);
      if (dot) {
        dot.className = `status-dot ${device} qa-verdict-${status}`;
      }

      try {
        localStorage.setItem(`qa_status_${device}`, status);
      } catch (err) {}
    });
  });

  // QA Notes Autosave & Load on Init
  ['mobile', 'tablet', 'desktop'].forEach(device => {
    const noteId = 'qaNote' + device.charAt(0).toUpperCase() + device.slice(1);
    const textarea = document.getElementById(noteId);
    if (textarea) {
      try {
        const savedNote = localStorage.getItem(`qa_note_${device}`);
        if (savedNote) textarea.value = savedNote;

        const savedStatus = localStorage.getItem(`qa_status_${device}`);
        if (savedStatus) {
          const btn = document.querySelector(`.qa-status-btn[data-device="${device}"][data-status="${savedStatus}"]`);
          if (btn) btn.classList.add('active');
          const dotId = 'qaDot' + device.charAt(0).toUpperCase() + device.slice(1);
          const dot = document.getElementById(dotId);
          if (dot) dot.className = `status-dot ${device} qa-verdict-${savedStatus}`;
        }
      } catch (err) {}

      let debounceTimer;
      textarea.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          try {
            localStorage.setItem(`qa_note_${device}`, textarea.value);
          } catch (err) {}
        }, 300);
      });
    }
  });

  // =========================================================================
  // 5. Simulator Mode: Presets, Resizing & Live Ruler
  // =========================================================================
  const resizableWrapper = document.getElementById('resizableWrapper');
  const simCurSize = document.getElementById('simCurSize');
  const simDeviceLabel = document.getElementById('simDeviceLabel');
  const simBreakpointTag = document.getElementById('simBreakpointTag');
  const simStatusDot = document.getElementById('simStatusDot');
  const widthCursor = document.getElementById('widthCursor');
  const cursorTooltip = document.getElementById('cursorTooltip');

  const presetBtns = document.querySelectorAll('.preset-btn');
  const rotateBtn = document.getElementById('rotateBtn');
  const inputCustomWidth = document.getElementById('inputCustomWidth');
  const inputCustomHeight = document.getElementById('inputCustomHeight');
  const applyCustomSize = document.getElementById('applyCustomSize');

  let currentW = 393;
  let currentH = 820;

  function updateSimulatorView(w, h, label = null) {
    currentW = Math.max(320, Math.min(1600, Math.round(w)));
    currentH = Math.max(400, Math.min(1400, Math.round(h)));

    if (resizableWrapper) {
      resizableWrapper.style.width = `${currentW}px`;
      resizableWrapper.style.height = `${currentH}px`;
      resizableWrapper.classList.toggle('compact-view', currentW < 540);
    }

    if (simCurSize) {
      simCurSize.textContent = `${currentW} × ${currentH} px`;
    }

    if (inputCustomWidth) inputCustomWidth.value = currentW;
    if (inputCustomHeight) inputCustomHeight.value = currentH;

    // Detect device type & breakpoint with responsive concise labels
    if (currentW < 768) {
      if (simStatusDot) simStatusDot.className = 'status-indicator-dot mobile';
      if (simBreakpointTag) {
        simBreakpointTag.className = 'frame-tag-breakpoint mobile';
        simBreakpointTag.textContent = currentW < 500 ? '< 768px (모바일)' : '@media (max-width: 767px) · 모바일';
      }
      if (!label && simDeviceLabel) simDeviceLabel.textContent = '스마트폰 (Mobile)';
    } else if (currentW >= 768 && currentW < 1024) {
      if (simStatusDot) simStatusDot.className = 'status-indicator-dot tablet';
      if (simBreakpointTag) {
        simBreakpointTag.className = 'frame-tag-breakpoint tablet';
        simBreakpointTag.textContent = currentW < 900 ? '768~1023px (태블릿)' : '@media (768px ~ 1023px) · 태블릿';
      }
      if (!label && simDeviceLabel) simDeviceLabel.textContent = '태블릿 (Tablet)';
    } else {
      if (simStatusDot) simStatusDot.className = 'status-indicator-dot desktop';
      if (simBreakpointTag) {
        simBreakpointTag.className = 'frame-tag-breakpoint desktop';
        simBreakpointTag.textContent = currentW < 1140 ? '≥ 1024px (PC)' : '@media (min-width: 1024px) · PC 데스크톱';
      }
      if (!label && simDeviceLabel) simDeviceLabel.textContent = 'PC 데스크톱 (PC)';
    }

    if (label && simDeviceLabel) {
      simDeviceLabel.textContent = label;
    }

    // Update Ruler cursor (Ruler spans 320px to 1600px)
    const minR = 320;
    const maxR = 1600;
    const percentage = Math.max(0, Math.min(100, ((currentW - minR) / (maxR - minR)) * 100));
    if (widthCursor) {
      widthCursor.style.left = `${percentage}%`;
    }
    if (cursorTooltip) {
      cursorTooltip.textContent = `${currentW}px`;
    }
  }

  // Preset Buttons Clicks
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const w = parseInt(btn.dataset.w, 10);
      const h = parseInt(btn.dataset.h, 10);
      const name = btn.dataset.name;
      updateSimulatorView(w, h, name);
    });
  });

  // Rotate Orientation
  rotateBtn?.addEventListener('click', () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    const temp = currentW;
    currentW = currentH;
    currentH = temp;
    updateSimulatorView(currentW, currentH, '회전된 뷰');
  });

  // Apply custom input size
  applyCustomSize?.addEventListener('click', () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    const w = parseInt(inputCustomWidth.value, 10) || currentW;
    const h = parseInt(inputCustomHeight.value, 10) || currentH;
    updateSimulatorView(w, h, '사용자 지정 크기');
  });

  // =========================================================================
  // 6. Interactive Drag Resize Handles
  // =========================================================================
  const handleRight = document.getElementById('handleRight');
  const handleBottom = document.getElementById('handleBottom');
  const handleCorner = document.getElementById('handleCorner');

  let isDragging = false;
  let dragType = null;
  let startX, startY, startW, startH;

  function onMouseDown(e, type) {
    e.preventDefault();
    isDragging = true;
    dragType = type;
    startX = e.clientX;
    startY = e.clientY;
    startW = resizableWrapper.offsetWidth;
    startH = resizableWrapper.offsetHeight;
    presetBtns.forEach(b => b.classList.remove('active'));

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = type === 'right' ? 'ew-resize' : (type === 'bottom' ? 'ns-resize' : 'nwse-resize');
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newW = startW;
    let newH = startH;

    if (dragType === 'right' || dragType === 'corner') {
      newW = startW + dx;
    }
    if (dragType === 'bottom' || dragType === 'corner') {
      newH = startH + dy;
    }

    updateSimulatorView(newW, newH);
  }

  function onMouseUp() {
    isDragging = false;
    dragType = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
  }

  handleRight?.addEventListener('mousedown', (e) => onMouseDown(e, 'right'));
  handleBottom?.addEventListener('mousedown', (e) => onMouseDown(e, 'bottom'));
  handleCorner?.addEventListener('mousedown', (e) => onMouseDown(e, 'corner'));

  // Initialize Simulator View
  updateSimulatorView(393, 852, 'iPhone 15 Pro');

  // Load default demo site (KNOU)
  navigateTo(currentLoadedUrl);
});
