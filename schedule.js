// 현재 로그인한 사용자 정보
let currentUser = null;
const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];

// 1. 페이지 로드 시 초기화 로직
window.onload = function() {
    currentUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    
    // 로그인 안 되어있으면 튕겨내기
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        window.location.href = 'index.html';
        return;
    }

    // 권한에 따른 화면 제어 (관리자면 '시간표 확정' 및 '관리 탭' 보여주기)
    if (currentUser.role === '사장' || currentUser.role === '부관리자') {
        document.getElementById('nav-admin').classList.remove('hidden');
        document.getElementById('confirm-section').classList.remove('hidden');
    }

    // 기본 날짜 세팅 및 제출 폼 렌더링
    renderSubmitForm();
    setDefaultWeeks();
};

// 기본 주차 세팅 (HTML5 week input용)
function setDefaultWeeks() {
    // 현재 주차를 구하는 로직 (간단히 시연용으로 임의의 주차 세팅)
    const today = new Date();
    const year = today.getFullYear();
    // HTML week value 형식은 "2026-W24" 형태입니다. 임시로 현재 연도-W01로 세팅
    const defaultWeek = `${year}-W01`; 
    
    document.getElementById('view-week').value = defaultWeek;
    document.getElementById('submit-week').value = defaultWeek;
    document.getElementById('confirm-week').value = defaultWeek;
}

// 2. [직원용] 시간표 제출 폼 그리기
function renderSubmitForm() {
    const tbody = document.getElementById('submit-tbody');
    tbody.innerHTML = '';
    
    daysOfWeek.forEach(day => {
        tbody.innerHTML += `
            <tr>
                <td style="text-align:center; font-weight:bold;">${day}</td>
                <td style="text-align:center;"><input type="checkbox" class="day-checkbox" id="chk-${day}"></td>
                <td><input type="text" id="remark-${day}" placeholder="비워두셔도 됩니다."></td>
            </tr>
        `;
    });
}

// 3. [직원용] 시간표 제출 기능
function submitMySchedule() {
    const targetWeek = document.getElementById('submit-week').value;
    if(!targetWeek) return alert("제출할 주차를 선택하세요.");

    let schedules = JSON.parse(localStorage.getItem('schedules')) || [];
    
    // 이전에 제출한 같은 주차의 내 데이터가 있다면 덮어쓰기 위해 삭제
    schedules = schedules.filter(s => !(s.empId === currentUser.id && s.week === targetWeek));

    let submittedCount = 0;

    daysOfWeek.forEach(day => {
        const isAvailable = document.getElementById(`chk-${day}`).checked;
        const remarks = document.getElementById(`remark-${day}`).value.trim();

        // 기획안 조건: 가능한 날이거나, 불가능해도 기타사항이 있는 경우만 전송
        if (isAvailable || remarks !== "") {
            schedules.push({
                week: targetWeek,
                day: day,
                empId: currentUser.id,
                empName: currentUser.name,
                isAvailable: isAvailable,
                remarks: remarks,
                isConfirmed: false,   // 사장님 확인 전
                assignedRole: ''      // 확정 직책 없음
            });
            submittedCount++;
        }
    });

    if (submittedCount === 0) {
        return alert("제출할 스케줄(가능 요일 또는 기타사항)이 없습니다.");
    }

    localStorage.setItem('schedules', JSON.stringify(schedules));
    alert("다음 주 시간표가 성공적으로 제출되었습니다.");
}

