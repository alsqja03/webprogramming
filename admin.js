function initAdminData() {
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    if (!loggedInUser || (loggedInUser.role !== '사장' && loggedInUser.role !== '부관리자')) {
        alert('관리자 권한이 필요합니다.');
        window.location.href = 'index.html';
        return;
    }
    if (!localStorage.getItem('roles')) {
        localStorage.setItem('roles', JSON.stringify(['사장', '매니저', '일반직원']));
    }
    renderRoles();
    renderEmployeeManagement();
}

function renderRoles() {
    const roles = JSON.parse(localStorage.getItem('roles')) || [];
    const roleListTbody = document.getElementById('role-list');
    const roleSelect = document.getElementById('emp-role');
    
    roleListTbody.innerHTML = '';
    roleSelect.innerHTML = '<option value="">직책을 선택하세요</option>';

    roles.forEach((role, index) => {
        roleListTbody.innerHTML += `<tr><td>${role}</td><td style="width: 100px;"><button class="btn-small btn-danger" onclick="deleteRole(${index})">삭제</button></td></tr>`;
        roleSelect.innerHTML += `<option value="${role}">${role}</option>`;
    });
}

function addRole() {
    const newRole = document.getElementById('new-role').value.trim();
    if (!newRole) return alert("직책명을 입력하세요.");
    const roles = JSON.parse(localStorage.getItem('roles')) || [];
    if (roles.includes(newRole)) return alert("이미 존재하는 직책입니다.");
    roles.push(newRole);
    localStorage.setItem('roles', JSON.stringify(roles));
    document.getElementById('new-role').value = '';
    renderRoles();
    renderEmployeeManagement(); // 직책이 추가되면 직원 관리의 select 옵션도 갱신되어야 함
}

function deleteRole(index) {
    if(!confirm("해당 직책을 삭제하시겠습니까?")) return;
    const roles = JSON.parse(localStorage.getItem('roles')) || [];
    roles.splice(index, 1);
    localStorage.setItem('roles', JSON.stringify(roles));
    renderRoles();
    renderEmployeeManagement();
}

function createEmployee() {
    const name = document.getElementById('emp-name').value.trim();
    const phone = document.getElementById('emp-phone').value.trim();
    const birth = document.getElementById('emp-birth').value.trim();
    const role = document.getElementById('emp-role').value;

    if (!name || !phone || !birth || !role) return alert("모든 항목을 입력하고 직책을 선택해주세요.");

    const employees = JSON.parse(localStorage.getItem('employees')) || [];
    if (employees.find(emp => emp.id === phone)) return alert("이미 등록된 전화번호입니다.");

    const newEmp = { id: phone, pw: birth, name: name, role: role, isFirstLogin: true, hourlyWage: 0 };
    employees.push(newEmp);
    localStorage.setItem('employees', JSON.stringify(employees));
    
    alert(`${name} 직원의 계정이 생성되었습니다. (초기 비밀번호: ${birth})`);
    
    document.getElementById('emp-name').value = '';
    document.getElementById('emp-phone').value = '';
    document.getElementById('emp-birth').value = '';
    document.getElementById('emp-role').value = '';
    renderEmployeeManagement(); 
}

// [수정됨] 직원 관리 렌더링
function renderEmployeeManagement() {
    const employees = JSON.parse(localStorage.getItem('employees')) || [];
    const roles = JSON.parse(localStorage.getItem('roles')) || [];
    const tbody = document.getElementById('employee-list');
    tbody.innerHTML = '';

    employees.forEach(emp => {
        const deleteBtn = emp.role === '사장' ? '' : `<button class="btn-small btn-danger" onclick="deleteEmployee('${emp.id}')">삭제</button>`;
        let roleOptions = roles.map(r => `<option value="${r}" ${emp.role === r ? 'selected' : ''}>${r}</option>`).join('');

        tbody.innerHTML += `
            <tr>
                <td><input type="text" id="name-${emp.id}" value="${emp.name}" style="width:80px; font-weight:bold;"></td>
                <td><input type="text" id="phone-${emp.id}" value="${emp.id}" style="width:110px;"></td>
                <td><select id="role-${emp.id}">${roleOptions}</select></td>
                <td><input type="number" id="wage-${emp.id}" value="${emp.hourlyWage || 0}" style="width:80px;"></td>
                <td>
                    <button class="btn-small" onclick="updateEmployee('${emp.id}')">저장</button>
                    ${deleteBtn}
                </td>
            </tr>
        `;
    });
}

// [추가됨] 직원 정보 종합 수정 기능
function updateEmployee(originalId) {
    const newName = document.getElementById(`name-${originalId}`).value.trim();
    const newPhone = document.getElementById(`phone-${originalId}`).value.trim();
    const newRole = document.getElementById(`role-${originalId}`).value;
    const newWage = parseInt(document.getElementById(`wage-${originalId}`).value);

    if (!newName || !newPhone || newWage < 0) return alert("올바른 이름, 전화번호, 시급을 입력하세요.");

    let employees = JSON.parse(localStorage.getItem('employees')) || [];
    
    if (originalId !== newPhone && employees.find(e => e.id === newPhone)) {
        return alert("이미 존재하는 전화번호입니다.");
    }

    const targetIndex = employees.findIndex(emp => emp.id === originalId);
    if (targetIndex > -1) {
        employees[targetIndex].name = newName;
        employees[targetIndex].id = newPhone;
        employees[targetIndex].role = newRole;
        employees[targetIndex].hourlyWage = newWage;
        
        localStorage.setItem('employees', JSON.stringify(employees));
        alert(`${newName} 직원의 정보가 수정되었습니다.`);
        renderEmployeeManagement();
    }
}

// [추가됨] 직원 삭제 기능
// [수정됨] 직원 및 연관 데이터 연쇄 삭제 기능
function deleteEmployee(phoneId) {
    if(!confirm("해당 직원 계정을 완전히 삭제하시겠습니까?\n(관련 스케줄 및 근무 기록도 모두 함께 삭제됩니다.)")) return;
    
    // 1. 직원 데이터 삭제
    let employees = JSON.parse(localStorage.getItem('employees')) || [];
    employees = employees.filter(emp => emp.id !== phoneId);
    localStorage.setItem('employees', JSON.stringify(employees));

    // 2. 스케줄 연쇄 삭제
    let schedules = JSON.parse(localStorage.getItem('schedules')) || [];
    schedules = schedules.filter(s => s.empId !== phoneId);
    localStorage.setItem('schedules', JSON.stringify(schedules));

    // 3. 근무 기록 연쇄 삭제
    let worklogs = JSON.parse(localStorage.getItem('worklogs')) || [];
    worklogs = worklogs.filter(log => log.empId !== phoneId);
    localStorage.setItem('worklogs', JSON.stringify(worklogs));

    renderEmployeeManagement();
    alert("직원 및 연관 데이터가 성공적으로 삭제되었습니다.");
}

function handleLogout() {
    if(confirm("로그아웃 하시겠습니까?")) {
        sessionStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    }
}

window.onload = initAdminData;
