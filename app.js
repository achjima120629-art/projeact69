// Application State
let projectsData = [];
let filteredData = [];
let columnMapping = {};
let allHeaders = [];

// Chart Instances
let statusChart = null;
let budgetChart = null;

// Configuration
const GOOGLE_SHEET_BASE_URL = 'https://docs.google.com/spreadsheets/d/1DrKZ_EosBp4jyjZzgzv15EPb0L6LMJwPk5eFPvyyD6I';

// Fetch Google Sheet using JSONP to bypass CORS restrictions
function fetchGoogleSheetJSONP() {
    return new Promise((resolve, reject) => {
        const callbackName = 'gvizCallback_' + Math.round(Math.random() * 1000000);
        
        window[callbackName] = function(response) {
            const el = document.getElementById(scriptId);
            if (el) el.remove();
            delete window[callbackName];
            
            if (response.status === 'error') {
                reject(new Error(response.errors[0]?.detailed_message || 'Google Sheet Visualization API returned an error.'));
            } else {
                resolve(response);
            }
        };
        
        const scriptId = 'gviz_script_' + callbackName;
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `${GOOGLE_SHEET_BASE_URL}/gviz/tq?tqx=responseHandler:${callbackName}`;
        script.onerror = () => {
            const el = document.getElementById(scriptId);
            if (el) el.remove();
            delete window[callbackName];
            reject(new Error('Failed to load Google Sheet data. Please ensure the spreadsheet sharing is set to "Anyone with the link can view".'));
        };
        
        document.body.appendChild(script);
    });
}

// CSS status colors
const COLORS = {
    completed: '#10b981',
    progress: '#f59e0b',
    pending: '#9ca3af',
    primary: '#6366f1',
    accent: '#a855f7',
    info: '#06b6d4'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initEventListeners();
    fetchData();
});

// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeToggleUI(savedTheme);
}

function updateThemeToggleUI(theme) {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;
    
    // Lucide icons are handled inside toggle button
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggleUI(newTheme);
    
    // Re-render charts to update grid lines and text colors
    if (projectsData.length > 0) {
        renderCharts(filteredData);
    }
}

// Navigation & Event Listeners
function initEventListeners() {
    // Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Sync button
    document.getElementById('btn-sync').addEventListener('click', fetchData);

    // Search and Filter controls
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('filter-status').addEventListener('change', applyFilters);
    document.getElementById('filter-department').addEventListener('change', applyFilters);
    document.getElementById('filter-strategy').addEventListener('change', applyFilters);

    // Modal Close
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('project-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('project-modal')) {
            closeModal();
        }
    });

    // Sidebar navigation
    const menuDashboard = document.getElementById('menu-dashboard');
    const menuProjects = document.getElementById('menu-projects');
    const menuBudget = document.getElementById('menu-budget');
    const dashboardView = document.getElementById('dashboard-view');
    const filterPanel = document.querySelector('.filter-panel');
    const tableSection = document.querySelector('.table-section');

    menuDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuDashboard);
        dashboardView.style.display = 'block';
        filterPanel.style.display = 'block';
        tableSection.style.display = 'block';
        // Reset budget filter if any
        document.getElementById('filter-status').value = 'all';
        applyFilters();
    });

    menuProjects.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuProjects);
        dashboardView.style.display = 'none'; // Hide KPIs and Charts
        filterPanel.style.display = 'block';
        tableSection.style.display = 'block';
        applyFilters();
    });

    menuBudget.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuBudget);
        dashboardView.style.display = 'block'; // Show charts/KPIs
        filterPanel.style.display = 'block';
        tableSection.style.display = 'block';
        
        // Filter only projects with budgets > 0
        const searchInput = document.getElementById('search-input');
        searchInput.value = ''; // clear search
        applyFilters();
    });
}

function setActiveMenu(activeItem) {
    const items = document.querySelectorAll('.menu-item');
    items.forEach(item => item.classList.remove('active'));
    activeItem.classList.add('active');
}

