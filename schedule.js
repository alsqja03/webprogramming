let currentUser = null;
const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];

window.onload = function() {
    currentUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        window.location.href = 'index.html';
        return;
    }

    if (currentUser.role === '사장' || currentUser.role === '부관리자') {
        document.getElementById('nav-admin').classList.remove('hidden');
        document.getElementById('confirm-section').classList.remove('hidden');
    }

    renderSubmitForm();
    setDefaultWeeks(); 
};


function setDefaultWeeks() {
    let today = new Date();
    let currentWeek = getISOWeekString(today);
    let nextDate = new Date(today);
    nextDate.setDate(today.getDate() + 7);
    let nextWeek = getISOWeekString(nextDate);
    
    document.getElementById('view-week').value = currentWeek;
    document.getElementById('submit-week').value = nextWeek;
    document.getElementById('confirm-week').value = nextWeek;
}

function getISOWeekString(dateObj) {
    const target = new Date(dateObj.valueOf());
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
    return `${target.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

function renderSubmitForm() {
    const tbody = document.getElementById('submit-tbody');
    tbody.innerHTML = '';
    daysOfWeek.forEach(day => {
        tbody.innerHTML += `<tr><td style="text-align:center; font-weight:bold;">${day}</td><td style="text-align:center;"><input type="checkbox" class="day-checkbox" id="chk-${day}"></td><td><input type="text" id="remark-${day}" placeholder="비워두셔도 됩니다."></td></tr>`;
    });
}

function submitMySchedule() {
    const targetWeek = document.getElementById('submit-week').value;
    let schedules = JSON.parse(localStorage.getItem('schedules')) || [];
    schedules = schedules.filter(s => !(s.empId === currentUser.id && s.week === targetWeek));
    let submittedCount = 0;
    daysOfWeek.forEach(day => {
        const isAvailable = document.getElementById(`chk-${day}`).checked;
        const remarks = document.getElementById(`remark-${day}`).value.trim();
        if (isAvailable || remarks !== "") {
            schedules.push({ week: targetWeek, day: day, empId: currentUser.id, empName: currentUser.name, isAvailable, remarks, isConfirmed: false, assignedRole: '' });
            submittedCount++;
        }
    });
    if (submittedCount === 0) return alert("제출할 내용이 없습니다.");
    localStorage.setItem('schedules', JSON.stringify(schedules));
    alert("성공적으로 제출되었습니다.");
}

function loadCandidates() {
    const targetWeek = document.getElementById('confirm-week').value;
    const roles = JSON.parse(localStorage.getItem('roles')) || [];
    const employees = JSON.parse(localStorage.getItem('employees')) || [];
    let schedules = JSON.parse(localStorage.getItem('schedules')) || [];

    let candidates = schedules.filter(s => s.week === targetWeek);
    candidates.sort((a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day));

    const tbody = document.getElementById('candidate-list');
    tbody.innerHTML = '';
    if (candidates.length === 0) return tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">해당 주차에 제출된 스케줄이 없습니다.</td></tr>`;
    
    let dayCounts = {};
    candidates.forEach(c => { dayCounts[c.day] = (dayCounts[c.day] || 0) + 1; });
    let renderedDays = {}; 

    candidates.forEach((cand) => {
        const empData = employees.find(e => e.id === cand.empId);
        const defaultRole = empData ? empData.role : '';
        const dayCell = !renderedDays[cand.day] ? `<td rowspan="${dayCounts[cand.day]}" style="font-weight:bold; background-color:#f8f9fa; text-align:center; vertical-align:middle;">${cand.day}</td>` : '';
        renderedDays[cand.day] = true;

        // [수정] 직책 자동 로딩 (cand.assignedRole이 있으면 쓰고, 없으면 기본값)
        let roleOptions = roles.map(r => `<option value="${r}" ${(cand.assignedRole || defaultRole) === r ? 'selected' : ''}>${r}</option>`).join('');
        const isChecked = cand.isConfirmed ? 'checked' : '';

        tbody.innerHTML += `
            <tr data-emp="${cand.empId}" data-day="${cand.day}">
                ${dayCell}
                <td style="font-weight:bold;">${cand.empName} (${cand.isAvailable ? '가능' : '불가'})</td>
                <td>${cand.remarks || '-'}</td>
                <td><select class="sel-role"><option value="">선택</option>${roleOptions}</select></td>
                <td><input type="text" class="mod-remark" value="${cand.remarks}"></td>
                <td style="text-align:center;"><input type="checkbox" class="chk-confirm" ${isChecked}></td>
            </tr>
        `;
    });
}

