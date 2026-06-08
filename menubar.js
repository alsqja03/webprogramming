// 네비게이션바 열고 닫기 함수
function toggleNav() {
    const nav = document.querySelector('nav');
    nav.classList.toggle('open');
}

// 화면 아무 곳이나 클릭하면 메뉴 닫기 (선택 사항)
document.addEventListener('click', (e) => {
    const nav = document.querySelector('nav');
    const toggle = document.getElementById('menu-toggle');
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('open');
    }
});
