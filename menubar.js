function toggleNav() {
    const nav = document.querySelector('nav');
    nav.classList.toggle('open');
}

document.addEventListener('click', (e) => {
    const nav = document.querySelector('nav');
    const toggle = document.getElementById('menu-toggle');
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('open');
    }
});
