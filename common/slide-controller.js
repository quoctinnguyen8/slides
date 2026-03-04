(function () {
    // Kích thước chuẩn thiết kế của mỗi slide (tỉ lệ 16:9)
    const SLIDE_WIDTH = 1280;
    const SLIDE_HEIGHT = 720;

    // Lấy toàn bộ slide trong trang, nếu không có thì dừng
    const slides = Array.from(document.querySelectorAll('.slide-container'));
    if (!slides.length) return;

    // Trạng thái điều hướng hiện tại
    const totalSlides = slides.length;
    let currentIndex = 0;
    document.body.classList.add('slide-controller-active');
    document.body.classList.add('slide-loading');

    // Tạo màn hình loading hiển thị ngắn khi mới vào trang/F5
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'slide-loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="slide-loading-spinner" aria-hidden="true"></div>
        <div class="slide-loading-text">Đang tải slide...</div>
    `;
    document.body.appendChild(loadingOverlay);

    // Khóa localStorage theo từng trang slide (dựa trên pathname)
    const storageKey = `slide-position:${location.pathname}`;

    // Lưu vị trí slide hiện tại vào localStorage (0-based index)
    const saveCurrentSlide = () => {
        try {
            localStorage.setItem(storageKey, String(currentIndex));
        } catch (error) {
            console.warn('Không thể lưu vị trí slide vào localStorage:', error);
        }
    };

    // Đọc vị trí slide đã lưu và kiểm tra hợp lệ
    const getStoredSlide = () => {
        try {
            const rawValue = localStorage.getItem(storageKey);
            if (rawValue === null) return null;

            const parsedIndex = Number.parseInt(rawValue, 10);
            if (!Number.isInteger(parsedIndex)) return null;
            if (parsedIndex < 0 || parsedIndex >= totalSlides) return null;

            return parsedIndex;
        } catch (error) {
            console.warn('Không thể đọc vị trí slide từ localStorage:', error);
            return null;
        }
    };

    // Tự động gắn stylesheet dành riêng cho chế độ in
    const ensurePrintStylesheet = () => {
        if (document.querySelector('link[data-slide-print="true"]')) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.media = 'print';
        link.setAttribute('data-slide-print', 'true');

        const scriptElement = document.currentScript || document.querySelector('script[src*="slide-controller.js"]');
        if (scriptElement && scriptElement.src) {
            link.href = new URL('slide-print.css', scriptElement.src).href;
        } else {
            link.href = 'slide-print.css';
        }

        document.head.appendChild(link);
    };
    ensurePrintStylesheet();

    // Dựng lớp khung hiển thị slide: viewport -> stage -> slide
    const stage = document.createElement('div');
    stage.className = 'slide-stage';
    slides[0].before(stage);
    slides.forEach((slide) => stage.appendChild(slide));

    const viewport = document.createElement('div');
    viewport.className = 'slide-viewport';
    stage.before(viewport);
    viewport.appendChild(stage);

    // Gắn số trang ở góc dưới phải cho từng slide
    slides.forEach((slide, index) => {
        const pageNumber = document.createElement('div');
        pageNumber.className = 'slide-page-number';
        pageNumber.textContent = `${index + 1}`;
        slide.appendChild(pageNumber);
    });

    const nav = document.createElement('div');
    nav.className = 'slide-nav';

    // Nút lùi slide
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.setAttribute('aria-label', 'Slide trước (nhấn phím mũi tên trái để chuyển nhanh)');
    backButton.setAttribute('title', 'Slide trước (nhấn phím mũi tên trái để chuyển nhanh)');
    backButton.textContent = '‹';

    // Ô nhập số trang để nhảy nhanh
    const indexInput = document.createElement('input');
    indexInput.type = 'text';
    indexInput.setAttribute('aria-label', 'Vị trí slide');

    // Nút tiến slide
    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.setAttribute('aria-label', 'Slide tiếp theo (nhấn phím mũi tên phải để chuyển nhanh)');
    nextButton.setAttribute('title', 'Slide tiếp theo (nhấn phím mũi tên phải để chuyển nhanh)');
    nextButton.textContent = '›';

    nav.append(backButton, indexInput, nextButton);
    document.body.appendChild(nav);

    // Nút home, để quay về trang chủ
    const homeButton = document.createElement('button');
    homeButton.type = 'button';
    homeButton.className = 'slide-home-btn';
    homeButton.setAttribute('aria-label', 'Trang chủ');
    homeButton.innerHTML = '<i class="fa-solid fa-house" aria-hidden="true"></i>';
    homeButton.addEventListener('click', () => {
        location.href = '/';
    });

    // Nút in slide (mở hộp thoại in mặc định của trình duyệt)
    const printButton = document.createElement('button');
    printButton.type = 'button';
    printButton.className = 'slide-print-btn';
    printButton.setAttribute('aria-label', 'In slide');
    printButton.innerHTML = '<i class="fa-solid fa-print" aria-hidden="true"></i>';
    printButton.addEventListener('click', () => window.print());

    // Nút bật/tắt chế độ toàn màn hình
    const fullscreenButton = document.createElement('button');
    fullscreenButton.type = 'button';
    fullscreenButton.className = 'slide-fullscreen-btn';
    fullscreenButton.setAttribute('aria-label', 'Toàn màn hình');
    fullscreenButton.innerHTML = '<i class="fa-solid fa-expand" aria-hidden="true"></i>';

    // Gom các nút hành động góc phải vào một cụm để dễ ẩn/hiện sau này
    const topActions = document.createElement('div');
    topActions.className = 'slide-top-actions';
    topActions.append(homeButton, printButton, fullscreenButton);
    document.body.appendChild(topActions);

    // Kiểm tra trạng thái full screen hiện tại
    const isFullscreen = () => !!document.fullscreenElement;

    // Đồng bộ class trên body để CSS xử lý ẩn/hiện controls
    const updateFullscreenState = () => {
        const active = isFullscreen();
        document.body.classList.toggle('slide-fullscreen-active', active);
        scheduleFitStage();
    };

    // Bật/tắt full screen
    const toggleFullscreen = async () => {
        try {
            if (!isFullscreen()) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.error('Không thể chuyển chế độ toàn màn hình:', error);
        }
    };

    fullscreenButton.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', updateFullscreenState);

    let fitRaf = 0;
    let transitionUnlockTimer = 0;
    let isNavigating = false;
    let queuedIndex = null;
    let refitBurstTimers = [];

    // Lấy kích thước viewport thực tế trên mobile.
    // visualViewport phản ánh tốt hơn khi thanh địa chỉ/điều hướng thay đổi.
    const getViewportSize = () => {
        if (window.visualViewport) {
            return {
                width: Math.max(window.visualViewport.width, 1),
                height: Math.max(window.visualViewport.height, 1)
            };
        }

        return {
            width: Math.max(window.innerWidth, 1),
            height: Math.max(window.innerHeight, 1)
        };
    };
    // Tính scale để slide luôn vừa màn hình theo tỉ lệ 16:9
    // Giới hạn hiển thị tối đa 95% viewport để chừa khoảng thở thẩm mỹ
    const fitStage = () => {
        const viewportSize = getViewportSize();
        const navHeight = nav.offsetHeight || 56;
        const maxViewportWidth = Math.max(viewportSize.width * 0.95, 280);
        const maxViewportHeight = Math.max((viewportSize.height - navHeight - 20) * 0.95, 180);

        const scale = Math.max(Math.min(maxViewportWidth / SLIDE_WIDTH, maxViewportHeight / SLIDE_HEIGHT), 0.1);
        const viewportWidth = Math.round(SLIDE_WIDTH * scale);
        const viewportHeight = Math.round(SLIDE_HEIGHT * scale);

        viewport.style.width = `${viewportWidth}px`;
        viewport.style.height = `${viewportHeight}px`;
        stage.style.transform = `scale(${scale})`;
    };

    // Chống gọi fit liên tục khi resize bằng requestAnimationFrame
    const scheduleFitStage = () => {
        if (fitRaf) cancelAnimationFrame(fitRaf);
        fitRaf = requestAnimationFrame(() => {
            fitStage();
            fitRaf = 0;
        });
    };

    // Chạy nhiều nhịp fit liên tiếp để bắt các thay đổi viewport trễ trên mobile
    // (thường xảy ra sau F5 hoặc xoay màn hình).
    const scheduleRefitBurst = () => {
        refitBurstTimers.forEach((timerId) => window.clearTimeout(timerId));
        refitBurstTimers = [];

        [0, 80, 220, 420].forEach((delay) => {
            const timerId = window.setTimeout(scheduleFitStage, delay);
            refitBurstTimers.push(timerId);
        });
    };

    // Cập nhật trạng thái hiển thị slide và trạng thái điều hướng
    const applyState = () => {
        slides.forEach((slide, index) => {
            slide.classList.remove('is-active', 'is-prev', 'is-next');
            if (index < currentIndex) {
                slide.classList.add('is-prev');
            } else if (index > currentIndex) {
                slide.classList.add('is-next');
            } else {
                slide.classList.add('is-active');
            }
        });

        indexInput.value = `${currentIndex + 1}/${totalSlides}`;
        backButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex === totalSlides - 1;
    };

    // Mở khóa điều hướng sau một nhịp chuyển cảnh,
    // đồng thời xử lý yêu cầu được bấm dồn trong lúc khóa.
    const unlockNavigation = () => {
        isNavigating = false;

        if (queuedIndex === null) return;
        const nextQueuedIndex = queuedIndex;
        queuedIndex = null;
        goToSlide(nextQueuedIndex);
    };

    // Chuyển đến slide theo chỉ số (có chặn biên)
    const goToSlide = (index) => {
        const safeIndex = Math.min(Math.max(index, 0), totalSlides - 1);

        if (isNavigating) {
            queuedIndex = safeIndex;
            return;
        }

        if (safeIndex === currentIndex) {
            applyState();
            return;
        }

        isNavigating = true;
        currentIndex = safeIndex;
        applyState();
        saveCurrentSlide();

        if (transitionUnlockTimer) {
            window.clearTimeout(transitionUnlockTimer);
        }
        transitionUnlockTimer = window.setTimeout(unlockNavigation, 320);
    };

    // Parse input người dùng: chấp nhận dạng "5" hoặc "5/21"
    const parseInput = () => {
        const rawValue = indexInput.value.trim();
        const matched = rawValue.match(/^\s*(\d+)/);
        if (!matched) {
            applyState();
            return;
        }
        goToSlide(Number(matched[1]) - 1);
    };

    backButton.addEventListener('click', () => goToSlide(currentIndex - 1));
    nextButton.addEventListener('click', () => goToSlide(currentIndex + 1));

    // Hỗ trợ vuốt ngang trên thiết bị cảm ứng để chuyển slide
    // (áp dụng cho cả chế độ dọc và xoay ngang vì dựa trên trục vuốt thực tế)
    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = 0;
    let touchCurrentY = 0;
    let isTouchTracking = false;

    const isInteractiveTarget = (target) => {
        if (!(target instanceof Element)) return false;
        return !!target.closest('button, input, a, textarea, select, [contenteditable="true"]');
    };

    viewport.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1) return;
        if (isInteractiveTarget(event.target)) return;

        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchCurrentX = touch.clientX;
        touchCurrentY = touch.clientY;
        isTouchTracking = true;
    }, { passive: true });

    viewport.addEventListener('touchmove', (event) => {
        if (!isTouchTracking || event.touches.length !== 1) return;

        const touch = event.touches[0];
        touchCurrentX = touch.clientX;
        touchCurrentY = touch.clientY;

        const deltaX = touchCurrentX - touchStartX;
        const deltaY = touchCurrentY - touchStartY;
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            event.preventDefault();
        }
    }, { passive: false });

    viewport.addEventListener('touchend', () => {
        if (!isTouchTracking) return;
        isTouchTracking = false;

        const deltaX = touchCurrentX - touchStartX;
        const deltaY = touchCurrentY - touchStartY;
        const horizontalDominant = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
        const reachedThreshold = Math.abs(deltaX) >= 50;

        if (!horizontalDominant || !reachedThreshold) return;

        if (deltaX < 0) {
            goToSlide(currentIndex + 1);
        } else {
            goToSlide(currentIndex - 1);
        }
    }, { passive: true });

    viewport.addEventListener('touchcancel', () => {
        isTouchTracking = false;
    }, { passive: true });

    // Enter để xác nhận nhảy trang
    indexInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            parseInput();
            indexInput.blur();
        }
    });

    indexInput.addEventListener('blur', parseInput);

    // Khi focus vào ô input thì chọn phần nội dung trước dấu "/" để dễ chỉnh sửa
    indexInput.addEventListener('focus', () => {
        const [currentPart] = indexInput.value.split('/');
        indexInput.setSelectionRange(0, currentPart.length);
    });

    // Hỗ trợ phím mũi tên trái/phải để chuyển slide nhanh
    document.addEventListener('keydown', (event) => {
        if (event.target === indexInput) return;
        if (event.key === 'ArrowLeft') goToSlide(currentIndex - 1);
        if (event.key === 'ArrowRight') goToSlide(currentIndex + 1);
    });

    // Tự fit lại khi đổi kích thước cửa sổ hoặc xoay màn hình
    window.addEventListener('resize', scheduleRefitBurst);
    window.addEventListener('orientationchange', scheduleRefitBurst);
    window.addEventListener('load', scheduleRefitBurst);
    window.addEventListener('pageshow', scheduleRefitBurst);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleRefitBurst);
        window.visualViewport.addEventListener('scroll', scheduleFitStage);
    }

    // Khởi tạo trạng thái ban đầu
    const storedIndex = getStoredSlide();
    if (storedIndex !== null) {
        currentIndex = storedIndex;
    }
    applyState();
    saveCurrentSlide();
    updateFullscreenState();
    scheduleRefitBurst();

    // Giữ loading tối thiểu 1 giây rồi mới hiển thị slide
    window.setTimeout(() => {
        loadingOverlay.classList.add('is-hide');
        document.body.classList.remove('slide-loading');
        scheduleRefitBurst();
        window.setTimeout(() => loadingOverlay.remove(), 260);
    }, 1000);
})();