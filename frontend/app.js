import CONFIG from './config.js';
import * as db from './db.js';

// Application State
let currentUser = null;
let currentTab = 'leaderboard';
let activePredictStage = 'Vòng bảng';
let allMatches = [];
let allPlayers = [];
let myPredictions = [];
let myChampionPrediction = null;
let allChampionPredictions = [];
let isPasswordChangeForced = false;

// DOM Elements
const views = {
    login: document.getElementById('view-login'),
    leaderboard: document.getElementById('view-leaderboard'),
    predict: document.getElementById('view-predict'),
    matrix: document.getElementById('view-matrix'),
    config: document.getElementById('view-config'),
    admin: document.getElementById('view-admin')
};

// Main Initialization
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initConfigForm();
    
    // Register PWA service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('PWA Service Worker Registered'))
            .catch(err => console.error('PWA Service Worker Registration Failed', err));
    }
    
    // Demo Mode Button handler
    const demoBtn = document.getElementById('btn-demo-mode');
    if (demoBtn) {
        demoBtn.addEventListener('click', async () => {
            db.setDemoMode(true);
            currentUser = { id: "p1", name: "Hoàng Hữu Thắng", email: "player1@wc2026.com", role: "admin" };
            window.sessionStorage.setItem('WC_CURRENT_USER', JSON.stringify(currentUser));
            setupUserSession();
            await loadAppData();
            switchView('leaderboard');
        });
    }
    
    if (!CONFIG.isConfigured()) {
        showWarning(true);
        db.setDemoMode(true); // Default to demo mode for initial loading
        await initLoginDropdown();
        switchView('login');
    } else {
        showWarning(false);
        db.setDemoMode(false);
        // Check if session exists
        const savedUser = window.sessionStorage.getItem('WC_CURRENT_USER');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            setupUserSession();
            await loadAppData();
            switchView('leaderboard');
        } else {
            await initLoginDropdown();
            switchView('login');
        }
    }
    
    initLoginForm();
    initAdminPanel();
    initModal();
    initPasswordChangeModal();
});

// Setup navigation event listeners
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn, .mobile-nav-item');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.getAttribute('data-target');
            
            // If password change is forced, block navigation completely
            if (isPasswordChangeForced) {
                e.preventDefault();
                return;
            }
            
            // If not logged in and not config, prevent switching
            if (!currentUser && target !== 'config' && target !== 'login') {
                return;
            }
            
            switchView(target);
        });
    });
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        window.sessionStorage.removeItem('WC_CURRENT_USER');
        currentUser = null;
        isPasswordChangeForced = false;
        setupUserSession();
        switchView('login');
        initLoginDropdown();
    });
    
    document.getElementById('prompt-config-link').addEventListener('click', () => {
        switchView('config');
    });
}

// Show/Hide configuration warning
function showWarning(show) {
    const warning = document.getElementById('config-warning');
    if (warning) {
        warning.style.display = show ? 'block' : 'none';
    }
}

// Switch Active View
function switchView(tabId) {
    currentTab = tabId;
    
    // Update active classes on views
    Object.keys(views).forEach(key => {
        if (key === tabId) {
            views[key].classList.add('active');
        } else {
            views[key].classList.remove('active');
        }
    });
    
    // Update active classes on nav buttons
    const navButtons = document.querySelectorAll('.nav-btn, .mobile-nav-item');
    navButtons.forEach(btn => {
        if (btn.getAttribute('data-target') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Trigger data loads based on tab
    if (currentUser) {
        if (tabId === 'leaderboard') renderLeaderboard();
        if (tabId === 'predict') renderPredict();
        if (tabId === 'matrix') renderMatrix();
        if (tabId === 'admin' && currentUser.role === 'admin') {
            renderAdminMatches();
            renderAdminChampionSelect();
        }
    }
}

// Config page initialization
function initConfigForm() {
    const form = document.getElementById('config-form');
    const urlInput = document.getElementById('config-url');
    const keyInput = document.getElementById('config-key');
    const clearBtn = document.getElementById('config-clear-btn');
    const successMsg = document.getElementById('config-success-msg');
    
    if (CONFIG.isConfigured()) {
        urlInput.value = CONFIG.SUPABASE_URL;
        keyInput.value = CONFIG.SUPABASE_KEY;
    }
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        CONFIG.saveCredentials(urlInput.value, keyInput.value);
        db.resetSupabase();
        
        successMsg.style.display = 'block';
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    });
    
    clearBtn.addEventListener('click', () => {
        CONFIG.clearCredentials();
        db.resetSupabase();
        urlInput.value = '';
        keyInput.value = '';
        window.location.reload();
    });
}

// Populates user dropdown on login screen
async function initLoginDropdown() {
    const select = document.getElementById('login-user-select');
    const submitBtn = document.getElementById('login-submit-btn');
    
    if (!CONFIG.isConfigured() && !db.isDemoMode()) {
        select.innerHTML = '<option value="">-- Chọn tên người chơi (Cần cấu hình Supabase) --</option>';
        submitBtn.disabled = true;
        return;
    }
    
    // Clear list
    select.innerHTML = '<option value="">-- Chọn tên người chơi --</option>';
    
    const players = await db.fetchPlayers();
    allPlayers = players;
    
    if (players.length > 0) {
        players.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.email;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
        submitBtn.disabled = false;
    } else {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = "Không tìm thấy người chơi nào. Lỗi DB.";
        select.appendChild(opt);
        submitBtn.disabled = true;
    }
}

// Setup user details when logged in
function setupUserSession() {
    const userBar = document.getElementById('user-bar');
    const nameEl = document.getElementById('logged-in-name');
    const roleEl = document.getElementById('logged-in-role');
    const adminBtn = document.getElementById('nav-admin-btn');
    const mobileAdminBtn = document.getElementById('mobile-nav-admin-btn');
    
    if (currentUser) {
        userBar.style.display = 'flex';
        nameEl.textContent = currentUser.name;
        roleEl.textContent = currentUser.role === 'admin' ? 'Quản trị viên' : 'Người chơi';
        roleEl.className = `role-badge ${currentUser.role}`;
        
        if (currentUser.role === 'admin') {
            adminBtn.style.display = 'inline-block';
            if (mobileAdminBtn) mobileAdminBtn.style.display = 'flex';
        } else {
            adminBtn.style.display = 'none';
            if (mobileAdminBtn) mobileAdminBtn.style.display = 'none';
        }
    } else {
        userBar.style.display = 'none';
        adminBtn.style.display = 'none';
        if (mobileAdminBtn) mobileAdminBtn.style.display = 'none';
    }
}

// Initialize Login Form Actions
function initLoginForm() {
    const form = document.getElementById('login-form');
    const emailSelect = document.getElementById('login-user-select');
    const passwordInput = document.getElementById('login-password');
    const errorEl = document.getElementById('login-error-msg');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.style.display = 'none';
        
        const email = emailSelect.value;
        const password = passwordInput.value;
        
        if (!email || !password) return;
        
        const res = await db.verifyPlayerLogin(email, password);
        if (res.success) {
            currentUser = res.player;
            passwordInput.value = '';
            
            if (res.isDefaultPassword) {
                // Force password change first before completing login session
                openPasswordChangeModal(true);
            } else {
                // Normal login flow
                window.sessionStorage.setItem('WC_CURRENT_USER', JSON.stringify(currentUser));
                setupUserSession();
                await loadAppData();
                switchView('leaderboard');
            }
        } else {
            errorEl.textContent = res.error || 'Đăng nhập thất bại!';
            errorEl.style.display = 'block';
        }
    });
}

