(function () {
    const SLIDE_WIDTH = 1280;
    const SLIDE_HEIGHT = 720;

    const slides = Array.from(document.querySelectorAll('.slide-container'));
    if (!slides.length) return;

    const totalSlides = slides.length;
    let currentIndex = 0;
    document.body.classList.add('slide-controller-active');

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

    const stage = document.createElement('div');
    stage.className = 'slide-stage';
    slides[0].before(stage);
    slides.forEach((slide) => stage.appendChild(slide));

    const viewport = document.createElement('div');
    viewport.className = 'slide-viewport';
    stage.before(viewport);
    viewport.appendChild(stage);

    slides.forEach((slide, index) => {
        const pageNumber = document.createElement('div');
        pageNumber.className = 'slide-page-number';
        pageNumber.textContent = `${index + 1}`;
        slide.appendChild(pageNumber);
    });

    const nav = document.createElement('div');
    nav.className = 'slide-nav';

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.setAttribute('aria-label', 'Slide trước');
    backButton.textContent = '‹';

    const indexInput = document.createElement('input');
    indexInput.type = 'text';
    indexInput.setAttribute('aria-label', 'Vị trí slide');

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.setAttribute('aria-label', 'Slide tiếp theo');
    nextButton.textContent = '›';

    nav.append(backButton, indexInput, nextButton);
    document.body.appendChild(nav);

    const printButton = document.createElement('button');
    printButton.type = 'button';
    printButton.className = 'slide-print-btn';
    printButton.setAttribute('aria-label', 'In slide');
    printButton.innerHTML = '<i class="fa-solid fa-print" aria-hidden="true"></i>';
    printButton.addEventListener('click', () => window.print());
    document.body.appendChild(printButton);

    const fullscreenButton = document.createElement('button');
    fullscreenButton.type = 'button';
    fullscreenButton.className = 'slide-fullscreen-btn';
    fullscreenButton.setAttribute('aria-label', 'Toàn màn hình');
    fullscreenButton.innerHTML = '<i class="fa-solid fa-expand" aria-hidden="true"></i>';
    document.body.appendChild(fullscreenButton);

    const isFullscreen = () => !!document.fullscreenElement;

    const updateFullscreenState = () => {
        const active = isFullscreen();
        document.body.classList.toggle('slide-fullscreen-active', active);
        scheduleFitStage();
    };

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

    const scheduleFitStage = () => {
        if (fitRaf) cancelAnimationFrame(fitRaf);
        fitRaf = requestAnimationFrame(() => {
            fitStage();
            fitRaf = 0;
        });
    };

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

    const goToSlide = (index) => {
        const safeIndex = Math.min(Math.max(index, 0), totalSlides - 1);
        if (safeIndex === currentIndex) {
            applyState();
            return;
        }
        currentIndex = safeIndex;
        applyState();
    };

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

    indexInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            parseInput();
            indexInput.blur();
        }
    });

    indexInput.addEventListener('blur', parseInput);

    document.addEventListener('keydown', (event) => {
        if (event.target === indexInput) return;
        if (event.key === 'ArrowLeft') goToSlide(currentIndex - 1);
        if (event.key === 'ArrowRight') goToSlide(currentIndex + 1);
    });

    window.addEventListener('resize', scheduleFitStage);
    window.addEventListener('orientationchange', scheduleFitStage);

    applyState();
    updateFullscreenState();
    scheduleFitStage();
})();