// Fetch Data from Google Sheet
async function fetchData() {
    const syncButton = document.getElementById('btn-sync');
    const syncIcon = document.getElementById('sync-icon');
    const syncTimeText = document.getElementById('sync-time');
    
    // Add rotating animation
    syncIcon.classList.add('rotating');
    syncButton.disabled = true;

    try {
        const response = await fetchGoogleSheetJSONP();
        
        if (!response.table || !response.table.cols || !response.table.rows) {
            throw new Error('Google Sheet returned empty or invalid data structure.');
        }

        const headers = response.table.cols.map(col => col ? (col.label || '') : '');
        const rows = response.table.rows.map(row => {
            if (!row || !row.c) return headers.map(() => '');
            return response.table.cols.map((_, colIndex) => {
                const cell = row.c[colIndex];
                if (!cell) return '';
                // Use formatted value if available, otherwise raw value
                const val = cell.f !== null && cell.f !== undefined ? String(cell.f) : (cell.v !== null && cell.v !== undefined ? String(cell.v) : '');
                return val;
            });
        });

        const parsedRows = [headers, ...rows];
        
        if (parsedRows.length < 2) {
            throw new Error('Google Sheet has no project records.');
        }

        allHeaders = parsedRows[0];
        detectColumns(allHeaders);
        processProjects(parsedRows.slice(1));
        
        // Update connection status UI
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        statusDot.className = 'status-dot online';
        statusText.textContent = 'เชื่อมต่อ Google Sheet สำเร็จ';

        // Update Sync time
        const now = new Date();
        syncTimeText.textContent = now.toLocaleTimeString('th-TH') + ' น.';
        
        // Populate Filter dropdowns
        populateFilterDropdowns();
        
        // Apply filters & render
        applyFilters();

    } catch (error) {
        console.error('Error fetching sheet data:', error);
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'การเชื่อมต่อล้มเหลว';
        
        syncTimeText.textContent = 'ล้มเหลว';
        
        // Show error message in table
        const tbody = document.getElementById('projects-tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="table-message text-warning">
                    <i data-lucide="alert-triangle" style="width: 48px; height: 48px; margin: 0 auto 1rem; display: block;"></i>
                    <p>เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}</p>
                    <p style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--text-muted);">โปรดตรวจสอบว่า Google Sheet แชร์เป็นแบบ "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" แล้ว</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
    } finally {
        // Remove rotating animation
        syncIcon.classList.remove('rotating');
        syncButton.disabled = false;
    }
}


// Automatic Column Detection
function detectColumns(headers) {
    columnMapping = {
        id: -1,
        name: -1,
        budget: -1,
        budgetSpent: -1,
        status: -1,
        department: -1,
        owner: -1,
        strategy: -1,
        duration: -1,
        progress: -1
    };

    const rules = {
        id: /^(ลำดับ|ที่|no|id)$/i,
        name: /(โครงการ|ชื่อโครงการ|กิจกรรม|ชื่อกิจกรรม|งาน|รายการ)/i,
        budget: /(งบประมาณ|งบประมาณจัดสรร|งบจัดสรร|งบ|งบรวม|เงิน)/i,
        budgetSpent: /(งบประมาณใช้จริง|งบประมาณใช้ไป|ใช้จริง|ใช้ไป|จ่ายจริง)/i,
        status: /(สถานะ|การดำเนินงาน|ขั้นตอน|ความคืบหน้าการทำงาน|status)/i,
        department: /(กลุ่มงาน|ฝ่าย|ฝ่ายที่รับผิดชอบ|กลุ่มงานที่รับผิดชอบ|หน่วยงาน)/i,
        owner: /(ผู้รับผิดชอบโครงการ|ผู้รับผิดชอบ|ชื่อผู้รับผิดชอบ|เจ้าของ)/i,
        strategy: /(ยุทธศาสตร์|กลยุทธ์|มาตรฐาน|สนองมาตรฐาน)/i,
        duration: /(ระยะเวลา|ช่วงเวลา|วันเวลา|ไตรมาส|ระยะเวลาดำเนินงาน)/i,
        progress: /(ความก้าวหน้า|ความคืบหน้า|ร้อยละ|เปอร์เซ็นต์|%)/i
    };

    headers.forEach((header, index) => {
        for (const [field, regex] of Object.entries(rules)) {
            // If already matched, prefer earlier match except if it's a stronger match
            if (columnMapping[field] !== -1) {
                // If the current header is an exact match and previous wasn't, override
                if (regex.test(header) && header.trim().length < headers[columnMapping[field]].trim().length) {
                    columnMapping[field] = index;
                }
                continue;
            }
            if (regex.test(header)) {
                columnMapping[field] = index;
            }
        }
    });

    // Fallbacks if some crucial columns aren't matched
    if (columnMapping.name === -1 && headers.length > 1) {
        // Fallback name to the second column
        columnMapping.name = 1;
    }
    if (columnMapping.id === -1 && headers.length > 0) {
        columnMapping.id = 0;
    }

    console.log('Column Mapping Detected:', columnMapping);
}