// Load static & dynamic database data
async function loadAppData() {
    allMatches = await db.fetchMatches();
    allPlayers = await db.fetchPlayers();
    if (currentUser) {
        myPredictions = await db.fetchPlayerPredictions(currentUser.id);
        myChampionPrediction = await db.fetchChampionPrediction(currentUser.id);
        allChampionPredictions = await db.fetchAllChampionPredictions();
    }
}

// Format date helper
function formatDate(isoString) {
    const date = new Date(isoString);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const t = String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    return {
        dateStr: `${d}/${m}`,
        timeStr: t
    };
}

// RENDER LEADERBOARD VIEW
async function renderLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    const foot = document.getElementById('leaderboard-foot');
    body.innerHTML = '<tr><td colspan="6" style="text-align: center;">Đang tải bảng xếp hạng...</td></tr>';
    if (foot) foot.innerHTML = '';
    
    const board = await db.fetchLeaderboard();
    body.innerHTML = '';
    
    if (board.length === 0) {
        body.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Không có dữ liệu xếp hạng.</td></tr>';
        return;
    }
    
    let totalGroup = 0;
    let totalKnockout = 0;
    
    board.forEach((row, idx) => {
        const tr = document.createElement('tr');
        
        // Highlight logged in player row
        if (currentUser && row.player_id === currentUser.id) {
            tr.style.background = 'rgba(234, 179, 8, 0.05)';
            tr.style.borderColor = 'rgba(234, 179, 8, 0.15)';
        }
        
        totalGroup += parseFloat(row.group_points || 0);
        totalKnockout += parseFloat(row.knockout_points || 0);
        
        tr.innerHTML = `
            <td class="rank-col">${idx + 1}</td>
            <td class="name-col">${row.player_name}</td>
            <td style="text-align: center;">${row.matches_predicted}</td>
            <td style="text-align: center; color: var(--accent-gold); font-weight: bold;">${row.exact_matches}</td>
            <td style="text-align: center; ${row.group_points < 0 ? 'color: var(--accent-red);' : ''}">${row.group_points}</td>
            <td style="text-align: right; ${row.knockout_points < 0 ? 'color: var(--accent-red);' : ''}">${row.knockout_points}</td>
        `;
        body.appendChild(tr);
    });
    
    if (foot) {
        foot.innerHTML = `
            <tr>
                <td></td>
                <td style="color: var(--accent-gold);">Tổng cộng (${board.length} người chơi)</td>
                <td></td>
                <td></td>
                <td style="text-align: center; ${totalGroup < 0 ? 'color: var(--accent-red);' : 'color: var(--accent-green);'}">${Math.round(totalGroup * 10) / 10}</td>
                <td style="text-align: right; ${totalKnockout < 0 ? 'color: var(--accent-red);' : 'color: var(--accent-green);'}">${Math.round(totalKnockout * 10) / 10}</td>
            </tr>
        `;
    }
}

