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
    topActions.append(printButton, fullscreenButton);
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
    // Tính scale để slide luôn vừa màn hình theo tỉ lệ 16:9
    // Giới hạn hiển thị tối đa 95% viewport để chừa khoảng thở thẩm mỹ
    const fitStage = () => {
        const navHeight = nav.offsetHeight || 56;
        const maxViewportWidth = Math.max(window.innerWidth * 0.95, 280);
        const maxViewportHeight = Math.max((window.innerHeight - navHeight - 20) * 0.95, 180);

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

    // Chuyển đến slide theo chỉ số (có chặn biên)
    const goToSlide = (index) => {
        const safeIndex = Math.min(Math.max(index, 0), totalSlides - 1);
        if (safeIndex === currentIndex) {
            applyState();
            return;
        }
        currentIndex = safeIndex;
        applyState();
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
    window.addEventListener('resize', scheduleFitStage);
    window.addEventListener('orientationchange', scheduleFitStage);

    // Khởi tạo trạng thái ban đầu
    applyState();
    updateFullscreenState();
    scheduleFitStage();
})();