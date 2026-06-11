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
    renderMyWeeklySchedule(); 
    viewWorkHistory(); 
};


function getISOWeekString(dateObj) {
    const target = new Date(dateObj.valueOf());
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
    return `${target.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}


function renderMyWeeklySchedule() {
    const currentWeekStr = getISOWeekString(new Date());
    const schedules = JSON.parse(localStorage.getItem('schedules')) || [];
    const myThisWeek = schedules.filter(s => 
        s.week === currentWeekStr && 
        s.empId === currentUser.id && 
        s.isConfirmed === true
    );
    
    const container = document.getElementById('my-weekly-schedule-container');
    if (!container) return;
    if (myThisWeek.length === 0) {
        container.innerHTML = `<p style="padding:10px; color:#888;">이번 주 확정된 출근 스케줄이 없습니다.</p>`;
        return;
    }
    const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];
    myThisWeek.sort((a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day));
    let html = `<div style="display: flex; gap: 10px; flex-wrap: wrap;">`;
    myThisWeek.forEach(s => {
        html += `
            <div style="background:#e7f1ff; border:1px solid #b3d7ff; padding:10px; border-radius:5px; text-align:center;">
                <div style="font-weight:bold; color:#0056b3;">${s.day}요일</div>
                <div style="font-size:13px;">${s.assignedRole}</div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

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
    const wage = freshUserInfo ? (freshUserInfo.hourlyWage || 0) : 0;
    if (wage === 0) {
        return alert("시급이 설정되어 있지 않아 근무를 등록할 수 없습니다. 관리자에게 먼저 문의해주세요.");
    }
    const dailyWage = Math.floor(diffHours * wage);
    const newLog = {
        id: Date.now(),
        empId: currentUser.id,
        workDate: workDate,
        startTime: startTime,
        endTime: endTime,
        workingHours: diffHours.toFixed(1), 
        wageApplied: wage,
        dailyWage: dailyWage
    };
    let worklogs = JSON.parse(localStorage.getItem('worklogs')) || [];
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
        tbody.innerHTML += `
            <tr>
                <td>${log.workDate}</td>
                <td>${log.startTime}</td>
                <td>${log.endTime}</td>
                <td>${log.workingHours}h</td>
                <td>${log.dailyWage.toLocaleString()}원</td>
                <td>
                    <button class="btn-small" onclick="editWorkLog(${log.id})">수정</button>
                    <button class="btn-small btn-danger" onclick="deleteWorkLog(${log.id})">삭제</button>
                </td>
            </tr>
        `;
    });
    document.getElementById('salary-summary').innerHTML = `
        해당 월 총 근무: ${totalHours.toFixed(1)}시간 | 누적 월급: <strong>${totalSalary.toLocaleString()}원</strong>
    `;
}

function deleteWorkLog(logId) {
    if(!confirm("삭제하시겠습니까?")) return;
    let logs = JSON.parse(localStorage.getItem('worklogs')) || [];
    logs = logs.filter(log => log.id !== logId);
    localStorage.setItem('worklogs', JSON.stringify(logs));
    viewWorkHistory();
}

function editWorkLog(logId) {
    let logs = JSON.parse(localStorage.getItem('worklogs')) || [];
    const targetLog = logs.find(log => log.id === logId);
    if(targetLog) {
        document.getElementById('work-date').value = targetLog.workDate;
        document.getElementById('start-time').value = targetLog.startTime;
        document.getElementById('end-time').value = targetLog.endTime;
        logs = logs.filter(log => log.id !== logId);
        localStorage.setItem('worklogs', JSON.stringify(logs));
        viewWorkHistory();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function handleLogout() {
    if(confirm("로그아웃 하시겠습니까?")) {
        sessionStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    }
}