// RENDER PREDICT (MATCHES LIST) VIEW
function renderPredict() {
    const container = document.getElementById('matches-container');
    const stageNav = document.querySelector('.stage-navigation');
    
    // 1. Render filter tabs
    const stages = ['Vòng bảng', 'Vòng 1/16', 'Vòng 1/8', 'Tứ kết', 'Bán kết', 'Tranh hạng 3', 'Chung kết'];
    stageNav.innerHTML = '';
    stages.forEach(st => {
        const btn = document.createElement('button');
        btn.className = `nav-btn ${activePredictStage === st ? 'active' : ''}`;
        btn.textContent = st;
        btn.addEventListener('click', () => {
            activePredictStage = st;
            renderPredict();
        });
        stageNav.appendChild(btn);
    });
    
    // 1b. Update Rule Banner based on the active stage
    const ruleBanner = document.getElementById('stage-rule-banner');
    if (ruleBanner) {
        let ruleHtml = '';
        if (activePredictStage === 'Vòng bảng') {
            ruleHtml = `
                <span class="rule-title">💡 Luật Vòng bảng:</span>
                <span class="rule-badge green">Đúng tỉ số: <strong>Thưởng 40% Quỹ</strong></span>
                <span class="rule-badge red">Sai xu thế: <strong>-5đ</strong></span>
                <span class="rule-badge red">Sai tỉ số: <strong>-2đ/bàn chênh</strong></span>
                <span class="rule-badge red">Không dự đoán: <strong>-15đ</strong></span>
            `;
        } else if (activePredictStage === 'Vòng 1/16') {
            ruleHtml = `
                <span class="rule-title">💡 Luật Vòng 1/16 (R32):</span>
                <span class="rule-badge green">Đúng tỉ số: <strong>Thưởng 40% Quỹ</strong></span>
                <span class="rule-badge red">Sai xu thế: <strong>-10đ</strong></span>
                <span class="rule-badge red">Sai tỉ số: <strong>-4đ/bàn chênh</strong></span>
                <span class="rule-badge red">Không dự đoán: <strong>-20đ</strong></span>
                <span class="rule-note">⚠️ Chỉ tính 2 hiệp chính</span>
            `;
        } else if (activePredictStage === 'Vòng 1/8') {
            ruleHtml = `
                <span class="rule-title">💡 Luật Vòng 1/8 (R16):</span>
                <span class="rule-badge green">Đúng tỉ số: <strong>Thưởng 40% Quỹ</strong></span>
                <span class="rule-badge red">Sai xu thế: <strong>-12đ</strong></span>
                <span class="rule-badge red">Sai tỉ số: <strong>-5đ/bàn chênh</strong></span>
                <span class="rule-badge red">Không dự đoán: <strong>-25đ</strong></span>
                <span class="rule-note">⚠️ Chỉ tính 2 hiệp chính</span>
            `;
        } else if (activePredictStage === 'Tứ kết') {
            ruleHtml = `
                <span class="rule-title">💡 Luật Tứ kết:</span>
                <span class="rule-badge green">Đúng tỉ số: <strong>Thưởng 40% Quỹ</strong></span>
                <span class="rule-badge red">Sai xu thế: <strong>-15đ</strong></span>
                <span class="rule-badge red">Sai tỉ số: <strong>-6đ/bàn chênh</strong></span>
                <span class="rule-badge red">Không dự đoán: <strong>-30đ</strong></span>
                <span class="rule-note">⚠️ Chỉ tính 2 hiệp chính</span>
            `;
        } else if (activePredictStage === 'Bán kết') {
            ruleHtml = `
                <span class="rule-title">💡 Luật Bán kết:</span>
                <span class="rule-badge green">Đúng tỉ số: <strong>Thưởng 40% Quỹ</strong></span>
                <span class="rule-badge red">Sai xu thế: <strong>-20đ</strong></span>
                <span class="rule-badge red">Sai tỉ số: <strong>-8đ/bàn chênh</strong></span>
                <span class="rule-badge red">Không dự đoán: <strong>-50đ</strong></span>
                <span class="rule-note">⚠️ Chỉ tính 2 hiệp chính</span>
            `;
        } else if (activePredictStage === 'Tranh hạng 3') {
            ruleHtml = `
                <span class="rule-title">💡 Luật Tranh hạng 3:</span>
                <span class="rule-badge green">Đúng tỉ số: <strong>Thưởng 40% Quỹ</strong></span>
                <span class="rule-badge red">Sai xu thế: <strong>-30đ</strong></span>
                <span class="rule-badge red">Sai tỉ số: <strong>-12đ/bàn chênh</strong></span>
                <span class="rule-badge red">Không dự đoán: <strong>-70đ</strong></span>
                <span class="rule-note">⚠️ Chỉ tính 2 hiệp chính</span>
            `;
        } else if (activePredictStage === 'Chung kết') {
            ruleHtml = `
                <span class="rule-title">💡 Luật Chung kết:</span>
                <span class="rule-badge green">Đúng tỉ số: <strong>Thưởng 40% Quỹ</strong></span>
                <span class="rule-badge red">Sai xu thế: <strong>-30đ</strong></span>
                <span class="rule-badge red">Sai tỉ số: <strong>-12đ/bàn chênh</strong></span>
                <span class="rule-badge red">Không dự đoán: <strong>-70đ</strong></span>
                <span class="rule-note">⚠️ Chỉ tính 2 hiệp chính</span>
            `;
        }
        ruleBanner.innerHTML = ruleHtml;
        ruleBanner.style.display = 'flex';
    }
    
    // 2. Filter matches
    const filteredMatches = allMatches.filter(m => m.stage === activePredictStage);
    container.innerHTML = '';
    
    // Add Champion Prediction Card at the top of Vòng 1/16 tab
    if (activePredictStage === 'Vòng 1/16') {
        const r32Matches = allMatches.filter(m => m.stage === 'Vòng 1/16');
        const r32Teams = [];
        r32Matches.forEach(m => {
            if (m.team_a && !r32Teams.includes(m.team_a)) r32Teams.push(m.team_a);
            if (m.team_b && !r32Teams.includes(m.team_b)) r32Teams.push(m.team_b);
        });
        r32Teams.sort((a, b) => a.localeCompare(b, 'vi'));
        
        const match73 = allMatches.find(m => m.id === 73);
        let isChampLocked = false;
        let lockTimeStr = '';
        if (match73) {
            const kickoffTime = new Date(match73.kickoff);
            const lockTime = new Date(kickoffTime.getTime() - 15 * 60 * 1000);
            isChampLocked = new Date() > lockTime;
            const timeFmt = formatDate(match73.kickoff);
            lockTimeStr = `${timeFmt.timeStr} ngày ${timeFmt.dateStr}`;
        }
        
        const myChamp = myChampionPrediction ? myChampionPrediction.predicted_team : '';
        let champWinnerStr = '';
        if (db.isDemoMode()) {
            champWinnerStr = localStorage.getItem('WC_MOCK_CHAMPION_WINNER') || '';
        } else {
            const correctChamp = allChampionPredictions.find(c => parseFloat(c.points) > 0);
            if (correctChamp) champWinnerStr = correctChamp.predicted_team;
        }
        
        let pointsResult = '';
        if (myChampionPrediction && myChampionPrediction.predicted_team) {
            const pts = parseFloat(myChampionPrediction.points);
            if (pts > 0) {
                pointsResult = `<span class="points-result win" style="margin-left: 8px;">+${pts} điểm (Trúng)</span>`;
            } else if (pts === -50 && champWinnerStr) {
                pointsResult = `<span class="points-result loss" style="margin-left: 8px;">-50 điểm (Sai)</span>`;
            } else if (myChamp) {
                pointsResult = `<span class="points-result loss" style="margin-left: 8px; background: rgba(234,179,8,0.1); color: var(--accent-gold); border-color: rgba(234,179,8,0.2);">-50 điểm (Đã cược)</span>`;
            }
        }
        
        const champCard = document.createElement('div');
        if (!isChampLocked) {
            let selectOptions = `<option value="">-- Chọn đội vô địch --</option>`;
            r32Teams.forEach(t => {
                selectOptions += `<option value="${t}" ${t === myChamp ? 'selected' : ''}>${t}</option>`;
            });
            
            champCard.innerHTML = `
                <div class="glass-card" style="margin-bottom: 24px; border: 1px solid rgba(234, 179, 8, 0.2); background: linear-gradient(135deg, rgba(234, 179, 8, 0.05) 0%, rgba(9, 13, 22, 0.5) 100%);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                        <div>
                            <h3 style="color: var(--accent-gold); font-family: var(--font-heading); display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                🏆 DỰ ĐOÁN ĐỘI VÔ ĐỊCH (BET 50 ĐIỂM)
                            </h3>
                            <p style="font-size: 0.85rem; color: var(--text-secondary);">
                                Khóa dự đoán vào lúc: <strong style="color: var(--accent-red);">${lockTimeStr}</strong> (15 phút trước vòng 1/16).
                            </p>
                        </div>
                        <div style="font-size: 0.85rem; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08);">
                            Cược: <strong style="color: var(--accent-gold);">50 điểm</strong> | Thưởng: <strong>50% tổng quỹ cược chia đều</strong>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                        <select id="champ-predict-select" style="max-width: 280px; height: 38px; background: rgba(9, 13, 22, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: var(--text-primary); padding: 0 10px;">
                            ${selectOptions}
                        </select>
                        <button class="submit-btn" id="btn-save-champion" style="max-width: 120px; height: 38px; margin-top: 0; padding: 0 16px;">Lưu cược</button>
                        ${pointsResult}
                    </div>
                </div>
            `;
        } else {
            champCard.innerHTML = `
                <div class="glass-card" style="margin-bottom: 24px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255,255,255,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                        <div>
                            <h3 style="color: var(--text-secondary); font-family: var(--font-heading); display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 1rem;">
                                🔒 DỰ ĐOÁN ĐỘI VÔ ĐỊCH (ĐÃ KHÓA)
                            </h3>
                            <div style="font-size: 1.1rem; font-weight: bold; display: flex; align-items: center; flex-wrap: wrap;">
                                Lựa chọn của bạn: <span style="color: var(--accent-gold); margin-left: 8px;">${myChamp || 'Không cược'}</span>
                                ${pointsResult}
                            </div>
                        </div>
                        <div>
                            <button class="btn-view-predictions" id="btn-view-all-champions" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); padding: 8px 16px; border-radius: 6px; font-size: 0.85rem; cursor: pointer;">👥 Xem cược của mọi người</button>
                        </div>
                    </div>
                </div>
            `;
        }
        container.appendChild(champCard);
        
        // Add save action
        const saveChampBtn = champCard.querySelector('#btn-save-champion');
        if (saveChampBtn) {
            saveChampBtn.addEventListener('click', async () => {
                const team = document.getElementById('champ-predict-select').value;
                if (!team) {
                    alert('Vui lòng chọn đội tuyển bạn muốn đặt cược vô địch!');
                    return;
                }
                saveChampBtn.disabled = true;
                saveChampBtn.textContent = '...';
                const res = await db.submitChampionPrediction(currentUser.id, team);
                if (res.success) {
                    myChampionPrediction = { player_id: currentUser.id, predicted_team: team, points: -50 };
                    saveChampBtn.style.borderColor = 'var(--accent-green)';
                    saveChampBtn.style.color = 'var(--accent-green)';
                    saveChampBtn.textContent = 'Đã lưu';
                    setTimeout(() => {
                        saveChampBtn.disabled = false;
                        saveChampBtn.style.borderColor = '';
                        saveChampBtn.style.color = '';
                        saveChampBtn.textContent = 'Lưu cược';
                        renderPredict();
                    }, 1000);
                } else {
                    alert('Lỗi lưu cược: ' + res.error);
                    saveChampBtn.disabled = false;
                    saveChampBtn.textContent = 'Lưu cược';
                }
            });
        }
        
        // Add view all champions action
        const viewAllChampsBtn = champCard.querySelector('#btn-view-all-champions');
        if (viewAllChampsBtn) {
            viewAllChampsBtn.addEventListener('click', () => {
                openChampionPredictionsModal();
            });
        }
    }

    if (filteredMatches.length === 0) {
        container.innerHTML = '<div class="glass-card" style="text-align: center; color: var(--text-muted);">Không tìm thấy trận đấu nào ở vòng này.</div>';
        return;
    }
    
    const grid = document.createElement('div');
    grid.className = 'matches-grid';
    
    filteredMatches.forEach(m => {
        const myPred = myPredictions.find(p => p.match_id === m.id);
        const hasPred = myPred !== undefined;
        
        // Calculate kickoff times and lock state
        const kickoffTime = new Date(m.kickoff);
        const now = new Date();
        const lockTime = new Date(kickoffTime.getTime() - 15 * 60 * 1000); // 15 mins lock
        const isLocked = now > lockTime || m.status === 'FT' || m.status === 'LIVE';
        
        const timeFmt = formatDate(m.kickoff);
        
        const card = document.createElement('div');
        card.className = 'glass-card match-card';
        
        // Score display string
        let scoreDisplay = '<span class="score">-</span>';
        if (m.status === 'FT' || m.status === 'LIVE') {
            scoreDisplay = `<span class="score">${m.score_a} - ${m.score_b}</span>`;
        } else {
            scoreDisplay = `<span class="time">${timeFmt.timeStr}</span><span class="time">${timeFmt.dateStr}</span>`;
        }
        
        // Show "View other predictions" button for all matches at all times
        let viewOthersBtn = `<button class="btn-view-predictions" data-match-id="${m.id}" data-match-title="${m.team_a} vs ${m.team_b}">👥 Xem dự đoán của mọi người</button>`;
        
        // Render prediction form/details
        let predictionContent = '';
        
        if (isLocked) {
            // MATCH LOCKED
            if (hasPred && myPred.predict_a !== null) {
                // Show my prediction result
                let pointsResult = '';
                if (m.status === 'FT') {
                    const pts = parseFloat(myPred.points);
                    pointsResult = `<span class="points-result ${pts >= 0 ? 'win' : 'loss'}">${pts >= 0 ? '+' : ''}${pts} điểm</span>`;
                }
                
                predictionContent = `
                    <div class="prediction-box">
                        <span style="font-size: 0.85rem; color: var(--text-secondary);">Bạn đoán:</span>
                        <span style="font-family: var(--font-heading); font-weight: bold; font-size: 1.1rem;">
                            ${myPred.predict_a} - ${myPred.predict_b}
                        </span>
                        ${pointsResult}
                    </div>
                `;
            } else {
                predictionContent = `
                    <div class="prediction-box" style="border-color: var(--accent-red); background: rgba(239, 68, 68, 0.05);">
                        <span style="font-size: 0.85rem; color: var(--accent-red);">Bạn không nộp dự đoán!</span>
                        ${m.status === 'FT' ? `<span class="points-result loss">${myPred ? myPred.points : 'Chưa tính'} điểm</span>` : ''}
                    </div>
                `;
            }
        } else {
            // MATCH EDITABLE
            const valA = hasPred && myPred.predict_a !== null ? myPred.predict_a : '';
            const valB = hasPred && myPred.predict_b !== null ? myPred.predict_b : '';
            
            predictionContent = `
                <div class="prediction-box">
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">Dự đoán:</span>
                    <div class="prediction-inputs">
                        <input type="number" min="0" class="pred-input" id="pred-${m.id}-a" value="${valA}" placeholder="A">
                        <span style="color: var(--text-muted); font-weight: bold;">-</span>
                        <input type="number" min="0" class="pred-input" id="pred-${m.id}-b" value="${valB}" placeholder="B">
                    </div>
                    <button class="btn-save-pred" data-match-id="${m.id}">Lưu</button>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div>
                <div class="match-header">
                    <span>Trận ${m.id} ${m.group_name ? `• Bảng ${m.group_name}` : ''}</span>
                    <div class="badge-group">
                        ${m.status === 'LIVE' ? '<span class="live-indicator">LIVE</span>' : ''}
                        Hệ số <span class="multiplier">${m.multiplier}</span>
                    </div>
                </div>
                <div class="match-body">
                    <div class="team-box">
                        <span class="team-name">${m.team_a}</span>
                    </div>
                    <div class="vs-box">
                        ${scoreDisplay}
                    </div>
                    <div class="team-box">
                        <span class="team-name">${m.team_b}</span>
                    </div>
                </div>
            </div>
            <div>
                ${predictionContent}
                ${viewOthersBtn}
            </div>
        `;
        grid.appendChild(card);
    });
    
    container.appendChild(grid);
    
    // Add Save listeners
    const saveButtons = container.querySelectorAll('.btn-save-pred');
    saveButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const mId = btn.getAttribute('data-match-id');
            const valA = document.getElementById(`pred-${mId}-a`).value;
            const valB = document.getElementById(`pred-${mId}-b`).value;
            
            if (valA === '' || valB === '') {
                alert('Vui lòng nhập đầy đủ tỷ số dự đoán cả hai đội!');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = '...';
            
            const res = await db.submitPrediction(currentUser.id, parseInt(mId), parseInt(valA), parseInt(valB));
            if (res.success) {
                // Update local predictions
                const myPredIdx = myPredictions.findIndex(p => p.match_id === parseInt(mId));
                const newPred = { player_id: currentUser.id, match_id: parseInt(mId), predict_a: parseInt(valA), predict_b: parseInt(valB), points: 0 };
                if (myPredIdx > -1) {
                    myPredictions[myPredIdx] = newPred;
                } else {
                    myPredictions.push(newPred);
                }
                
                btn.style.borderColor = 'var(--accent-green)';
                btn.style.color = 'var(--accent-green)';
                btn.textContent = 'Đã lưu';
                setTimeout(() => {
                    btn.disabled = false;
                    btn.style.borderColor = '';
                    btn.style.color = '';
                    btn.textContent = 'Lưu';
                }, 1000);
            } else {
                alert('Lỗi nộp dự đoán: ' + res.error);
                btn.disabled = false;
                btn.textContent = 'Lưu';
            }
        });
    });
    
    // Add View Others listeners
    const viewButtons = container.querySelectorAll('.btn-view-predictions');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mId = btn.getAttribute('data-match-id');
            const mTitle = btn.getAttribute('data-match-title');
            openPredictionsModal(parseInt(mId), mTitle);
        });
    });
}