function saveConfirmedSchedule() {
    const targetWeek = document.getElementById('confirm-week').value;
    const rows = document.querySelectorAll('#candidate-list tr[data-emp]');
    let schedules = JSON.parse(localStorage.getItem('schedules')) || [];
    let updateCount = 0;

    rows.forEach(row => {
        const empId = row.getAttribute('data-emp');
        const day = row.getAttribute('data-day');
        const isConfirmChecked = row.querySelector('.chk-confirm').checked;
        const selectedRole = row.querySelector('.sel-role').value;
        const modRemark = row.querySelector('.mod-remark').value;
        const idx = schedules.findIndex(s => s.week === targetWeek && s.day === day && s.empId === empId);

        if (idx > -1) {
            schedules[idx].isConfirmed = isConfirmChecked;
            schedules[idx].assignedRole = isConfirmChecked ? selectedRole : '';
            schedules[idx].remarks = modRemark;
            schedules[idx].isAvailable = true;
            updateCount++;
        }
    });
    localStorage.setItem('schedules', JSON.stringify(schedules));
    alert("저장되었습니다.");
    loadCandidates();
}

function viewConfirmedSchedule() {
    const targetWeek = document.getElementById('view-week').value;
    const schedules = JSON.parse(localStorage.getItem('schedules')) || [];
    const confirmed = schedules.filter(s => s.week === targetWeek && s.isConfirmed);
    const tbody = document.getElementById('confirmed-schedule-list');
    tbody.innerHTML = '';

    if (confirmed.length === 0) {
        return tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">해당 주차에 확정된 시간표가 없습니다.</td></tr>`;
    }

    daysOfWeek.forEach(day => {
        let daySchedules = confirmed.filter(s => s.day === day);
        if (daySchedules.length === 0) return; // 출근자가 없는 요일은 스킵
        
        // 직책(가나다) -> 이름(가나다) 순으로 정렬
        daySchedules.sort((a, b) => {
            if (a.assignedRole !== b.assignedRole) return a.assignedRole.localeCompare(b.assignedRole);
            return a.empName.localeCompare(b.empName);
        });
        
        // 직책별 개수 계산
        let roleCounts = {};
        daySchedules.forEach(s => { roleCounts[s.assignedRole] = (roleCounts[s.assignedRole] || 0) + 1; });
        let renderedRoles = {};

        daySchedules.forEach((s, index) => {
            // 요일 셀 병합
            const dayCell = index === 0 ? `<td rowspan="${daySchedules.length}" style="font-weight:bold; text-align:center; background:#f8f9fa; vertical-align:middle;">${day}</td>` : '';
            
            // 직책 셀 병합
            const roleCell = !renderedRoles[s.assignedRole] 
                ? `<td rowspan="${roleCounts[s.assignedRole]}" style="text-align:center; vertical-align:middle;"><span style="background:#e9ecef; padding:3px 8px; border-radius:4px; font-size:12px;">${s.assignedRole}</span></td>` 
                : '';
            renderedRoles[s.assignedRole] = true;

            tbody.innerHTML += `
                <tr>
                    ${dayCell}
                    ${roleCell}
                    <td style="font-weight:bold; vertical-align:middle;">${s.empName}</td>
                    <td style="color:#555; vertical-align:middle;">${s.remarks}</td>
                </tr>
            `;
        });
    });
}

function handleLogout() {
    if(confirm("로그아웃 하시겠습니까?")) {
        sessionStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    }
}
