let currentUser = null;

function redirectHome(){
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'index.html';
}

window.onload = function() {
    currentUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        window.location.href = 'index.html';
        return;
    }
    if (currentUser.role === '사장' || currentUser.role === '부관리자') {
        document.getElementById('nav-admin').classList.remove('hidden');
    }
    if (currentUser.isFirstLogin) {
        document.getElementById('first-login-alert').classList.remove('hidden');
    }
};

//비번 변경
function changePassword() {
    const currentPw = document.getElementById('current-pw').value;
    const newPw = document.getElementById('new-pw').value;
    const confirmPw = document.getElementById('confirm-pw').value;


    if (!currentPw || !newPw || !confirmPw) {
        return alert("모든 항목을 입력해주세요.");
    }
    if (currentPw !== currentUser.pw) {
        return alert("현재 비밀번호가 일치하지 않습니다.");
    }
    if (newPw !== confirmPw) {
        return alert("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
    }
    if (currentPw === newPw) {
        return alert("기존과 동일한 비밀번호로는 변경할 수 없습니다.");
    }


    let employees = JSON.parse(localStorage.getItem('employees')) || [];
    const empIndex = employees.findIndex(emp => emp.id === currentUser.id);

    if (empIndex > -1) {
        employees[empIndex].pw = newPw;
        employees[empIndex].isFirstLogin = false;
        
        localStorage.setItem('employees', JSON.stringify(employees));

        currentUser.pw = newPw;
        currentUser.isFirstLogin = false;
        sessionStorage.setItem('loggedInUser', JSON.stringify(currentUser));

        alert("비밀번호가 성공적으로 변경되었습니다.");
        
        document.getElementById('current-pw').value = '';
        document.getElementById('new-pw').value = '';
        document.getElementById('confirm-pw').value = '';
        document.getElementById('first-login-alert').classList.add('hidden');
    }
}
//계정 삭제
function deleteAccount() {
    const confirmText = prompt("정말 탈퇴하시겠습니까? 탈퇴를 원하시면 '탈퇴 확인'이라고 입력해주세요.");
    if (confirmText === '탈퇴 확인') {
        let employees = JSON.parse(localStorage.getItem('employees')) || [];
        employees = employees.filter(emp => emp.id !== currentUser.id);
        localStorage.setItem('employees', JSON.stringify(employees));

        alert("계정이 성공적으로 삭제되었습니다. 이용해 주셔서 감사합니다.");
        
        redirectHome();
    } else if (confirmText !== null) {
        alert("입력한 문구가 일치하지 않아 탈퇴가 취소되었습니다.");
    }
}

//로그아웃
function handleLogout() {
    if(confirm("로그아웃 하시겠습니까?")) {
        redirectHome();
    }
}