// RENDER MATRIX VIEW (Detailed spreadsheet grid)
async function renderMatrix() {
    const table = document.getElementById('matrix-table');
    table.innerHTML = '<tr><td style="color: var(--text-muted); text-align: center; padding: 20px;">Đang tải ma trận dự đoán...</td></tr>';
    
    const allPredictions = await db.fetchAllPredictions();
    
    table.innerHTML = '';
    
    // Sort players alphabetically to match columns consistently
    const playersList = [...allPlayers].sort((a, b) => a.name.localeCompare(b.name));
    
    // Create Header Row
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th class="sticky-col">Trận đấu</th><th>Tỉ số thực</th>';
    playersList.forEach(p => {
        const th = document.createElement('th');
        th.textContent = p.name;
        // Highlight own column header
        if (currentUser && p.id === currentUser.id) {
            th.style.color = 'var(--accent-gold)';
        }
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    // Create rows for each match
    allMatches.forEach(m => {
        const tr = document.createElement('tr');
        
        // Kickoff times/lock state
        const kickoffTime = new Date(m.kickoff);
        const now = new Date();
        const isLocked = now > new Date(kickoffTime.getTime() - 15 * 60 * 1000) || m.status === 'FT' || m.status === 'LIVE';
        
        let scoreA = m.score_a !== null ? m.score_a : '-';
        let scoreB = m.score_b !== null ? m.score_b : '-';
        let actScoreStr = m.status === 'FT' || m.status === 'LIVE' ? `${scoreA}-${scoreB}` : 'Chưa đá';
        
        const trHtml = [
            `<td class="sticky-col">Trận ${m.id}: ${m.team_a} - ${m.team_b}</td>`,
            `<td><strong style="color: var(--accent-gold); font-size: 0.95rem;">${actScoreStr}</strong></td>`
        ];
        
        playersList.forEach(p => {
            // Find prediction
            const pred = allPredictions.find(pr => pr.player_id === p.id && pr.match_id === m.id);
            
            let cellContent = '';
            // Display prediction of all players immediately (public at all times)
            if (pred && pred.predict_a !== null && pred.predict_a !== undefined) {
                let ptsDisplay = '';
                if (m.status === 'FT') {
                    const pts = parseFloat(pred.points);
                    ptsDisplay = `<div class="matrix-cell-pts ${pts >= 0 ? 'win' : 'loss'}">${pts >= 0 ? '+' : ''}${pts}đ</div>`;
                }
                
                // Highlight own prediction in light blue
                let scoreStyle = '';
                if (currentUser && p.id === currentUser.id) {
                    scoreStyle = 'style="color: var(--accent-blue); font-weight: bold;"';
                }
                
                cellContent = `
                    <div class="matrix-cell-score" ${scoreStyle}>${pred.predict_a}-${pred.predict_b}</div>
                    ${ptsDisplay}
                `;
            } else {
                let ptsDisplay = '';
                if (m.status === 'FT') {
                    const pts = parseFloat(pred ? pred.points : 0);
                    ptsDisplay = `<div class="matrix-cell-pts loss">${pts}đ</div>`;
                }
                
                let noPredText = m.status === 'FT' ? 'Không đoán' : 'Chưa đoán';
                let noPredStyle = m.status === 'FT' ? 'style="color: var(--accent-red);"' : 'style="color: var(--text-muted);"';
                
                cellContent = `
                    <div class="matrix-cell-score" ${noPredStyle}>${noPredText}</div>
                    ${ptsDisplay}
                `;
            }
            
            trHtml.push(`<td>${cellContent}</td>`);
        });
        
        tr.innerHTML = trHtml.join('');
        table.appendChild(tr);
    });

    // Create the champion prediction row at the bottom of the matrix
    const champRow = document.createElement('tr');
    champRow.style.background = 'rgba(234, 179, 8, 0.03)';
    champRow.style.borderTop = '2px solid rgba(234, 179, 8, 0.2)';
    
    // Check if champion is locked (Match 73 kickoff - 15 mins)
    const match73 = allMatches.find(m => m.id === 73);
    let isChampLocked = false;
    if (match73) {
        isChampLocked = new Date() > new Date(new Date(match73.kickoff).getTime() - 15 * 60 * 1000);
    }
    
    const champPredsList = allChampionPredictions || [];
    
    let actualChampText = 'Chưa có';
    if (db.isDemoMode()) {
        actualChampText = localStorage.getItem('WC_MOCK_CHAMPION_WINNER') || 'Chưa có';
    } else {
        const correctChamp = champPredsList.find(c => parseFloat(c.points) > 0);
        if (correctChamp) {
            actualChampText = correctChamp.predicted_team;
        }
    }
    
    const champHtml = [
        `<td class="sticky-col" style="color: var(--accent-gold); font-weight: bold; border-top: 2px solid rgba(234, 179, 8, 0.2); font-size: 0.9rem;">🏆 CƯỢC VÔ ĐỊCH</td>`,
        `<td style="border-top: 2px solid rgba(234, 179, 8, 0.2);"><strong style="color: var(--accent-gold); font-size: 0.95rem;">${actualChampText}</strong></td>`
    ];
    
    playersList.forEach(p => {
        const pred = champPredsList.find(pr => pr.player_id === p.id);
        
        let cellContent = '';
        if (pred && pred.predicted_team) {
            const pts = parseFloat(pred.points);
            let ptsDisplay = '';
            const hasWinnerDeclared = actualChampText !== 'Chưa có' && actualChampText !== '';
            if (hasWinnerDeclared) {
                ptsDisplay = `<div class="matrix-cell-pts ${pts > 0 ? 'win' : 'loss'}">${pts > 0 ? '+' : ''}${pts}đ</div>`;
            } else {
                ptsDisplay = `<div class="matrix-cell-pts loss" style="background: rgba(234,179,8,0.1); color: var(--accent-gold); border-color: rgba(234,179,8,0.2);">-50đ</div>`;
            }
            cellContent = `
                <div class="matrix-cell-score" style="color: var(--accent-gold); font-weight: bold; font-size: 0.85rem;">${pred.predicted_team}</div>
                ${ptsDisplay}
            `;
        } else {
            cellContent = `
                <div class="matrix-cell-score" style="color: var(--text-muted); font-size: 0.85rem;">Chưa cược</div>
                <div class="matrix-cell-pts loss">0đ</div>
            `;
        }
        champHtml.push(`<td style="border-top: 2px solid rgba(234, 179, 8, 0.2);">${cellContent}</td>`);
    });
    
    champRow.innerHTML = champHtml.join('');
    table.appendChild(champRow);
}

// RENDER ADMIN MATCH RESULTS UPDATE
function renderAdminMatches() {
    const list = document.getElementById('admin-matches-list');
    const select = document.getElementById('admin-stage-select');
    
    const stage = select.value;
    const stageMatches = allMatches.filter(m => m.stage === stage);
    
    list.innerHTML = '';
    
    if (stageMatches.length === 0) {
        list.innerHTML = '<div style="color: var(--text-muted); text-align: center;">Không có trận đấu nào.</div>';
        return;
    }
    
    stageMatches.forEach(m => {
        const row = document.createElement('div');
        row.className = 'admin-match-row';
        
        const scoreA = m.score_a !== null ? m.score_a : '';
        const scoreB = m.score_b !== null ? m.score_b : '';
        
        row.innerHTML = `
            <div class="admin-match-info" style="display: flex; flex-direction: column; gap: 6px;">
                <div>
                    <strong>Trận ${m.id}</strong>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <input type="text" id="admin-${m.id}-team-a" value="${m.team_a}" class="pred-input" style="width: 140px; text-align: left; font-size: 0.85rem; padding: 4px 8px; height: 30px;">
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: bold;">vs</span>
                    <input type="text" id="admin-${m.id}-team-b" value="${m.team_b}" class="pred-input" style="width: 140px; text-align: left; font-size: 0.85rem; padding: 4px 8px; height: 30px;">
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Kickoff: ${m.kickoff}</div>
            </div>
            <div class="admin-match-inputs">
                <input type="number" min="0" class="pred-input" id="admin-${m.id}-a" value="${scoreA}" placeholder="A">
                <span>-</span>
                <input type="number" min="0" class="pred-input" id="admin-${m.id}-b" value="${scoreB}" placeholder="B">
                <select id="admin-${m.id}-status">
                    <option value="SCHEDULED" ${m.status === 'SCHEDULED' ? 'selected' : ''}>Chưa đá</option>
                    <option value="LIVE" ${m.status === 'LIVE' ? 'selected' : ''}>LIVE</option>
                    <option value="FT" ${m.status === 'FT' ? 'selected' : ''}>FT (Kết thúc)</option>
                </select>
                <button class="btn-save-pred btn-admin-save" data-match-id="${m.id}">Cập nhật</button>
            </div>
        `;
        list.appendChild(row);
    });
    
    // Add save actions
    const saveButtons = list.querySelectorAll('.btn-admin-save');
    saveButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const mId = btn.getAttribute('data-match-id');
            const scoreA = document.getElementById(`admin-${mId}-a`).value;
            const scoreB = document.getElementById(`admin-${mId}-b`).value;
            let status = document.getElementById(`admin-${mId}-status`).value;
            const teamA = document.getElementById(`admin-${mId}-team-a`).value;
            const teamB = document.getElementById(`admin-${mId}-team-b`).value;
            
            // Automatically promote status to FT if scores are input
            if (scoreA !== '' && scoreB !== '' && status === 'SCHEDULED') {
                status = 'FT';
                document.getElementById(`admin-${mId}-status`).value = 'FT';
            }
            
            if (status === 'FT' && (scoreA === '' || scoreB === '')) {
                alert('Vui lòng nhập tỷ số nếu trạng thái là FT (Kết thúc)!');
                return;
            }
            
            btn.disabled = true;
            btn.textContent = '...';
            
            const scoreAVal = scoreA !== '' ? parseInt(scoreA) : null;
            const scoreBVal = scoreB !== '' ? parseInt(scoreB) : null;
            
            const res = await db.updateMatchResult(parseInt(mId), scoreAVal, scoreBVal, status, teamA, teamB);
            if (res.success) {
                btn.style.borderColor = 'var(--accent-green)';
                btn.style.color = 'var(--accent-green)';
                btn.textContent = 'Ok';
                // Reload all app data to refresh calculations and points immediately
                await loadAppData();
                setTimeout(() => {
                    btn.disabled = false;
                    btn.style.borderColor = '';
                    btn.style.color = '';
                    btn.textContent = 'Cập nhật';
                }, 1000);
            } else {
                alert('Lỗi cập nhật: ' + res.error);
                btn.disabled = false;
                btn.textContent = 'Cập nhật';
            }
        });
    });
}

