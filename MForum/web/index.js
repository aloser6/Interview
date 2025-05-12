// 服务器地址
const BASE_URL = 'http://127.0.0.1:8080';

// 轮播图逻辑
let currentSlide = 0;
const slidesContainer = document.querySelector('.slides');
const dots = document.querySelectorAll('.dot');

async function loadSlides() {
    try {
        const response = await fetch(`${BASE_URL}/home/slides`, {
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        
        if (result.status.code === 200) {
            const slidesData = result.data || [];
            slidesContainer.innerHTML = '';
            const dotsContainer = document.querySelector('.dots');
            dotsContainer.innerHTML = ''; // 清空现有的点

            // 检查是否有幻灯片数据
            if (slidesData.length === 0) {
                console.error('No slides data available');
                return;
            }

            // 创建所有幻灯片
            slidesData.forEach((slide, index) => {
                const img = document.createElement('img');
                img.src = slide.imageUrl;
                img.alt = `Slide ${slide.id}`;
                // 只有第一张图片显示，其他隐藏
                img.classList.add(index === 0 ? 'active' : '');
                slidesContainer.appendChild(img);

                // 创建对应的点
                const dot = document.createElement('span');
                dot.className = `dot${index === 0 ? ' active' : ''}`;
                dot.setAttribute('data-slide', index);
                dot.addEventListener('click', () => {
                    currentSlide = index;
                    showSlide(currentSlide);
                });
                dotsContainer.appendChild(dot);
            });

            // 初始化显示第一张图片
            currentSlide = 0;
            showSlide(currentSlide);

            // 清除之前的定时器（如果存在）
            if (window.slideInterval) {
                clearInterval(window.slideInterval);
            }
            // 设置新的定时器
            window.slideInterval = setInterval(nextSlide, 3000); // 设置为3秒
        } else {
            console.error('Load slides failed:', result.status.message);
        }
    } catch (error) {
        console.error('Fetch slides error:', error);
    }
}

function showSlide(index) {
    const slides = document.querySelectorAll('.slides img');
    const dots = document.querySelectorAll('.dot');
    
    if (slides.length === 0) return;

    // 确保 index 在有效范围内
    index = ((index % slides.length) + slides.length) % slides.length;

    // 隐藏所有幻灯片和点
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    // 显示当前幻灯片和点
    slides[index].classList.add('active');
    dots[index].classList.add('active');
    
    // 更新当前幻灯片索引
    currentSlide = index;
}

function nextSlide() {
    const slides = document.querySelectorAll('.slides img');
    if (slides.length === 0) return;
    
    const nextIndex = (currentSlide + 1) % slides.length;
    showSlide(nextIndex);
}

setInterval(nextSlide, 6000);

dots.forEach(dot => {
    dot.addEventListener('click', () => {
        currentSlide = parseInt(dot.getAttribute('data-slide'));
        showSlide(currentSlide);
    });
});

// 黑夜模式切换与图标切换
const darkModeToggle = document.getElementById('dark-mode-toggle');
const modeIcon = document.querySelector('.mode-icon');
const modeText = document.querySelector('.mode-text');
const logoIcon = document.querySelector('.logo-icon');

// 初始化黑夜模式状态和图标
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
    modeIcon.textContent = '🌙';
    modeText.textContent = '黑夜';
    logoIcon.src = '/picture/MForumB.ico';
} else {
    document.body.classList.remove('dark-mode');
    darkModeToggle.checked = false;
    modeIcon.textContent = '☀️';
    modeText.textContent = '白天';
    logoIcon.src = '/picture/MForumW.ico';
}

darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    modeIcon.textContent = isDarkMode ? '🌙' : '☀️';
    modeText.textContent = isDarkMode ? '黑夜' : '白天';
    logoIcon.src = isDarkMode ? '/picture/MForumB.ico' : '/picture/MForumW.ico';
});

// 初始化加载轮播图
loadSlides();
// 页面加载完成后初始化轮播图
document.addEventListener('DOMContentLoaded', () => {
    loadSlides();
});