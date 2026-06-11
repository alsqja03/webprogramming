let currentUser = null;
let currentViewingNoticeId = null; 

window.onload = function() {
    currentUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        window.location.href = 'index.html';
        return;
    }
    if (currentUser.role === '사장' || currentUser.role === '부관리자') {
        document.getElementById('nav-admin').classList.remove('hidden');
        document.getElementById('btn-write-form').classList.remove('hidden');
    }
    if (!localStorage.getItem('notices')) {
        localStorage.setItem('notices', JSON.stringify([]));
    }
    checkNewNoticeAlert();
    renderNoticeList();
};

function checkNewNoticeAlert() {
    const notices = JSON.parse(localStorage.getItem('notices')) || [];
    if (notices.length === 0) return;
    const latestNoticeId = notices[notices.length - 1].id;
    
    const userReadStatusKey = `lastReadNotice_${currentUser.id}`;
    const lastReadId = localStorage.getItem(userReadStatusKey);

    if (!lastReadId || Number(lastReadId) < latestNoticeId) {
        alert("새로운 공지사항이 등록되었습니다! 목록에서 확인해주세요.");
    }
}

function renderNoticeList() {
    const notices = JSON.parse(localStorage.getItem('notices')) || [];
    const tbody = document.getElementById('notice-list');
    tbody.innerHTML = '';
    if (notices.length === 0) {
        return tbody.innerHTML = `<tr><td colspan="4">등록된 공지사항이 없습니다.</td></tr>`;
    }
    const reversedNotices = [...notices].reverse();
    reversedNotices.forEach((notice, index) => {
        const displayNum = notices.length - index; 
        tbody.innerHTML += `
            <tr>
                <td>${displayNum}</td>
                <td class="title-cell" onclick="viewNotice(${notice.id})">${notice.title}</td>
                <td>${notice.authorName}</td>
                <td style="color:#777; font-size:13px;">${notice.date}</td>
            </tr>
        `;
    });
}

function toggleWriteForm(show) {
    if (show) {
        document.getElementById('section-list').classList.add('hidden');
        document.getElementById('section-write').classList.remove('hidden');
        document.getElementById('notice-title').value = '';
        document.getElementById('notice-content').value = '';
    } else {
        document.getElementById('section-write').classList.add('hidden');
        document.getElementById('section-list').classList.remove('hidden');
    }
}

function submitNotice() {
    const title = document.getElementById('notice-title').value.trim();
    const content = document.getElementById('notice-content').value.trim();
    if (!title || !content) {
        return alert("제목과 내용을 모두 입력해주세요.");
    }
    const notices = JSON.parse(localStorage.getItem('notices')) || [];
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + kstOffset);
    const dateString = localNow.toISOString().replace('T', ' ').slice(0, 16);
    const newNotice = {
        id: Date.now(),
        title: title,
        content: content,
        authorId: currentUser.id,
        authorName: currentUser.name,
        date: dateString
    };
    notices.push(newNotice);
    localStorage.setItem('notices', JSON.stringify(notices));
    alert("공지사항이 등록되었습니다.");
    toggleWriteForm(false); 
    renderNoticeList(); 
}

function viewNotice(id) {
    const notices = JSON.parse(localStorage.getItem('notices')) || [];
    const notice = notices.find(n => n.id === id);
    if (!notice) return alert("존재하지 않는 게시글입니다.");
    currentViewingNoticeId = id; 
    document.getElementById('detail-title').innerText = notice.title;
    document.getElementById('detail-author').innerText = `작성자: ${notice.authorName}`;
    document.getElementById('detail-date').innerText = notice.date;
    document.getElementById('detail-content').innerText = notice.content;
    if (currentUser.id === notice.authorId || currentUser.role === '사장') {
        document.getElementById('btn-delete').classList.remove('hidden');
    } else {
        document.getElementById('btn-delete').classList.add('hidden');
    }
    const userReadStatusKey = `lastReadNotice_${currentUser.id}`;
    const lastReadId = localStorage.getItem(userReadStatusKey);
    if (!lastReadId || Number(lastReadId) < id) {
        localStorage.setItem(userReadStatusKey, id);
    }
    document.getElementById('section-list').classList.add('hidden');
    document.getElementById('section-detail').classList.remove('hidden');
}

function closeDetail() {
    document.getElementById('section-detail').classList.add('hidden');
    document.getElementById('section-list').classList.remove('hidden');
    currentViewingNoticeId = null;
    renderNoticeList();
}

function deleteNotice() {
    if(!confirm("정말 이 공지사항을 삭제하시겠습니까?")) return;
    let notices = JSON.parse(localStorage.getItem('notices')) || [];
    notices = notices.filter(n => n.id !== currentViewingNoticeId);
    localStorage.setItem('notices', JSON.stringify(notices));
    alert("삭제되었습니다.");
    closeDetail();
}

function handleLogout() {
    if(confirm("로그아웃 하시겠습니까?")) {
        sessionStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    }
}
