let currentUser = null;
let currentViewingNoticeId = null; // 현재 상세 보기 중인 게시글 ID

window.onload = function() {
    currentUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        window.location.href = 'index.html';
        return;
    }

    // 관리자(사장, 부관리자) 권한 체크: 네비게이션 및 글쓰기 버튼 활성화
    if (currentUser.role === '사장' || currentUser.role === '부관리자') {
        document.getElementById('nav-admin').classList.remove('hidden');
        document.getElementById('btn-write-form').classList.remove('hidden');
    }

    // 공지사항 저장소 초기화
    if (!localStorage.getItem('notices')) {
        localStorage.setItem('notices', JSON.stringify([]));
    }

    checkNewNoticeAlert();
    renderNoticeList();
};

// 1. 신규 공지사항 팝업 알림 확인 로직
function checkNewNoticeAlert() {
    const notices = JSON.parse(localStorage.getItem('notices')) || [];
    if (notices.length === 0) return;

    // 가장 최근 게시글(마지막에 추가된 글)의 ID 확인
    const latestNoticeId = notices[notices.length - 1].id;
    
    // 현재 유저가 마지막으로 읽은 공지사항 ID 가져오기
    const userReadStatusKey = `lastReadNotice_${currentUser.id}`;
    const lastReadId = localStorage.getItem(userReadStatusKey);

    // 읽은 기록이 없거나, 최신 글 ID가 마지막으로 읽은 ID보다 크면 알림!
    if (!lastReadId || Number(lastReadId) < latestNoticeId) {
        alert("새로운 공지사항이 등록되었습니다! 목록에서 확인해주세요.");
    }
}

// 2. 공지사항 목록 렌더링
function renderNoticeList() {
    const notices = JSON.parse(localStorage.getItem('notices')) || [];
    const tbody = document.getElementById('notice-list');
    tbody.innerHTML = '';

    if (notices.length === 0) {
        return tbody.innerHTML = `<tr><td colspan="4">등록된 공지사항이 없습니다.</td></tr>`;
    }

    // 최신 글이 위로 오도록 배열을 복사한 뒤 뒤집어서 출력
    const reversedNotices = [...notices].reverse();

    reversedNotices.forEach((notice, index) => {
        // 전체 글 개수에서 인덱스를 빼서 역순 번호 생성 (예: 5, 4, 3, 2, 1)
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

// 3. 화면 전환 제어 함수
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

// 4. 공지사항 작성 및 저장 로직
function submitNotice() {
    const title = document.getElementById('notice-title').value.trim();
    const content = document.getElementById('notice-content').value.trim();

    if (!title || !content) {
        return alert("제목과 내용을 모두 입력해주세요.");
    }

    const notices = JSON.parse(localStorage.getItem('notices')) || [];
    
    // 현재 날짜 및 시간 포맷팅 (YYYY-MM-DD HH:mm)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + kstOffset);
    const dateString = localNow.toISOString().replace('T', ' ').slice(0, 16);

    const newNotice = {
        id: Date.now(), // 고유 ID로 현재 시간(밀리초) 사용
        title: title,
        content: content,
        authorId: currentUser.id,
        authorName: currentUser.name,
        date: dateString
    };

    notices.push(newNotice);
    localStorage.setItem('notices', JSON.stringify(notices));

    alert("공지사항이 등록되었습니다.");
    toggleWriteForm(false); // 목록 화면으로 전환
    renderNoticeList(); // 목록 새로고침
}

// 5. 상세 보기 열기
function viewNotice(id) {
    const notices = JSON.parse(localStorage.getItem('notices')) || [];
    const notice = notices.find(n => n.id === id);

    if (!notice) return alert("존재하지 않는 게시글입니다.");

    currentViewingNoticeId = id; // 현재 보고 있는 글 ID 저장

    // 화면 데이터 바인딩
    document.getElementById('detail-title').innerText = notice.title;
    document.getElementById('detail-author').innerText = `작성자: ${notice.authorName}`;
    document.getElementById('detail-date').innerText = notice.date;
    document.getElementById('detail-content').innerText = notice.content;

    // 현재 유저가 작성자이거나 최고 관리자(사장)일 경우에만 삭제 버튼 노출
    if (currentUser.id === notice.authorId || currentUser.role === '사장') {
        document.getElementById('btn-delete').classList.remove('hidden');
    } else {
        document.getElementById('btn-delete').classList.add('hidden');
    }

    // 내가 읽은 가장 최신 글의 ID 갱신 (새글 알림 방지용)
    const userReadStatusKey = `lastReadNotice_${currentUser.id}`;
    const lastReadId = localStorage.getItem(userReadStatusKey);
    if (!lastReadId || Number(lastReadId) < id) {
        localStorage.setItem(userReadStatusKey, id);
    }

    // 화면 전환
    document.getElementById('section-list').classList.add('hidden');
    document.getElementById('section-detail').classList.remove('hidden');
}

// 6. 상세 보기 닫기
function closeDetail() {
    document.getElementById('section-detail').classList.add('hidden');
    document.getElementById('section-list').classList.remove('hidden');
    currentViewingNoticeId = null;
    renderNoticeList(); // 읽음 상태 등이 갱신되었을 수 있으므로 재렌더링
}

// 7. 게시글 삭제 로직
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