// Helper to refresh all user selections across login and admin screens
async function refreshAllPlayerDropdowns() {
    await initLoginDropdown();
    
    // Populate admin select
    const userSelect = document.getElementById('admin-user-select');
    if (userSelect) {
        userSelect.innerHTML = '<option value="">-- Chọn thành viên --</option>';
        allPlayers.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            userSelect.appendChild(opt);
        });
    }
}

// ADMIN VIEW PLAYER PWDS INITIALIZATION
function initAdminPanel() {
    const stageSelect = document.getElementById('admin-stage-select');
    stageSelect.addEventListener('change', () => {
        renderAdminMatches();
    });
    
    const userSelect = document.getElementById('admin-user-select');
    const newPassInput = document.getElementById('admin-new-password');
    const saveBtn = document.getElementById('admin-change-pass-btn');
    const msg = document.getElementById('admin-user-msg');
    
    // Populate user list
    setTimeout(async () => {
        await refreshAllPlayerDropdowns();
        renderAdminChampionSelect();
    }, 1000);
    
    saveBtn.addEventListener('click', async () => {
        const pId = userSelect.value;
        const newPass = newPassInput.value;
        
        if (!pId || !newPass) {
            alert('Vui lòng chọn người chơi và nhập mật khẩu mới!');
            return;
        }
        
        saveBtn.disabled = true;
        
        const res = await db.adminChangePassword(pId, newPass);
        saveBtn.disabled = false;
        if (res.success) {
            msg.style.display = 'block';
            newPassInput.value = '';
            setTimeout(() => {
                msg.style.display = 'none';
            }, 2000);
        } else {
            alert('Lỗi: ' + res.error);
        }
    });

    // Admin Add Player form submission handler
    const addForm = document.getElementById('admin-add-user-form');
    const addMsg = document.getElementById('admin-add-user-msg');
    const addError = document.getElementById('admin-add-user-error');
    
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            addMsg.style.display = 'none';
            addError.style.display = 'none';
            
            const name = document.getElementById('admin-add-user-name').value;
            const email = document.getElementById('admin-add-user-email').value;
            const password = document.getElementById('admin-add-user-password').value;
            const role = document.getElementById('admin-add-user-role').value;
            
            const submitBtn = addForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            
            const res = await db.addPlayer(name, email, role, password);
            submitBtn.disabled = false;
            
            if (res.success) {
                addMsg.style.display = 'block';
                addForm.reset();
                document.getElementById('admin-add-user-password').value = '123456';
                
                // Refresh dropdowns and app data
                await loadAppData();
                await refreshAllPlayerDropdowns();
                
                setTimeout(() => {
                    addMsg.style.display = 'none';
                }, 3000);
            } else {
                addError.textContent = 'Lỗi: ' + (res.error || 'Email đã tồn tại!');
                addError.style.display = 'block';
                setTimeout(() => {
                    addError.style.display = 'none';
                }, 4000);
            }
        });
    }

    // Admin Delete Player handler
    const deleteBtn = document.getElementById('admin-delete-user-btn');
    const userError = document.getElementById('admin-user-error');
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const pId = userSelect.value;
            if (!pId) {
                alert('Vui lòng chọn người chơi cần xóa!');
                return;
            }
            
            const player = allPlayers.find(p => p.id === pId);
            const pName = player ? player.name : 'thành viên này';
            
            if (!confirm(`Bạn có chắc chắn muốn xóa thành viên "${pName}"? Điều này sẽ xóa tất cả dự đoán của họ!`)) {
                return;
            }
            
            deleteBtn.disabled = true;
            userError.style.display = 'none';
            
            const res = await db.deletePlayer(pId);
            deleteBtn.disabled = false;
            
            if (res.success) {
                alert(`Đã xóa thành công thành viên "${pName}".`);
                
                // Refresh dropdowns and app data
                await loadAppData();
                await refreshAllPlayerDropdowns();
            } else {
                userError.textContent = 'Lỗi: ' + (res.error || 'Không thể xóa thành viên!');
                userError.style.display = 'block';
                setTimeout(() => {
                    userError.style.display = 'none';
                }, 3000);
            }
        });
    }

    // Admin Save Champion Button Listener
    const saveChampBtn = document.getElementById('admin-save-champion-btn');
    const champMsg = document.getElementById('admin-champion-msg');
    const champSelect = document.getElementById('admin-champion-select');
    
    if (saveChampBtn) {
        saveChampBtn.addEventListener('click', async () => {
            const winningTeam = champSelect.value;
            if (!winningTeam) {
                alert('Vui lòng chọn đội vô địch!');
                return;
            }
            saveChampBtn.disabled = true;
            saveChampBtn.textContent = '...';
            
            const res = await db.updateChampionResult(winningTeam);
            saveChampBtn.disabled = false;
            saveChampBtn.textContent = 'Cập nhật';
            if (res.success) {
                champMsg.style.display = 'block';
                setTimeout(() => {
                    champMsg.style.display = 'none';
                }, 2000);
                
                // Reload data and views
                await loadAppData();
                if (currentTab === 'leaderboard') renderLeaderboard();
                if (currentTab === 'predict') renderPredict();
                if (currentTab === 'matrix') renderMatrix();
            } else {
                alert('Lỗi cập nhật: ' + res.error);
            }
        });
    }
}

