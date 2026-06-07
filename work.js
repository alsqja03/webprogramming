let currentUser = null;

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
    if (!localStorage.getItem('worklogs')) {
        localStorage.setItem('worklogs', JSON.stringify([]));
    }

    const today = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const localToday = new Date(today.getTime() + kstOffset).toISOString();
    
    document.getElementById('work-date').value = localToday.split('T')[0];
    document.getElementById('view-month').value = localToday.slice(0, 7); 
    viewWorkHistory(); 
};

function recordWorkTime() {
    const workDate = document.getElementById('work-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;

    if (!workDate || !startTime || !endTime) return alert("날짜와 출퇴근 시간을 모두 입력해주세요.");

    const start = new Date(`1970-01-01T${startTime}:00`);
    let end = new Date(`1970-01-01T${endTime}:00`);
    if (end < start) end.setDate(end.getDate() + 1);

    const diffHours = (end - start) / (1000 * 60 * 60);

    const employees = JSON.parse(localStorage.getItem('employees')) || [];
    const freshUserInfo = employees.find(emp => emp.id === currentUser.id);
    const wage = freshUserInfo.hourlyWage || 0;

    // [추가됨] 시급 미설정 시 방어 로직
    if (wage === 0) {
        return alert("시급이 설정되어 있지 않아 근무를 등록할 수 없습니다. 관리자에게 먼저 문의해주세요.");
    }

    const dailyWage = Math.floor(diffHours * wage);

    const newLog = {
        id: Date.now(), // [추가됨] 수정/삭제를 위한 고유 ID 부여
        empId: currentUser.id,
        workDate: workDate,
        startTime: startTime,
        endTime: endTime,
        workingHours: diffHours.toFixed(1), 
        wageApplied: wage,
        dailyWage: dailyWage
    };

    let worklogs = JSON.parse(localStorage.getItem('worklogs'));
    worklogs.push(newLog);
    worklogs.sort((a, b) => new Date(a.workDate) - new Date(b.workDate));
    localStorage.setItem('worklogs', JSON.stringify(worklogs));

    alert(`${workDate} 일자 근무가 등록되었습니다.`);
    document.getElementById('view-month').value = workDate.slice(0, 7);
    viewWorkHistory();
}

function viewWorkHistory() {
    const targetMonth = document.getElementById('view-month').value; 
    if (!targetMonth) return;

    const worklogs = JSON.parse(localStorage.getItem('worklogs')) || [];
    const myLogs = worklogs.filter(log => log.empId === currentUser.id && log.workDate.startsWith(targetMonth));
    const tbody = document.getElementById('work-history-list');
    tbody.innerHTML = '';
    
    let totalSalary = 0;
    let totalHours = 0;

    if (myLogs.length === 0) {
        document.getElementById('salary-summary').innerHTML = `${targetMonth}월의 근무 기록이 없습니다.`;
        return tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">해당 월의 근무 기록이 없습니다.</td></tr>`;
    }

    myLogs.forEach(log => {
        totalSalary += log.dailyWage;
        totalHours += parseFloat(log.workingHours);

        // 수정 삭제 버튼 추가됨
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:bold;">${log.workDate}</td>
                <td>${log.startTime}</td>
                <td>${log.endTime}</td>
                <td style="color:#28a745; font-weight:bold;">${log.workingHours} 시간</td>
                <td>
                    ${log.dailyWage.toLocaleString()}원 
                    <span style="font-size:12px; color:#888;">(${log.wageApplied.toLocaleString()}원 × ${log.workingHours}h)</span>
                </td>
                <td>
                    <button class="btn-small" onclick="editWorkLog(${log.id})">수정</button>
                    <button class="btn-small btn-danger" onclick="deleteWorkLog(${log.id})">삭제</button>
                </td>
            </tr>
        `;
    });

    document.getElementById('salary-summary').innerHTML = `
        해당 월 총 근무: ${totalHours.toFixed(1)}시간 <br>
        누적 월급: <span>${totalSalary.toLocaleString()}</span> 원
    `;
}

// [추가됨] 근무 기록 삭제 로직
function deleteWorkLog(logId) {
    if(!confirm("해당 근무 기록을 삭제하시겠습니까?")) return;
    
    let logs = JSON.parse(localStorage.getItem('worklogs')) || [];
    logs = logs.filter(log => log.id !== logId);
    localStorage.setItem('worklogs', JSON.stringify(logs));
    
    alert("삭제되었습니다.");
    viewWorkHistory();
}

// [추가됨] 근무 기록 수정 로직 (기존 데이터를 입력창으로 올리고 기존 데이터는 삭제)
function editWorkLog(logId) {
    let logs = JSON.parse(localStorage.getItem('worklogs')) || [];
    const targetLog = logs.find(log => log.id === logId);
    
    if(targetLog) {
        // 상단 폼에 데이터 채워넣기
        document.getElementById('work-date').value = targetLog.workDate;
        document.getElementById('start-time').value = targetLog.startTime;
        document.getElementById('end-time').value = targetLog.endTime;
        
        // 기존 데이터는 삭제 처리 (사용자가 수정 후 재등록하게 유도)
        logs = logs.filter(log => log.id !== logId);
        localStorage.setItem('worklogs', JSON.stringify(logs));
        
        alert("수정할 근무 기록을 상단 입력창으로 불러왔습니다.\n내용을 수정한 뒤 [근무 등록] 버튼을 다시 눌러주세요.");
        viewWorkHistory(); // 화면 갱신하여 기존 리스트에선 숨김
        
        // 스크롤을 맨 위로 올려서 폼을 보게 함
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function handleLogout() {
    if(confirm("로그아웃 하시겠습니까?")) {
        sessionStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    }
}