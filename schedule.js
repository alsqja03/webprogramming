let currentUser = null;
const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];

window.onload = function () {
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


function toWeekInputValue(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); 
    const year = d.getFullYear();
    const startOfYear = new Date(year, 0, 4); 
    const week = 1 + Math.round(((d - startOfYear) / 86400000 - 3 + ((startOfYear.getDay() + 6) % 7)) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

function setDefaultWeeks() {
    const today = new Date();
    const nextWeekDate = new Date(today);
    nextWeekDate.setDate(today.getDate() + 7);

    document.getElementById('view-week').value = toWeekInputValue(today);
    document.getElementById('submit-week').value = toWeekInputValue(nextWeekDate);
    document.getElementById('confirm-week').value = toWeekInputValue(nextWeekDate);
}

function renderSubmitForm() {
    const tbody = document.getElementById('submit-tbody');
    tbody.innerHTML = daysOfWeek.map(day => `
        <tr>
            <td style="text-align:center; font-weight:bold;">${day}</td>
            <td style="text-align:center;">
                <input type="checkbox" class="day-checkbox" id="chk-${day}">
            </td>
            <td>
                <input type="text" id="remark-${day}" placeholder="비워두셔도 됩니다.">
            </td>
        </tr>
    `).join('');
}

function submitMySchedule() {
    const targetWeek = document.getElementById('submit-week').value;
    let schedules = JSON.parse(localStorage.getItem('schedules')) || [];

    schedules = schedules.filter(function(schedule) {
        return !(schedule.empId === currentUser.id &&
                 schedule.week === targetWeek);
    });
    const newEntries = [];
    for (let i = 0; i < daysOfWeek.length; i++) {
        const day = daysOfWeek[i];
        const isAvailable = document.getElementById('chk-' + day).checked;
        const remarks = document.getElementById('remark-' + day).value.trim();
        if (!isAvailable && remarks === '') {
            continue;
        }
        newEntries.push({
            week: targetWeek,
            day: day,
            empId: currentUser.id,
            empName: currentUser.name,
            isAvailable: isAvailable,
            remarks: remarks,
            isConfirmed: false,
            assignedRole: ''
        });
    }
    if (newEntries.length === 0) {
        alert('제출할 내용이 없습니다.');
        return;
    }
    schedules = schedules.concat(newEntries);
    localStorage.setItem(
        'schedules',
        JSON.stringify(schedules)
    );
    alert('성공적으로 제출되었습니다.');
}

function loadCandidates() {
    const targetWeek = document.getElementById('confirm-week').value;
    const roles = JSON.parse(localStorage.getItem('roles')) || [];
    const employees = JSON.parse(localStorage.getItem('employees')) || [];
    const schedules = JSON.parse(localStorage.getItem('schedules')) || [];

    const candidates = schedules
        .filter(s => s.week === targetWeek)
        .sort((a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day));

    const tbody = document.getElementById('candidate-list');
    if (candidates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">해당 주차에 제출된 스케줄이 없습니다.</td></tr>`;
        return;
    }


    const dayCounts = {};
    candidates.forEach(c => { dayCounts[c.day] = (dayCounts[c.day] || 0) + 1; });
    const renderedDays = {};

    tbody.innerHTML = candidates.map(cand => {
        const empData = employees.find(e => e.id === cand.empId);
        const defaultRole = empData?.role ?? '';
        const selectedRole = cand.assignedRole || defaultRole;

        const dayCell = !renderedDays[cand.day]
            ? `<td rowspan="${dayCounts[cand.day]}" style="font-weight:bold; background-color:#f8f9fa; text-align:center; vertical-align:middle;">${cand.day}</td>`
            : '';
        renderedDays[cand.day] = true;

        const roleOptions = roles
            .map(r => `<option value="${r}" ${selectedRole === r ? 'selected' : ''}>${r}</option>`)
            .join('');

        return `
            <tr data-emp="${cand.empId}" data-day="${cand.day}">
                ${dayCell}
                <td style="font-weight:bold;">${cand.empName} (${cand.isAvailable ? '가능' : '불가'})</td>
                <td>${cand.remarks || '-'}</td>
                <td><select class="sel-role"><option value="">선택</option>${roleOptions}</select></td>
                <td><input type="text" class="mod-remark" value="${cand.remarks}"></td>
                <td style="text-align:center;"><input type="checkbox" class="chk-confirm" ${cand.isConfirmed ? 'checked' : ''}></td>
            </tr>
        `;
    }).join('');
}

function saveConfirmedSchedule() {
    const targetWeek = document.getElementById('confirm-week').value;
    const rows = document.querySelectorAll('#candidate-list tr[data-emp]');
    let schedules = JSON.parse(localStorage.getItem('schedules')) || [];

    rows.forEach(row => {
        let empId = row.getAttribute('data-emp');
        const day = row.getAttribute('data-day');
        let isConfirmed = row.querySelector('.chk-confirm').checked;
        let selectedRole = row.querySelector('.sel-role').value;
        let modRemark = row.querySelector('.mod-remark').value;

        const idx = schedules.findIndex(s => s.week === targetWeek && s.day === day && s.empId === empId);
        if (idx > -1) {
            schedules[idx].isConfirmed = isConfirmed;
            schedules[idx].assignedRole = isConfirmed ? selectedRole : '';
            schedules[idx].remarks = modRemark;
            schedules[idx].isAvailable = true;
        }
    });

    localStorage.setItem('schedules', JSON.stringify(schedules));
    alert('저장되었습니다.');
    loadCandidates();
}

function viewConfirmedSchedule() {
    const targetWeek = document.getElementById('view-week').value;
    const schedules = JSON.parse(localStorage.getItem('schedules')) || [];
    const confirmed = schedules.filter(s => s.week === targetWeek && s.isConfirmed);
    const tbody = document.getElementById('confirmed-schedule-list');

    if (confirmed.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">해당 주차에 확정된 시간표가 없습니다.</td></tr>`;
        return;
    }

    tbody.innerHTML = daysOfWeek.flatMap(day => {
        const daySchedules = confirmed
            .filter(s => s.day === day)
            .sort((a, b) => {
                if (a.assignedRole !== b.assignedRole) return a.assignedRole.localeCompare(b.assignedRole);
                return a.empName.localeCompare(b.empName);
            });

        if (daySchedules.length === 0) return [];

        const roleCounts = {};
        daySchedules.forEach(s => { roleCounts[s.assignedRole] = (roleCounts[s.assignedRole] || 0) + 1; });
        const renderedRoles = {};

        return daySchedules.map((s, index) => {
            const dayCell = index === 0
                ? `<td rowspan="${daySchedules.length}" style="font-weight:bold; text-align:center; background:#f8f9fa; vertical-align:middle;">${day}</td>`
                : '';
            const roleCell = !renderedRoles[s.assignedRole]
                ? `<td rowspan="${roleCounts[s.assignedRole]}" style="text-align:center; vertical-align:middle;"><span style="background:#e9ecef; padding:3px 8px; border-radius:4px; font-size:12px;">${s.assignedRole}</span></td>`
                : '';
            renderedRoles[s.assignedRole] = true;

            return `
                <tr>
                    ${dayCell}
                    ${roleCell}
                    <td style="font-weight:bold; vertical-align:middle;">${s.empName}</td>
                    <td style="color:#555; vertical-align:middle;">${s.remarks}</td>
                </tr>
            `;
        });
    }).join('');
}

function handleLogout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        sessionStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    }
}