// MODAL CONTROLS (View other players' predictions for locked matches)
function initModal() {
    const overlay = document.getElementById('predictions-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    
    closeBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
        }
    });
}

async function openPredictionsModal(matchId, matchTitle) {
    const overlay = document.getElementById('predictions-modal');
    const title = document.getElementById('modal-match-title');
    const list = document.getElementById('modal-predictions-list');
    
    title.textContent = `Dự đoán: ${matchTitle}`;
    list.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 10px;">Đang tải dự đoán...</div>';
    overlay.style.display = 'flex';
    
    let data = [];
    if (db.isDemoMode()) {
        const preds = JSON.parse(localStorage.getItem('WC_MOCK_PREDICTIONS') || '[]');
        data = preds.filter(p => p.match_id === matchId);
    } else {
        const supabase = db.getSupabase();
        if (!supabase) return;
        
        // Fetch predictions for this match
        const { data: dbData, error } = await supabase
            .from('predictions')
            .select('player_id, predict_a, predict_b, points')
            .eq('match_id', matchId);
            
        if (error) {
            console.error('Error fetching modal predictions:', error);
            return;
        }
        data = dbData || [];
    }
    
    list.innerHTML = '';
    
    if (data.length === 0) {
        list.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 10px;">Chưa có ai nộp dự đoán cho trận này.</div>';
        return;
    }
    
    // Fetch match status to see if FT (to display points)
    const match = allMatches.find(m => m.id === matchId);
    
    // Map with player names
    data.forEach(pred => {
        const player = allPlayers.find(p => p.id === pred.player_id);
        const pName = player ? player.name : 'Unknown';
        
        let predText = 'Không dự đoán';
        if (pred.predict_a !== null) {
            predText = `${pred.predict_a} - ${pred.predict_b}`;
        }
        
        let ptsText = '';
        if (match && match.status === 'FT' && pred.predict_a !== null) {
            const pts = parseFloat(pred.points);
            ptsText = `<span style="font-weight: 700; font-size: 0.8rem; margin-left: 8px; color: ${pts >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
                (${pts >= 0 ? '+' : ''}${pts}đ)
            </span>`;
        }
        
        const row = document.createElement('div');
        row.className = 'pred-list-row';
        row.innerHTML = `
            <span class="pred-name">${pName}</span>
            <div>
                <span class="pred-val">${predText}</span>
                ${ptsText}
            </div>
        `;
        list.appendChild(row);
    });
}

