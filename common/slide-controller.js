(function () {
    const slides = Array.from(document.querySelectorAll('.slide-container'));
    if (!slides.length) return;

    const totalSlides = slides.length;
    let currentIndex = 0;

    const style = document.createElement('style');
    style.textContent = `
        body {
            display: flex !important;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 24px 16px 84px;
            margin: 0;
            background-color: #e5e7eb;
            overflow: hidden;
        }

        .slide-stage {
            position: relative;
            width: 1280px;
            height: 720px;
        }

        .slide-stage .slide-container {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            opacity: 0;
            pointer-events: none;
            transition: opacity 380ms ease, transform 380ms ease;
            will-change: opacity, transform;
        }

        .slide-stage .slide-container.is-prev {
            transform: translateX(-24px) scale(0.992);
        }

        .slide-stage .slide-container.is-next {
            transform: translateX(24px) scale(0.992);
        }

        .slide-stage .slide-container.is-active {
            opacity: 1;
            transform: translateX(0) scale(1);
            pointer-events: auto;
            z-index: 2;
        }

        .slide-page-number {
            position: absolute;
            right: 22px;
            bottom: 18px;
            padding: 6px 10px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 15px;
            font-weight: 600;
            line-height: 1;
            z-index: 3;
            pointer-events: none;
            font-family: 'Inter', sans-serif;
        }

        .slide-nav {
            position: fixed;
            left: 50%;
            bottom: 22px;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 8px 10px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
            z-index: 9999;
            font-family: 'Inter', sans-serif;
        }

        .slide-nav button {
            width: 40px;
            height: 40px;
            border: 1px solid #d1d5db;
            background: #ffffff;
            border-radius: 8px;
            font-size: 22px;
            line-height: 1;
            cursor: pointer;
            color: #4b5563;
        }

        .slide-nav button:hover { background: #f3f4f6; }
        .slide-nav button:disabled { opacity: 0.45; cursor: not-allowed; }

        .slide-nav input {
            width: 86px;
            height: 40px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            text-align: center;
            font-size: 16px;
            color: #4b5563;
            background: #ffffff;
            outline: none;
        }

        .slide-nav input:focus {
            border-color: #10a37f;
            box-shadow: 0 0 0 3px rgba(16, 163, 127, 0.15);
        }
    `;
    document.head.appendChild(style);

    const stage = document.createElement('div');
    stage.className = 'slide-stage';
    slides[0].before(stage);
    slides.forEach((slide) => stage.appendChild(slide));

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

    applyState();
})();