// Process Rows Into Structured Objects
function processProjects(rows) {
    projectsData = rows.map((row, rowIndex) => {
        const getVal = (field) => {
            const index = columnMapping[field];
            return (index !== undefined && index !== -1 && row[index]) ? row[index].trim() : '';
        };

        // Parse numbers safely
        const parseNum = (str) => {
            if (!str) return 0;
            const cleaned = str.replace(/[^\d.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        };

        const rawBudget = getVal('budget');
        const rawBudgetSpent = getVal('budgetSpent');
        const rawProgress = getVal('progress');
        const rawStatus = getVal('status');

        let budget = parseNum(rawBudget);
        let budgetSpent = parseNum(rawBudgetSpent);
        let progress = parseNum(rawProgress);

        // Normalize status
        let status = 'pending';
        const statusStr = rawStatus.toLowerCase();
        
        if (statusStr.includes('เสร็จ') || statusStr.includes('เรียบร้อย') || statusStr.includes('สำเร็จ') || statusStr.includes('complete') || statusStr.includes('done') || progress === 100) {
            status = 'completed';
            progress = 100;
        } else if (statusStr.includes('ดำเนิน') || statusStr.includes('กำลัง') || statusStr.includes('progress') || statusStr.includes('ทำอยู่') || (progress > 0 && progress < 100)) {
            status = 'progress';
            if (progress === 0) progress = 50; // Fallback default progress if in-progress
        } else {
            status = 'pending';
            progress = 0;
        }

        // Gather all other columns as custom fields
        const customFields = [];
        allHeaders.forEach((header, index) => {
            // Skip mapped indexes
            const isMapped = Object.values(columnMapping).includes(index);
            if (!isMapped && row[index]) {
                customFields.push({
                    label: header,
                    value: row[index].trim()
                });
            }
        });

        return {
            originalIndex: rowIndex + 1,
            id: getVal('id') || (rowIndex + 1).toString(),
            name: getVal('name') || 'ไม่มีชื่อโครงการ',
            budget: budget,
            budgetSpent: budgetSpent,
            status: status,
            rawStatus: rawStatus || (status === 'completed' ? 'เสร็จสิ้น' : status === 'progress' ? 'อยู่ระหว่างดำเนินการ' : 'ยังไม่ได้เริ่ม'),
            department: getVal('department') || 'ไม่ระบุกลุ่มงาน',
            owner: getVal('owner') || 'ไม่ระบุผู้รับผิดชอบ',
            strategy: getVal('strategy') || 'ไม่ระบุยุทธศาสตร์',
            duration: getVal('duration') || 'ไม่ระบุระยะเวลา',
            progress: progress,
            customFields: customFields,
            rawRow: row // Preserve original row
        };
    });

    console.log('Processed Projects:', projectsData);
}

// Dropdown Menus Initialization
function populateFilterDropdowns() {
    const statusSelect = document.getElementById('filter-status');
    const deptSelect = document.getElementById('filter-department');
    const stratSelect = document.getElementById('filter-strategy');

    // Reset dropdowns keep the first option
    statusSelect.innerHTML = '<option value="all">ทุกสถานะการดำเนินงาน</option>';
    deptSelect.innerHTML = '<option value="all">ทุกกลุ่มงาน/ฝ่าย</option>';
    stratSelect.innerHTML = '<option value="all">ทุกแผนกลยุทธ์/ยุทธศาสตร์</option>';

    // Add statuses
    statusSelect.innerHTML += `
        <option value="completed">เสร็จสิ้นแล้ว</option>
        <option value="progress">อยู่ระหว่างดำเนินการ</option>
        <option value="pending">ยังไม่ได้เริ่ม</option>
    `;

    // Extract unique values
    const depts = [...new Set(projectsData.map(p => p.department))].filter(Boolean).sort();
    const strats = [...new Set(projectsData.map(p => p.strategy))].filter(Boolean).sort();

    depts.forEach(d => {
        deptSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });

    strats.forEach(s => {
        stratSelect.innerHTML += `<option value="${s}">${s}</option>`;
    });
}

// Filter and Search Operations
function applyFilters() {
    const searchVal = document.getElementById('search-input').value.toLowerCase();
    const statusVal = document.getElementById('filter-status').value;
    const deptVal = document.getElementById('filter-department').value;
    const stratVal = document.getElementById('filter-strategy').value;

    const activeMenu = document.querySelector('.sidebar-menu .menu-item.active').id;

    filteredData = projectsData.filter(project => {
        // Search filter
        const matchSearch = project.name.toLowerCase().includes(searchVal) || 
                            project.owner.toLowerCase().includes(searchVal) ||
                            project.department.toLowerCase().includes(searchVal);
        
        // Status filter
        const matchStatus = statusVal === 'all' || project.status === statusVal;
        
        // Department filter
        const matchDept = deptVal === 'all' || project.department === deptVal;

        // Strategy filter
        const matchStrat = stratVal === 'all' || project.strategy === stratVal;

        // Budget View filter (only show projects with allocated budgets)
        const matchBudgetView = activeMenu !== 'menu-budget' || project.budget > 0;

        return matchSearch && matchStatus && matchDept && matchStrat && matchBudgetView;
    });

    // Render components
    updateKPIs(filteredData);
    renderTable(filteredData);
    renderCharts(filteredData);
    
    // Update count labels
    document.getElementById('filtered-count').textContent = filteredData.length;
    document.getElementById('total-count').textContent = projectsData.length;
}

// Update Dashboard KPI Values
function updateKPIs(data) {
    const total = data.length;
    const completed = data.filter(p => p.status === 'completed').length;
    const progress = data.filter(p => p.status === 'progress').length;
    const pending = data.filter(p => p.status === 'pending').length;

    const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const progressPct = total > 0 ? Math.round((progress / total) * 100) : 0;
    const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;

    let totalBudget = 0;
    let totalSpent = 0;

    data.forEach(p => {
        totalBudget += p.budget;
        totalSpent += p.budgetSpent;
    });

    const spentPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // Set Text
    document.getElementById('kpi-total').textContent = total;
    document.getElementById('kpi-completed').textContent = completed;
    document.getElementById('kpi-completed-pct').textContent = `${completedPct}% ของทั้งหมด`;
    document.getElementById('kpi-progress').textContent = progress;
    document.getElementById('kpi-progress-pct').textContent = `${progressPct}% ของทั้งหมด`;
    document.getElementById('kpi-pending').textContent = pending;
    document.getElementById('kpi-pending-pct').textContent = `${pendingPct}% ของทั้งหมด`;

    // Format Currency (Thai Baht)
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val);
    };

    document.getElementById('kpi-budget-total').textContent = formatCurrency(totalBudget);
    document.getElementById('kpi-budget-spent').textContent = formatCurrency(totalSpent);
    document.getElementById('kpi-budget-spent-pct').textContent = `${spentPct}% ของงบประมาณรวม`;
}