// Open modal for champion predictions of all players
async function openChampionPredictionsModal() {
    const overlay = document.getElementById('predictions-modal');
    const title = document.getElementById('modal-match-title');
    const list = document.getElementById('modal-predictions-list');
    
    title.textContent = `Dự đoán đội vô địch giải đấu (Bet 50đ)`;
    list.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 10px;">Đang tải...</div>';
    overlay.style.display = 'flex';
    
    const data = await db.fetchAllChampionPredictions();
    list.innerHTML = '';
    
    if (data.length === 0) {
        list.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 10px;">Chưa có ai đặt cược nhà vô địch.</div>';
        return;
    }
    
    // Sort players alphabetically
    const sortedPlayers = [...allPlayers].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedPlayers.forEach(p => {
        const pred = data.find(pr => pr.player_id === p.id);
        
        let predText = 'Không dự đoán';
        let ptsText = '';
        
        if (pred && pred.predicted_team) {
            predText = pred.predicted_team;
            const pts = parseFloat(pred.points);
            ptsText = `<span style="font-weight: 700; font-size: 0.8rem; margin-left: 8px; color: ${pts > 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
                (${pts > 0 ? '+' : ''}${pts}đ)
            </span>`;
        }
        
        const row = document.createElement('div');
        row.className = 'pred-list-row';
        row.innerHTML = `
            <span class="pred-name">${p.name}</span>
            <div>
                <span class="pred-val" style="color: var(--accent-gold); font-weight: bold;">${predText}</span>
                ${ptsText}
            </div>
        `;
        list.appendChild(row);
    });
}

