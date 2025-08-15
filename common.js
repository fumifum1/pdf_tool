document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger-menu');
    const navMenu = document.querySelector('.nav-menu');
    const overlay = document.querySelector('.overlay');

    if (hamburger && navMenu && overlay) {
        const toggleMenu = (e) => {
            // イベントの伝播を止めて、オーバーレイクリック時にメニューも閉じられるようにする
            e.stopPropagation();
            hamburger.classList.toggle('open');
            navMenu.classList.toggle('open');
            overlay.classList.toggle('open');
        };

        hamburger.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
    }
});