// 4. [관리자용] 특정 요일 신청자 불러오기
function loadCandidates() {
    const targetWeek = document.getElementById('confirm-week').value;
    const roles = JSON.parse(localStorage.getItem('roles')) || [];
    let schedules = JSON.parse(localStorage.getItem('schedules')) || [];

    // 상태 구분 없이 해당 주차에 제출된 '모든' 데이터를 필터링
    let candidates = schedules.filter(s => s.week === targetWeek);

    // 요일 순서대로 정렬
    candidates.sort((a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day));

    const tbody = document.getElementById('candidate-list');
    tbody.innerHTML = '';

    if (candidates.length === 0) {
        return tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">해당 주차에 제출된 스케줄이 없습니다.</td></tr>`;
    }
    
    // 요일 병합을 위한 개수 계산
    let dayCounts = {};
    candidates.forEach(c => { dayCounts[c.day] = (dayCounts[c.day] || 0) + 1; });
    let renderedDays = {}; 

    candidates.forEach((cand) => {
        const availText = cand.isAvailable ? "가능" : "불가능";
        const availColor = cand.isAvailable ? "blue" : "red";
        
        const dayCell = !renderedDays[cand.day] 
            ? `<td rowspan="${dayCounts[cand.day]}" style="font-weight:bold; background-color:#f8f9fa; text-align:center; vertical-align:middle;">${cand.day}</td>` 
            : '';
        renderedDays[cand.day] = true;

        // 이미 확정된 데이터라면 기존 직책을 미리 선택(selected)해 둠
        let roleOptions = roles.map(r => `<option value="${r}" ${cand.assignedRole === r ? 'selected' : ''}>${r}</option>`).join('');
        
        // 이미 확정된 데이터라면 체크박스를 미리 체크(checked)해 둠
        const isChecked = cand.isConfirmed ? 'checked' : '';

        tbody.innerHTML += `
            <tr data-emp="${cand.empId}" data-day="${cand.day}">
                ${dayCell}
                <td style="font-weight:bold;">${cand.empName} (<span style="color:${availColor}">${availText}</span>)</td>
                <td style="color:#666;">${cand.remarks || '-'}</td>
                <td><select class="sel-role"><option value="">직책 선택</option>${roleOptions}</select></td>
                <td><input type="text" class="mod-remark" value="${cand.remarks}" placeholder="수정 가능"></td>
                <td style="text-align:center;"><input type="checkbox" class="day-checkbox chk-confirm" ${isChecked}></td>
            </tr>
        `;
    });
}

// 2. [관리자] 변경된 시간표 통합 저장 로직
function saveConfirmedSchedule() {
    const targetWeek = document.getElementById('confirm-week').value;
    const rows = document.querySelectorAll('#candidate-list tr[data-emp]');
    if(rows.length === 0) return alert("저장할 인원이 없습니다.");

    let schedules = JSON.parse(localStorage.getItem('schedules')) || [];
    let updateCount = 0;
    let errorFlag = false;

    rows.forEach(row => {
        if (errorFlag) return; // 에러 발생 시 반복문 스킵

        const empId = row.getAttribute('data-emp');
        const day = row.getAttribute('data-day');
        const isConfirmChecked = row.querySelector('.chk-confirm').checked;
        const selectedRole = row.querySelector('.sel-role').value;
        const modRemark = row.querySelector('.mod-remark').value;

        const scheduleIndex = schedules.findIndex(s => s.week === targetWeek && s.day === day && s.empId === empId);

        if (scheduleIndex > -1) {
            // [경우 1] 체크박스가 켜져 있는 경우 (확정 처리)
            if (isConfirmChecked) {
                if(!selectedRole) {
                    alert(`${day}요일 ${schedules[scheduleIndex].empName}님의 직책을 선택해주세요!`);
                    errorFlag = true;
                    return;
                }
                schedules[scheduleIndex].isConfirmed = true;
                schedules[scheduleIndex].assignedRole = selectedRole;
                schedules[scheduleIndex].remarks = modRemark;
                schedules[scheduleIndex].isAvailable = true; 
                updateCount++;
            } 
            // [경우 2] 체크박스가 꺼져 있는 경우 (확정 취소 및 미확정 유지)
            else {
                // 이전에 확정(true) 상태였다면 취소 처리
                if (schedules[scheduleIndex].isConfirmed) {
                    schedules[scheduleIndex].isConfirmed = false;
                    schedules[scheduleIndex].assignedRole = '';
                    schedules[scheduleIndex].remarks = modRemark; 
                    updateCount++;
                } 
                // 미확정 상태에서 관리자 기타사항만 수정한 경우
                else if (schedules[scheduleIndex].remarks !== modRemark) {
                    schedules[scheduleIndex].remarks = modRemark;
                    updateCount++;
                }
            }
        }
    });

    if (errorFlag) return;

    if(updateCount > 0) {
        localStorage.setItem('schedules', JSON.stringify(schedules));
        alert(`시간표가 성공적으로 저장(업데이트)되었습니다!`);
        loadCandidates(); // 변경된 상태로 화면 새로고침
    } else {
        alert("변경된 항목이 없습니다.");
    }
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

// [공통] 로그아웃
function handleLogout() {
    if(confirm("로그아웃 하시겠습니까?")) {
        sessionStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    }
}