// Render dynamic candidate teams for Admin Champion Dropdown
function renderAdminChampionSelect() {
    const champSelect = document.getElementById('admin-champion-select');
    if (!champSelect) return;
    
    const r32Matches = allMatches.filter(m => m.stage === 'Vòng 1/16');
    const r32Teams = [];
    r32Matches.forEach(m => {
        if (m.team_a && !r32Teams.includes(m.team_a)) r32Teams.push(m.team_a);
        if (m.team_b && !r32Teams.includes(m.team_b)) r32Teams.push(m.team_b);
    });
    r32Teams.sort((a, b) => a.localeCompare(b, 'vi'));
    
    champSelect.innerHTML = '<option value="">-- Chọn đội vô địch --</option>';
    
    let storedWinner = '';
    if (db.isDemoMode()) {
        storedWinner = localStorage.getItem('WC_MOCK_CHAMPION_WINNER') || '';
    } else {
        const correctChamp = allChampionPredictions.find(c => parseFloat(c.points) > 0);
        if (correctChamp) storedWinner = correctChamp.predicted_team;
    }
    
    r32Teams.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        if (t === storedWinner) opt.selected = true;
        champSelect.appendChild(opt);
    });
}

// Password Change Modal Handlers & Logic

function initPasswordChangeModal() {
    const modal = document.getElementById('password-change-modal');
    const closeBtn = document.getElementById('pwd-modal-close-btn');
    const form = document.getElementById('user-change-pwd-form');
    const errorEl = document.getElementById('pwd-change-error');
    const successEl = document.getElementById('pwd-change-success');
    
    // Close modal event
    closeBtn.addEventListener('click', () => {
        if (!isPasswordChangeForced) {
            modal.style.display = 'none';
        }
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal && !isPasswordChangeForced) {
            modal.style.display = 'none';
        }
    });
    
    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
        
        const newPwd = document.getElementById('user-new-pwd').value;
        const confirmPwd = document.getElementById('user-confirm-pwd').value;
        
        if (newPwd.length < 4) {
            errorEl.textContent = 'Mật khẩu mới phải dài ít nhất 4 ký tự!';
            errorEl.style.display = 'block';
            return;
        }
        
        if (newPwd !== confirmPwd) {
            errorEl.textContent = 'Xác nhận mật khẩu mới không khớp!';
            errorEl.style.display = 'block';
            return;
        }
        
        if (newPwd === '123456') {
            errorEl.textContent = 'Mật khẩu mới không được trùng với mật khẩu mặc định (123456)!';
            errorEl.style.display = 'block';
            return;
        }
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        const res = await db.adminChangePassword(currentUser.id, newPwd);
        submitBtn.disabled = false;
        
        if (res.success) {
            successEl.style.display = 'block';
            form.reset();
            
            setTimeout(async () => {
                modal.style.display = 'none';
                successEl.style.display = 'none';
                
                if (isPasswordChangeForced) {
                    isPasswordChangeForced = false;
                    // Complete login after password is changed successfully
                    window.sessionStorage.setItem('WC_CURRENT_USER', JSON.stringify(currentUser));
                    setupUserSession();
                    await loadAppData();
                    switchView('leaderboard');
                }
            }, 1500);
        } else {
            errorEl.textContent = 'Lỗi cập nhật mật khẩu: ' + (res.error || 'Thao tác thất bại!');
            errorEl.style.display = 'block';
        }
    });
    
    // User bar button triggers voluntary password change
    const userBarBtn = document.getElementById('btn-user-change-pwd');
    if (userBarBtn) {
        userBarBtn.addEventListener('click', () => {
            openPasswordChangeModal(false);
        });
    }
}

function openPasswordChangeModal(forced = false) {
    isPasswordChangeForced = forced;
    
    const modal = document.getElementById('password-change-modal');
    const closeBtn = document.getElementById('pwd-modal-close-btn');
    const desc = document.getElementById('pwd-modal-desc');
    const errorEl = document.getElementById('pwd-change-error');
    const successEl = document.getElementById('pwd-change-success');
    const form = document.getElementById('user-change-pwd-form');
    
    form.reset();
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if (forced) {
        closeBtn.style.display = 'none';
        desc.innerHTML = `<span style="color: var(--accent-red); font-weight: bold;">⚠️ YÊU CẦU BẢO MẬT:</span> Bạn đang dùng mật khẩu mặc định (123456). Vui lòng đặt mật khẩu mới để tiếp tục sử dụng ứng dụng!`;
    } else {
        closeBtn.style.display = 'block';
        desc.textContent = 'Nhập mật khẩu mới của bạn bên dưới để đổi:';
    }
    
    modal.style.display = 'flex';
}
