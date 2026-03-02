(function () {
    const SLIDE_WIDTH = 1280;
    const SLIDE_HEIGHT = 720;

    const slides = Array.from(document.querySelectorAll('.slide-container'));
    if (!slides.length) return;

    const totalSlides = slides.length;
    let currentIndex = 0;
    document.body.classList.add('slide-controller-active');

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

    let fitRaf = 0;
    const fitStage = () => {
        const navHeight = nav.offsetHeight || 56;
        const horizontalPadding = 20;
        const verticalPadding = 16;
        const availableWidth = Math.max(window.innerWidth - horizontalPadding, 280);
        const availableHeight = Math.max(window.innerHeight - navHeight - 20 - verticalPadding, 180);

        const scale = Math.min(availableWidth / SLIDE_WIDTH, availableHeight / SLIDE_HEIGHT, 1);
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
    scheduleFitStage();
})();