// Render Project List Table
function renderTable(data) {
    const tbody = document.getElementById('projects-tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="table-message">
                    <p>ไม่พบรายการโครงการที่ค้นหา</p>
                </td>
            </tr>
        `;
        return;
    }

    data.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.addEventListener('click', () => openModal(p));

        const formatCurrency = (val) => {
            return val > 0 ? new Intl.NumberFormat('th-TH').format(val) + ' ฿' : '-';
        };

        // Status badge selection
        let statusBadgeClass = 'badge pending';
        let statusText = 'ยังไม่ได้เริ่ม';
        
        if (p.status === 'completed') {
            statusBadgeClass = 'badge completed';
            statusText = 'เสร็จสิ้น';
        } else if (p.status === 'progress') {
            statusBadgeClass = 'badge progress';
            statusText = 'อยู่ระหว่างทำ';
        }

        // Progress bar subclass based on status
        let barClass = '';
        if (p.status === 'completed') barClass = 'success';
        if (p.status === 'progress') barClass = 'warning';

        tr.innerHTML = `
            <td>${p.id}</td>
            <td>
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${p.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); max-width: 450px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.strategy}</div>
            </td>
            <td>
                <div style="font-weight: 500;">${p.department}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${p.owner}</div>
            </td>
            <td class="text-right font-semibold" style="font-family: var(--font-heading); font-size: 0.95rem;">${formatCurrency(p.budget)}</td>
            <td>
                <div class="table-progress-cell">
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill ${barClass}" style="width: ${p.progress}%;"></div>
                    </div>
                    <span class="progress-label">${p.progress}%</span>
                </div>
            </td>
            <td>
                <span class="${statusBadgeClass}">${statusText}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Render Charts
function renderCharts(data) {
    const isDark = document.body.getAttribute('data-theme') !== 'light';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#9ca3af' : '#475569';

    // 1. Status Chart (Doughnut)
    const completed = data.filter(p => p.status === 'completed').length;
    const progress = data.filter(p => p.status === 'progress').length;
    const pending = data.filter(p => p.status === 'pending').length;

    const statusCtx = document.getElementById('statusChart').getContext('2d');
    
    if (statusChart) {
        statusChart.destroy();
    }

    // Don't render chart if no data to prevent errors
    if (data.length > 0) {
        statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['เสร็จสิ้นแล้ว', 'อยู่ระหว่างดำเนินการ', 'ยังไม่ได้เริ่ม'],
                datasets: [{
                    data: [completed, progress, pending],
                    backgroundColor: [COLORS.completed, COLORS.progress, COLORS.pending],
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#111827' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            font: { family: 'Sarabun', size: 12 }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    // 2. Budget Chart by Department (Bar)
    // Gather budget data group by department
    const deptBudgets = {};
    data.forEach(p => {
        if (!deptBudgets[p.department]) {
            deptBudgets[p.department] = { allocated: 0, spent: 0 };
        }
        deptBudgets[p.department].allocated += p.budget;
        deptBudgets[p.department].spent += p.budgetSpent;
    });

    // Extract sorted labels and datasets (filter out depts with 0 budget)
    const deptLabels = Object.keys(deptBudgets).filter(d => deptBudgets[d].allocated > 0).sort();
    const allocatedData = deptLabels.map(d => deptBudgets[d].allocated);
    const spentData = deptLabels.map(d => deptBudgets[d].spent);

    const budgetCtx = document.getElementById('budgetChart').getContext('2d');
    
    if (budgetChart) {
        budgetChart.destroy();
    }

    if (deptLabels.length > 0) {
        budgetChart = new Chart(budgetCtx, {
            type: 'bar',
            data: {
                labels: deptLabels,
                datasets: [
                    {
                        label: 'งบประมาณที่จัดสรร',
                        data: allocatedData,
                        backgroundColor: COLORS.primary,
                        borderRadius: 6
                    },
                    {
                        label: 'งบประมาณที่ใช้จริง',
                        data: spentData,
                        backgroundColor: COLORS.info,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Horizontal bars
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            font: { family: 'Sarabun', size: 10 }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: textColor,
                            font: { family: 'Sarabun', size: 11 }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            font: { family: 'Sarabun', size: 12 }
                        }
                    }
                }
            }
        });
    } else {
        // Render a placeholder empty text if no budget projects
        const canvas = document.getElementById('budgetChart');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = textColor;
        ctx.font = '14px Sarabun';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ไม่มีข้อมูลโครงการที่มีงบประมาณจัดสรรในขณะนี้', canvas.width / 2, canvas.height / 2);
    }
}

// Modal Control Operations
function openModal(project) {
    const modal = document.getElementById('project-modal');
    
    // Set text elements
    document.getElementById('modal-title').textContent = project.name;
    document.getElementById('modal-strategy').textContent = project.strategy;
    document.getElementById('modal-department').textContent = project.department;
    document.getElementById('modal-owner').textContent = project.owner;
    document.getElementById('modal-duration').textContent = project.duration;

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val);
    };

    document.getElementById('modal-budget').textContent = formatCurrency(project.budget);
    document.getElementById('modal-budget-spent').textContent = formatCurrency(project.budgetSpent);
    
    // Set progress bar
    const bar = document.getElementById('modal-progress-bar');
    bar.style.width = `${project.progress}%`;
    document.getElementById('modal-progress-pct').textContent = `${project.progress}%`;

    // Status classes
    const statusBadge = document.getElementById('modal-status-badge');
    statusBadge.textContent = project.rawStatus;
    statusBadge.className = 'modal-badge';
    
    if (project.status === 'completed') {
        statusBadge.classList.add('bg-success-light');
        bar.className = 'progress-bar-fill success';
    } else if (project.status === 'progress') {
        statusBadge.classList.add('bg-warning-light');
        bar.className = 'progress-bar-fill warning';
    } else {
        statusBadge.classList.add('bg-muted');
        bar.className = 'progress-bar-fill';
    }

    // Populate custom fields grid
    const customFieldsGrid = document.getElementById('modal-custom-fields');
    customFieldsGrid.innerHTML = '';

    if (project.customFields.length === 0) {
        customFieldsGrid.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">ไม่มีข้อมูลเพิ่มเติม</p>';
    } else {
        project.customFields.forEach(field => {
            const fieldBox = document.createElement('div');
            fieldBox.className = 'custom-field-box';
            fieldBox.innerHTML = `
                <div class="custom-field-label">${field.label}</div>
                <div class="custom-field-value">${field.value}</div>
            `;
            customFieldsGrid.appendChild(fieldBox);
        });
    }

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock body scroll
}

function closeModal() {
    const modal = document.getElementById('project-modal');
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Unlock body scroll
}
