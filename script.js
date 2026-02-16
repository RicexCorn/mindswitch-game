let gameLoopId;
/* =========================================
   1. SUPABASE INIT
========================================= */

window.supabaseClient = window.supabase.createClient(
  "https://hzkdjkhigdzajiirqrfp.supabase.co",
  "sb_publishable_k58FYoplPJWXFlvqAdoj4Q_gdRIK74m"
);


/* =========================================
   2. DOM CACHE
========================================= */

const overlay = document.getElementById("authOverlay");
const guestButtons = document.getElementById("guestButtons");
const userButton = document.getElementById("userButton");
const signupBtn = document.getElementById("signupBtn");
const loginTopBtn = document.getElementById("loginTopBtn");
const usernameBtn = document.getElementById("usernameBtn");
const usernameDisplay = document.getElementById("usernameDisplay");

const signupModal = document.getElementById("signupModal");
const loginModal = document.getElementById("loginModal");
const profileModal = document.getElementById("profileModal");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

const switchToLogin = document.getElementById("switchToLogin");
const switchToSignup = document.getElementById("switchToSignup");

const closeButtons = document.querySelectorAll(".close-modal");


/* =========================================
   3. AUTH SYSTEM
========================================= */

async function updateUI() {
    const { data } = await supabaseClient.auth.getUser();
    const user = data.user;

    if (user) {
        // Hide guest buttons, show username button
        guestButtons.classList.add("hidden");
        userButton.classList.remove("hidden");

        const username = user.email.replace("@school.local", "");
        usernameDisplay.textContent = username;
        
        // Update profile info
        document.getElementById("profileUsername").textContent = username;
        document.getElementById("profileInitial").textContent = username.charAt(0).toUpperCase();
        
        // Load user stats
        await loadUserStats(user.id);
    } else {
        // Show guest buttons, hide username button
        guestButtons.classList.remove("hidden");
        userButton.classList.add("hidden");
    }
}

async function loadUserStats(userId) {
    const { data } = await supabaseClient
        .from("game_history")
        .select("score, accuracy")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (data && data.length > 0) {
        // Total games
        document.getElementById("profileGames").textContent = data.length;
        
        // Best score
        const bestScore = Math.max(...data.map(g => g.score));
        document.getElementById("profileBestScore").textContent = bestScore;
        
        // Average accuracy
        const avgAccuracy = Math.round(
            data.reduce((sum, g) => sum + g.accuracy, 0) / data.length
        );
        document.getElementById("profileAvgAcc").textContent = avgAccuracy + "%";
    } else {
        document.getElementById("profileGames").textContent = "0";
        document.getElementById("profileBestScore").textContent = "0";
        document.getElementById("profileAvgAcc").textContent = "0%";
    }
}

async function loadLeaderboard() {
    const leaderboardContent = document.getElementById("leaderboardContent");
    leaderboardContent.innerHTML = '<div class="loading-spinner">กำลังโหลด...</div>';
    
    try {
        // ดึงข้อมูล profiles ทั้งหมด
        const { data: profilesData, error: profilesError } = await supabaseClient
            .from("profiles")
            .select("id, username");

        if (profilesError) {
            console.error("Profiles error:", profilesError);
            throw profilesError;
        }

        // ดึงข้อมูล game_history ทั้งหมด
        const { data: gamesData, error: gamesError } = await supabaseClient
            .from("game_history")
            .select("user_id, score")
            .order("score", { ascending: false });

        if (gamesError) {
            console.error("Games error:", gamesError);
            throw gamesError;
        }

        if (!gamesData || gamesData.length === 0) {
            leaderboardContent.innerHTML = `
                <div class="leaderboard-empty">
                    <div class="leaderboard-empty-icon">🎮</div>
                    <div class="leaderboard-empty-text">ยังไม่มีผู้เล่นในลีดเดอร์บอร์ด</div>
                </div>
            `;
            return;
        }

        // สร้าง map ของ profiles
        const profilesMap = {};
        profilesData.forEach(profile => {
            profilesMap[profile.id] = profile.username;
        });

        // หา best score ของแต่ละคน
        const userBestScores = {};
        gamesData.forEach(game => {
            const userId = game.user_id;
            const username = profilesMap[userId] || "Unknown";
            const score = game.score;
            
            if (!userBestScores[userId] || userBestScores[userId].score < score) {
                userBestScores[userId] = { username, score };
            }
        });

        // แปลงเป็น array และเรียงลำดับ
        const leaderboard = Object.values(userBestScores)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // เอาแค่ 10 อันดับแรก

        if (leaderboard.length === 0) {
            leaderboardContent.innerHTML = `
                <div class="leaderboard-empty">
                    <div class="leaderboard-empty-icon">🎮</div>
                    <div class="leaderboard-empty-text">ยังไม่มีผู้เล่นในลีดเดอร์บอร์ด</div>
                </div>
            `;
            return;
        }

        // สร้าง HTML
        const leaderboardHTML = `
            <ul class="leaderboard-list">
                ${leaderboard.map((entry, index) => {
                    const rank = index + 1;
                    const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
                    const rankClass = rank <= 3 ? `rank-${rank}` : '';
                    
                    return `
                        <li class="leaderboard-item ${rankClass}">
                            <div class="leaderboard-rank">
                                ${emoji ? 
                                    `<span class="rank-emoji">${emoji}</span>` : 
                                    `<span class="rank-number">${rank}</span>`
                                }
                                <span class="leaderboard-username">${entry.username}</span>
                            </div>
                            <span class="leaderboard-score">${entry.score}</span>
                        </li>
                    `;
                }).join('')}
            </ul>
        `;

        leaderboardContent.innerHTML = leaderboardHTML;
    } catch (error) {
        console.error("Error loading leaderboard:", error);
        leaderboardContent.innerHTML = `
            <div class="leaderboard-empty">
                <div class="leaderboard-empty-icon">⚠️</div>
                <div class="leaderboard-empty-text">เกิดข้อผิดพลาด: ${error.message}</div>
            </div>
        `;
    }
}

function showLeaderboard() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('leaderboard-screen').classList.remove('hidden');
    
    // แสดงปุ่มบนจอ
    document.getElementById('authButtonsContainer').style.display = 'flex';
    document.getElementById('leaderboardButtonContainer').style.display = 'block';
    
    loadLeaderboard();
}

function hideLeaderboard() {
    document.getElementById('leaderboard-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    
    // แสดงปุ่มบนจอ
    document.getElementById('authButtonsContainer').style.display = 'flex';
    document.getElementById('leaderboardButtonContainer').style.display = 'block';
}

async function register() {
    const username = document.getElementById("signupUsername").value.trim();
    const password = document.getElementById("signupPassword").value.trim();

    if (!username || !password) {
        alert("กรอกข้อมูลให้ครบ");
        return;
    }

    const email = `${username}@school.local`;

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        alert(error.message);
        return;
    }

    await supabaseClient.from("profiles").insert([
        {
            id: data.user.id,
            username,
        }
    ]);

    alert("สมัครสำเร็จ");
    closeOverlay();
    updateUI();
}

async function login() {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!username || !password) {
        alert("กรอกข้อมูลให้ครบ");
        return;
    }

    const email = `${username}@school.local`;

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert("ชื่อผู้ใช้หรือรหัสผ่านผิด");
        return;
    }

    closeOverlay();
    updateUI();
}

async function logout() {
    await supabaseClient.auth.signOut();
    closeOverlay();
    updateUI();
}


/* =========================================
   4. MODAL FUNCTIONS
========================================= */

function showSignupModal() {
    overlay.classList.remove("hidden");
    signupModal.classList.remove("hidden");
    loginModal.classList.add("hidden");
    profileModal.classList.add("hidden");
    
    // Clear inputs
    document.getElementById("signupUsername").value = "";
    document.getElementById("signupPassword").value = "";
}

function showLoginModal() {
    overlay.classList.remove("hidden");
    loginModal.classList.remove("hidden");
    signupModal.classList.add("hidden");
    profileModal.classList.add("hidden");
    
    // Clear inputs
    document.getElementById("loginUsername").value = "";
    document.getElementById("loginPassword").value = "";
}

function showProfileModal() {
    overlay.classList.remove("hidden");
    profileModal.classList.remove("hidden");
    signupModal.classList.add("hidden");
    loginModal.classList.add("hidden");
}

function closeOverlay() {
    overlay.classList.add("hidden");
    signupModal.classList.add("hidden");
    loginModal.classList.add("hidden");
    profileModal.classList.add("hidden");
}


/* =========================================
   5. PROFILE / DATABASE
========================================= */

async function saveGame(score, accuracy) {
    const { data } = await supabaseClient.auth.getUser();
    const user = data.user;

    if (!user) return;

    await supabaseClient.from("game_history").insert([
        {
            user_id: user.id,
            score,
            accuracy
        }
    ]);
}


/* =========================================
   6. EVENT LISTENERS
========================================= */

signupBtn.onclick = showSignupModal;
loginTopBtn.onclick = showLoginModal;
usernameBtn.onclick = showProfileModal;

loginBtn.onclick = login;
registerBtn.onclick = register;
logoutBtn.onclick = logout;

switchToLogin.onclick = (e) => {
    e.preventDefault();
    showLoginModal();
};

switchToSignup.onclick = (e) => {
    e.preventDefault();
    showSignupModal();
};

closeButtons.forEach(btn => {
    btn.onclick = closeOverlay;
});

// Close on overlay click (outside modal)
overlay.onclick = (e) => {
    if (e.target === overlay) {
        closeOverlay();
    }
};

// Leaderboard buttons
const leaderboardBtn = document.getElementById("leaderboardBtn");
const backFromLeaderboard = document.getElementById("backFromLeaderboard");

leaderboardBtn.onclick = showLeaderboard;
backFromLeaderboard.onclick = hideLeaderboard;


/* =========================================
   7. GAME CODE
========================================= */

const CONFIG = {
    gameDuration: 150,
    ruleVisibleTime: 12000,      // เพิ่มจาก 6000 เป็น 12000 (12 วินาที)
    ruleChangeWarning: 3000,
    freezeDuration: 2500,
    
    // Dynamic Difficulty Settings
    initialSpawnRate: 2800,      // เพิ่มเวลา spawn (เดิม 2200)
    minSpawnRate: 1200,          // เพิ่มเวลา spawn (เดิม 900)
    maxSpawnRate: 3500,          // เพิ่มเวลา spawn (เดิม 2500)
    
    initialSpeed: 1.5,           
    maxSpeed: 5.5,               
    minSpeed: 2,
    
    // Flow State Tuning (ปรับตาม performance)
    targetAccuracy: 0.75,        // เป้าหมายความแม่นยำ 75%
    difficultyAdjustSpeed: 0.3,  // ความเร็วในการปรับความยาก (0-1)
    
    // Sigmoid Curve Parameters
    speedCurveMidpoint: 0.4,     // จุดกลางของ S-curve (0-1)
    speedCurveSteepness: 10,     // ความชันของ curve - เร่งเร็ว
    
    // Physics Config
    friction: 0.92,
    throwForce: 1,
    
    // Gravity Settings
    gravityStrength: 1.2,
    gravityRadius: 200,
    suckSpeed: 15,
    
    // Medical Theme - Soft Pastel Colors
    colors: [
        { name: 'แดง', hex: '#FFB3B3' },      // Pastel Pink
        { name: 'ฟ้า', hex: '#B3D9FF' },      // Pastel Blue
        { name: 'เขียว', hex: '#B3E6CC' },    // Pastel Mint
        { name: 'ม่วง', hex: '#D4C5F9' },     // Pastel Lavender
        { name: 'ส้ม', hex: '#FFD4B3' }       // Pastel Peach
    ],
    shapes: ['circle', 'square', 'triangle'],
    labels: ['1', '2', '3', 'A', 'B', 'C', 'X', 'Y']
};

let state = {
    score: 0,
    timeLeft: CONFIG.gameDuration,
    currentRule: null,
    objects: [],
    isGameOver: true,
    isFrozen: false,
    elapsedTime: 0,
    stats: { correct: 0, incorrect: 0 },
    
    // Dynamic Difficulty State
    difficultyMultiplier: 1.0,   // ตัวคูณความยาก (0.5 - 1.5)
    recentPerformance: [],        // เก็บ performance ล่าสุด 10 ครั้ง
    lastAdjustTime: 0             // เวลาที่ปรับความยากล่าสุด
};

const playArea = document.getElementById('play-area');
const scoreEl = document.getElementById('score-val');
const timeEl = document.getElementById('time-val');
const ruleEl = document.getElementById('rule-display');
const ruleWarningBar = document.getElementById('rule-warning-bar');
const alertEl = document.getElementById('alert-text');
const freezeOverlay = document.getElementById('freeze-overlay');
const gameContainer = document.getElementById('game-container');


// Audio Functions
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, dur, vol = 0.05) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        osc.connect(gain); 
        gain.connect(audioCtx.destination);
        osc.start(); 
        osc.stop(audioCtx.currentTime + dur);
    } catch (e) {}
}

// Dynamic Difficulty System
function updateDifficulty(isCorrect) {
    // ปิดชั่วคราวเพื่อแก้ปัญหา glitch
    return;
    
    state.recentPerformance.push(isCorrect ? 1 : 0);
    if (state.recentPerformance.length > 10) state.recentPerformance.shift();
    
    if (state.recentPerformance.length >= 5) {
        const recentAccuracy = state.recentPerformance.reduce((a,b) => a+b, 0) / state.recentPerformance.length;
        const diff = recentAccuracy - CONFIG.targetAccuracy;
        
        // ปรับ multiplier ตาม performance
        state.difficultyMultiplier += diff * CONFIG.difficultyAdjustSpeed;
        state.difficultyMultiplier = Math.max(0.5, Math.min(1.5, state.difficultyMultiplier));
    }
}

// Sigmoid Curve สำหรับความยากแบบ S-curve
function sigmoidCurve(progress, midpoint, steepness) {
    // progress: 0-1 (เวลาที่ผ่านไป / เวลาทั้งหมด)
    // midpoint: จุดกลางของ curve (0-1)
    // steepness: ความชัน - ยิ่งมากยิ่งกระชั้น
    
    const x = (progress - midpoint) * steepness;
    return 1 / (1 + Math.exp(-x));
}

function getCurrentSpeed() {
    const progress = state.elapsedTime / CONFIG.gameDuration;
    const baseCurve = sigmoidCurve(progress, CONFIG.speedCurveMidpoint, CONFIG.speedCurveSteepness);
    
    // Map curve (0-1) to speed range
    const baseSpeed = CONFIG.initialSpeed + (CONFIG.maxSpeed - CONFIG.initialSpeed) * baseCurve;
    
    // ปรับด้วย difficulty multiplier
    let adjustedSpeed = baseSpeed * state.difficultyMultiplier;
    
    // Clamp ให้อยู่ในช่วงที่กำหนด
    return Math.max(CONFIG.minSpeed, Math.min(CONFIG.maxSpeed, adjustedSpeed));
}

function getCurrentSpawnRate() {
    const progress = state.elapsedTime / CONFIG.gameDuration;
    const baseCurve = sigmoidCurve(progress, CONFIG.speedCurveMidpoint, CONFIG.speedCurveSteepness);
    
    // Spawn rate ต้องผกผัน - ยิ่งเร็วยิ่ง spawn บ่อย
    const baseRate = CONFIG.initialSpawnRate - (CONFIG.initialSpawnRate - CONFIG.minSpawnRate) * baseCurve;
    
    // ปรับด้วย difficulty multiplier (ผกผัน)
    let adjustedRate = baseRate / state.difficultyMultiplier;
    
    // Clamp
    return Math.max(CONFIG.minSpawnRate, Math.min(CONFIG.maxSpawnRate, adjustedRate));
}

// Rule System
function randomRule() {
    const types = ['color', 'shape', 'label'];
    
    // สุ่มประเภทเดียว (color, shape, หรือ label)
    const selectedType = types[Math.floor(Math.random() * types.length)];
    
    let v1, v2;
    
    // สุ่ม 2 ค่าที่ต่างกันในประเภทเดียวกัน
    if (selectedType === 'color') {
        const colors = [...CONFIG.colors];
        const idx1 = Math.floor(Math.random() * colors.length);
        v1 = colors[idx1].name;
        colors.splice(idx1, 1);
        v2 = colors[Math.floor(Math.random() * colors.length)].name;
    } else if (selectedType === 'shape') {
        const shapes = [...CONFIG.shapes];
        const idx1 = Math.floor(Math.random() * shapes.length);
        v1 = shapes[idx1];
        shapes.splice(idx1, 1);
        v2 = shapes[Math.floor(Math.random() * shapes.length)];
    } else {
        const labels = [...CONFIG.labels];
        const idx1 = Math.floor(Math.random() * labels.length);
        v1 = labels[idx1];
        labels.splice(idx1, 1);
        v2 = labels[Math.floor(Math.random() * labels.length)];
    }
    
    return {
        left: { attr: selectedType, op: 'is', value: v1 },
        right: { attr: selectedType, op: 'is', value: v2 }
    };
}

function formatRule(rule) {
    const thaiShape = { circle: 'วงกลม', square: 'สี่เหลี่ยม', triangle: 'สามเหลี่ยม' };
    
    // แสดงแค่ค่า ไม่มีคำนำหน้า
    const leftText = rule.left.attr === 'shape' 
        ? thaiShape[rule.left.value] 
        : rule.left.value;
        
    const rightText = rule.right.attr === 'shape' 
        ? thaiShape[rule.right.value] 
        : rule.right.value;
    
    return `${leftText} | ${rightText}`;
}

async function setRule() {
    if (state.isGameOver) return;
    
    const oldRule = state.currentRule;
    const oldObjects = [...state.objects]; // เก็บ objects เก่าไว้
    state.currentRule = randomRule();
    
    // Freeze
    state.isFrozen = true;
    freezeOverlay.classList.remove('hidden');
    gameContainer.classList.add('is-frozen');
    
    // Show Rule
    ruleEl.textContent = formatRule(state.currentRule);
    ruleEl.classList.remove('hidden-rule');
    
    playTone(523, 'sine', 0.15, 0.06); // C5
    playTone(659, 'sine', 0.15, 0.06); // E5
    playTone(784, 'sine', 0.25, 0.06); // G5
    
    await new Promise(r => setTimeout(r, CONFIG.freezeDuration));
    
    // Unfreeze
    state.isFrozen = false;
    freezeOverlay.classList.add('hidden');
    gameContainer.classList.remove('is-frozen');
    
    // รอ 300ms หลัง unfreeze แล้วค่อยลบ objects เก่า
    setTimeout(() => {
        oldObjects.forEach(obj => {
            // ข้าม objects ที่ถูก mark ไปแล้ว (เช่นถูก sort ไปแล้ว)
            if (obj.markedForRemoval) return;
            
            // หาสี hex จากชื่อสี
            const colorObj = CONFIG.colors.find(c => c.name === obj.color);
            const colorHex = colorObj ? colorObj.hex : '#B3D9FF';
            
            // คำนวณตำแหน่งกลาง object - ใช้ obj.width/height แทน DOM
            const centerX = obj.x + (obj.width / 2);
            const centerY = obj.y + (obj.height / 2);
            
            // สร้าง particles ระเบิด
            createParticles(centerX, centerY, colorHex, 12);
            
            // สร้าง sparks ระเบิด
            createSparks(centerX, centerY, colorHex, 8);
            
            // เสียงระเบิดเบาๆ
            playTone(200 + Math.random() * 100, 'sawtooth', 0.1, 0.03);
            
            // ลบ element และ mark for removal
            obj.el.remove();
            obj.markedForRemoval = true;
        });
        // ✅ ไม่ต้อง filter ที่นี่ เพราะ main loop จะลบให้เอง
    }, 300);
    
    // ซ่อนกฏหลังจาก 3 วินาที
    setTimeout(() => {
        if (!state.isGameOver) {
            ruleEl.classList.add('hidden-rule');
        }
    }, 3000);
    
    // Schedule Next Rule
    state.ruleTime = setTimeout(() => {
        // Warning เฉพาะ alert ไม่แสดงกฏเก่า
        alertEl.textContent = '⚠️';
        alertEl.classList.add('animate-alert');
        playTone(440, 'triangle', 0.3, 0.08);
        setTimeout(() => alertEl.classList.remove('animate-alert'), 1200);
        
        setTimeout(() => setRule(), CONFIG.ruleChangeWarning);
    }, CONFIG.ruleVisibleTime);
}

// Object Creation
function spawnSingle() {
    if (state.isGameOver || state.isFrozen) return;
    
    const color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
    const shape = CONFIG.shapes[Math.floor(Math.random() * CONFIG.shapes.length)];
    const label = CONFIG.labels[Math.floor(Math.random() * CONFIG.labels.length)];
    
    const el = document.createElement('div');
    el.className = `game-object shape-${shape}`;
    
    if (shape === 'triangle') {
        el.style.setProperty('--triangle-color', color.hex);
    } else {
        el.style.background = color.hex;
    }
    
    el.textContent = label;
    el.style.left = Math.random() * (playArea.clientWidth - 65) + 'px';
    el.style.top = -70 + 'px';
    
    playArea.appendChild(el);
    
    // เก็บ size เป็น properties เพื่อไม่ต้องอ่านจาก DOM
    const objSize = 65; // ค่าเดียวกับ --obj-size
    
    const obj = {
        el, 
        x: parseFloat(el.style.left), 
        y: -70,
        width: objSize,
        height: objSize,
        vx: (Math.random() - 0.5) * 2,
        vy: 0,
        color: color.name,
        shape,
        label,
        dragging: false,
        beingSucked: false,
        dragStartX: 0,
        dragStartY: 0,
        // สำหรับ velocity tracking
        lastX: parseFloat(el.style.left),
        lastY: -70,
        lastTime: Date.now()
    };
    
    state.objects.push(obj);
    
    // Touch/Mouse Events
    let mouseMoveHandler = null;
    let touchMoveHandler = null;
    let mouseUpHandler = null;
    let touchEndHandler = null;
    
    const startDrag = (e) => {
        if (state.isFrozen || obj.beingSucked) return;
        e.preventDefault();
        obj.dragging = true;
        el.classList.add('dragging');
        
        const touch = e.touches ? e.touches[0] : e;
        const rect = playArea.getBoundingClientRect();
        
        // คำนวณ offset ระหว่างจุดที่คลิกกับมุมบนซ้ายของ object
        obj.dragStartX = touch.clientX - rect.left - obj.x;
        obj.dragStartY = touch.clientY - rect.top - obj.y;
        
        // รีเซ็ต velocity tracking
        obj.lastX = obj.x;
        obj.lastY = obj.y;
        obj.lastTime = Date.now();
        
        // เพิ่ม document-level events เมื่อเริ่ม drag
        mouseMoveHandler = (e) => moveDrag(e);
        touchMoveHandler = (e) => moveDrag(e);
        mouseUpHandler = (e) => endDrag(e);
        touchEndHandler = (e) => endDrag(e);
        
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('touchmove', touchMoveHandler, { passive: false });
        document.addEventListener('mouseup', mouseUpHandler);
        document.addEventListener('touchend', touchEndHandler);
    };
    
    const moveDrag = (e) => {
        if (!obj.dragging || state.isFrozen) return;
        e.preventDefault();
        
        const touch = e.touches ? e.touches[0] : e;
        const rect = playArea.getBoundingClientRect();
        
        // เก็บตำแหน่งเก่าสำหรับคำนวณ velocity
        obj.lastX = obj.x;
        obj.lastY = obj.y;
        obj.lastTime = Date.now();
        
        // คำนวณตำแหน่งใหม่โดยรักษา offset ที่คลิกไว้
        obj.x = touch.clientX - rect.left - obj.dragStartX;
        obj.y = touch.clientY - rect.top - obj.dragStartY;
        
        // จำกัดให้อยู่ในพื้นที่เกม - ใช้ obj.width/height แทน DOM
        obj.x = Math.max(0, Math.min(playArea.clientWidth - obj.width, obj.x));
        obj.y = Math.max(0, Math.min(playArea.clientHeight - obj.height, obj.y));
        
        el.style.left = obj.x + 'px';
        el.style.top = obj.y + 'px';
    };
    
    const endDrag = (e) => {
        if (!obj.dragging) return;
        
        const now = Date.now();
        const dt = Math.max(now - obj.lastTime, 1);
        
        // คำนวณความเร็วจากการสะบัดนิ้ว
        obj.vx = (obj.x - obj.lastX) / dt * 8; 
        obj.vy = (obj.y - obj.lastY) / dt * 8;

        // --- จุดสำคัญ: จำกัดความเร็วไม่ให้พุ่งทะลุจอ ---
        const maxS = 25;
        obj.vx = Math.max(Math.min(obj.vx, maxS), -maxS);
        obj.vy = Math.max(Math.min(obj.vy, maxS), -maxS);

        // ป้องกันการโยนขึ้นฟ้าแล้วลอยค้าง (ถ้าพุ่งขึ้น ให้จำกัดแรงส่ง)
        if (obj.vy < -15) obj.vy = -15;

        obj.dragging = false;
        el.classList.remove('dragging');
        
        // ลบ document-level events เมื่อจบ drag
        if (mouseMoveHandler) {
            document.removeEventListener('mousemove', mouseMoveHandler);
            mouseMoveHandler = null;
        }
        if (touchMoveHandler) {
            document.removeEventListener('touchmove', touchMoveHandler);
            touchMoveHandler = null;
        }
        if (mouseUpHandler) {
            document.removeEventListener('mouseup', mouseUpHandler);
            mouseUpHandler = null;
        }
        if (touchEndHandler) {
            document.removeEventListener('touchend', touchEndHandler);
            touchEndHandler = null;
        }
    };
    
    el.addEventListener('mousedown', startDrag);
    el.addEventListener('touchstart', startDrag, { passive: false });
}

// Sorting Logic
function matchesCondition(obj, cond) {
    if (cond.op === 'is') {
        if (cond.attr === 'color') return obj.color === cond.value;
        if (cond.attr === 'shape') return obj.shape === cond.value;
        if (cond.attr === 'label') return obj.label === cond.value;
    }
    return false;
}

function showFloatingText(x, y, text, color) {
    const ft = document.createElement('div');
    ft.className = 'floating-text';
    ft.textContent = text;
    ft.style.left = x + 'px';
    ft.style.top = y + 'px';
    ft.style.color = color;
    playArea.appendChild(ft);
    setTimeout(() => ft.remove(), 1000);
}

function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.background = color;
        p.style.width = (Math.random() * 6 + 4) + 'px';
        p.style.height = p.style.width;
        playArea.appendChild(p);
        
        const angle = (Math.PI * 2 * i) / count;
        const speed = Math.random() * 3 + 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        let px = x, py = y;
        const interval = setInterval(() => {
            px += vx;
            py += vy;
            p.style.left = px + 'px';
            p.style.top = py + 'px';
            p.style.opacity = parseFloat(p.style.opacity || 1) - 0.05;
            if (parseFloat(p.style.opacity) <= 0) {
                clearInterval(interval);
                p.remove();
            }
        }, 16);
    }
}

function createSparks(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
        const s = document.createElement('div');
        s.className = 'spark';
        s.style.left = x + 'px';
        s.style.top = y + 'px';
        s.style.background = color;
        s.style.width = (Math.random() * 3 + 2) + 'px';
        s.style.height = (Math.random() * 15 + 10) + 'px';
        playArea.appendChild(s);
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 3;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        let px = x, py = y, rotation = 0;
        const interval = setInterval(() => {
            px += vx;
            py += vy;
            rotation += 15;
            s.style.left = px + 'px';
            s.style.top = py + 'px';
            s.style.transform = `rotate(${rotation}deg)`;
            s.style.opacity = parseFloat(s.style.opacity || 1) - 0.06;
            if (parseFloat(s.style.opacity) <= 0) {
                clearInterval(interval);
                s.remove();
            }
        }, 16);
    }
}

function handleSort(obj, zone) {
    let result = null;
    
    if (zone === 'center') {
        const leftMatch = matchesCondition(obj, state.currentRule.left);
        const rightMatch = matchesCondition(obj, state.currentRule.right);
        
        if (!leftMatch && !rightMatch) {
            result = 'trash-correct';
        } else {
            result = 'trash-incorrect';
        }
    } else {
        const targetCond = zone === 'left' ? state.currentRule.left : state.currentRule.right;
        const match = matchesCondition(obj, targetCond);
        
        if (match) {
            result = 'correct';
        } else {
            result = 'incorrect';
        }
    }
    
    // Update score & stats
    if (result === 'correct') {
        state.score += 5; 
        state.stats.correct++;
        updateDifficulty(true);
        
        playTone(660, 'sine', 0.12, 0.05);
        setTimeout(() => playTone(880, 'sine', 0.15, 0.05), 60);
        
        createParticles(obj.x + 32, playArea.clientHeight - 80, "#6AB187", 10); // Mint Green
        createSparks(obj.x + 32, playArea.clientHeight - 80, "#B3DDC4", 8);
        showFloatingText(obj.x, playArea.clientHeight - 80, "+5", "#6AB187"); // Mint Green
        
    } else if (result === 'incorrect') {
        state.score = Math.max(0, state.score - 2); 
        state.stats.incorrect++;
        updateDifficulty(false);
        
        playTone(196, 'sawtooth', 0.2, 0.08);
        
        createParticles(obj.x + 32, playArea.clientHeight - 80, "#D67C7C", 8); // Soft Red
        showFloatingText(obj.x, playArea.clientHeight - 80, "-2", "#D67C7C"); // Soft Red
        
    } else if (result === 'trash-correct') {
        state.score += 2; 
        state.stats.correct++;
        updateDifficulty(true);
        
        playTone(523, 'triangle', 0.12, 0.04);
        setTimeout(() => {
            playTone(587, 'triangle', 0.1, 0.04);
        }, 80);
        showFloatingText(obj.x, playArea.clientHeight - 80, "+1", "#5B8FB9"); // Medical Blue
    } else if (result === 'trash-incorrect') {
        state.score = Math.max(0, state.score - 2); state.stats.incorrect++;
        playTone(180, 'sawtooth', 0.15, 0.08);
        showFloatingText(obj.x, playArea.clientHeight - 80, "-2", "#D67C7C"); // Soft Red
    }

    // ✅ Mark for removal แทนการลบทันที - ป้องกัน glitch
    obj.el.style.display = 'none'; // ซ่อนทันทีเพื่อความรู้สึกว่าหายไปแล้ว
    obj.markedForRemoval = true;    // มาร์คไว้เฉยๆ ให้ loop หลักเป็นคนสั่ง .remove()
    scoreEl.textContent = state.score;
}

// Gravity System
function applyGravity(obj) {
    if (obj.dragging || obj.beingSucked) return;
    
    const width = playArea.clientWidth;
    const height = playArea.clientHeight;
    
    // จุดศูนย์กลางของแต่ละโซน (ที่ปากทาง)
    const gravityPoints = [
        { x: width * 0.165, y: height - 40, zone: 'left' },
        { x: width * 0.5, y: height - 40, zone: 'center' },
        { x: width * 0.835, y: height - 40, zone: 'right' }
    ];
    
    const objCenterX = obj.x + (obj.width / 2);
    const objCenterY = obj.y + (obj.height / 2);
    
    // หาจุดที่ใกล้ที่สุด
    for (const gp of gravityPoints) {
        const dx = gp.x - objCenterX;
        const dy = gp.y - objCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // ถ้าเข้าใกล้พอ เริ่มดูด
        if (distance < CONFIG.gravityRadius) {
            const strength = 1 - (distance / CONFIG.gravityRadius);
            
            // ถ้าเข้าใกล้มากๆ ให้ดูดเลย
            if (distance < 50 && !obj.beingSucked) {
                obj.beingSucked = true;
                obj.el.classList.add('being-sucked');
                
                // ตั้งค่าสำหรับ animation ที่จะทำงานใน main loop
                obj.suckStartTime = Date.now();
                obj.suckDuration = 500;
                obj.suckStartX = obj.x;
                obj.suckStartY = obj.y;
                obj.suckTargetX = gp.x - obj.width/2;
                obj.suckTargetY = height + 100;
                obj.suckZone = gp.zone;
                
                return true;
            }
            
            // ดึงเบาๆ เมื่ออยู่ในรัศมี
            if (!obj.beingSucked) {
                const pullX = (dx / distance) * strength * CONFIG.gravityStrength;
                const pullY = (dy / distance) * strength * CONFIG.gravityStrength;
                
                obj.vx += pullX;
                
                // ดึง Y เฉพาะเมื่อ object อยู่ข้างบน gravity point เท่านั้น (ไม่ดึงขึ้นบน)
                if (objCenterY < gp.y) {
                    obj.vy += pullY;
                }
            }
        }
    }
    
    return false;
}

let lastTime = performance.now();
// Main Game Loop
function loop(now) {
    if (state.isGameOver) return;

    const rawDelta = (now - lastTime) / 16.67;
    const delta = Math.min(rawDelta, 3); 
    lastTime = now;
    
    if (!state.isFrozen) {
        const currentSpeed = getCurrentSpeed();
        
        // วนลูปถอยหลัง (ที่คุณทำไว้ ถูกต้องแล้ว)
        for (let i = state.objects.length - 1; i >= 0; i--) {
            const obj = state.objects[i];

            // 1. จัดการการลบ (ทำลายทิ้งทันที ไม่ให้กวนตัวอื่น)
            if (obj.markedForRemoval) {
                if (obj.el && obj.el.parentNode) {
                    obj.el.remove(); 
                }
                state.objects.splice(i, 1);
                continue; 
            }
            
            // 2. ถ้ากำลังถูกดูด (Suck Animation) - แยกโลกออกมาเลย
            if (obj.beingSucked) {
                const elapsed = Date.now() - obj.suckStartTime;
                const progress = Math.min(elapsed / obj.suckDuration, 1);
                const eased = progress * progress; // Linear หรือ EaseIn
                
                // คำนวณตำแหน่งจากจุดเริ่มไปหาเป้าหมายตรงๆ ไม่เกี่ยวกับความเร็วเกม
                obj.x = obj.suckStartX + (obj.suckTargetX - obj.suckStartX) * eased;
                obj.y = obj.suckStartY + (obj.suckTargetY - obj.suckStartY) * eased;
                
                obj.el.style.left = obj.x + 'px';
                obj.el.style.top = obj.y + 'px';
                
                if (progress >= 1) {
                    handleSort(obj, obj.suckZone);
                }
                // สำคัญ: เมื่อถูกดูดแล้ว ต้อง 'continue' เพื่อไม่ให้ Logic ข้างล่างมาบวกค่า Y ซ้ำ
                continue;
            }
            
            // 3. การเคลื่อนที่ปกติ (เฉพาะตัวที่ไม่ได้ถูกลากและไม่ได้ถูกดูด)
            if (!obj.dragging) {
                // Apply Gravity Wells
                const sucked = applyGravity(obj);
                if (sucked) continue;
                
                // Movement
                obj.y += (currentSpeed + obj.vy) * delta;
                obj.x += obj.vx * delta;

                // Friction
                obj.vx *= CONFIG.friction;
                obj.vy *= CONFIG.friction;

                // Wall Collision
                if (obj.x <= 0) {
                    obj.x = 0;
                    obj.vx = Math.abs(obj.vx) * 0.1; 
                    if(obj.vx > 2) obj.vx = 2;
                } else if (obj.x >= playArea.clientWidth - obj.width) {
                    obj.x = playArea.clientWidth - obj.width;
                    obj.vx = -Math.abs(obj.vx) * 0.1;
                    if(obj.vx < -2) obj.vx = -2;
                }

                obj.el.style.left = obj.x + 'px';
                obj.el.style.top = obj.y + 'px';
                
                // Bottom Collision (backup)
                if (obj.y > playArea.clientHeight + 20) {
                    let zone = 'center';
                    const centerX = obj.x + (obj.width / 2);
                    
                    // แบ่งโซนตามตำแหน่ง X เพื่อส่งเข้าช่อง Left, Center, หรือ Right
                    if (centerX < playArea.clientWidth * 0.33) {
                        zone = 'left';
                    } else if (centerX > playArea.clientWidth * 0.66) {
                        zone = 'right';
                    } else {
                        zone = 'center';
                    }
                    
                    // ส่งวัตถุไปประมวลผลว่าลงช่องถูกหรือผิดตามกฎ (Rule)
                    handleSort(obj, zone);
                }
            }
        }   
    }
    gameLoopId = requestAnimationFrame(loop);
}

function createObjLoop() {
    if (state.isGameOver) return;
    
    if (!state.isFrozen) {
        // Spawn เพิ่มในช่วงท้ายเกม
        if (state.timeLeft <= 60) {
            spawnSingle();
            setTimeout(() => { 
                if(!state.isGameOver && !state.isFrozen) spawnSingle(); 
            }, 300);
        } else {
            spawnSingle();
        }
    }
    
    // ใช้ Dynamic Spawn Rate แทน linear
    const rate = getCurrentSpawnRate();
    state.spawnTime = setTimeout(createObjLoop, rate);
}

// Game Control
function startGame() {
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(loop);
    state = { 
        score: 0, 
        timeLeft: CONFIG.gameDuration, 
        currentRule: null, 
        objects: [], 
        isGameOver: false, 
        isFrozen: false, 
        elapsedTime: 0, 
        stats: { correct: 0, incorrect: 0 },
        
        // Reset Dynamic Difficulty
        difficultyMultiplier: 1.0,
        recentPerformance: [],
        lastAdjustTime: 0
    };
    
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    
    // ซ่อนปุ่มบนจอเมื่อเริ่มเกม
    document.getElementById('authButtonsContainer').style.display = 'none';
    document.getElementById('leaderboardButtonContainer').style.display = 'none';
    
    playArea.innerHTML = `
        <div class="gravity-well gravity-left"></div>
        <div class="gravity-well gravity-center trash"></div>
        <div class="gravity-well gravity-right"></div>
        <div class="zone-indicator zone-left">
            <span class="zone-text text-valid">ซ้าย</span>
            <div class="arrow-down arrow-valid"></div>
        </div>
        <div class="zone-indicator zone-center">
            <span class="zone-text text-trash">ทิ้ง</span>
            <div class="arrow-down arrow-trash"></div>
        </div>
        <div class="zone-indicator zone-right">
            <span class="zone-text text-valid">ขวา</span>
            <div class="arrow-down arrow-valid"></div>
        </div>
    `;
    
    scoreEl.textContent = '0';
    setRule(); 
    createObjLoop(); 
    
    state.timer = setInterval(() => {
        if (!state.isFrozen) {
            state.timeLeft--; 
            state.elapsedTime++;
            timeEl.textContent = state.timeLeft;
            if (state.timeLeft <= 0) endGame();
        }
    }, 1000);
}

function endGame() {
    state.isGameOver = true;
    clearInterval(state.timer);
    clearTimeout(state.spawnTime);
    clearTimeout(state.ruleTime);

    document.getElementById('end-screen').classList.remove('hidden');
    
    // แสดงปุ่มบนจอกลับมาเมื่อจบเกม
    document.getElementById('authButtonsContainer').style.display = 'flex';
    document.getElementById('leaderboardButtonContainer').style.display = 'block';

    const total = state.stats.correct + state.stats.incorrect;
    const accuracy = total > 0
        ? Math.round((state.stats.correct / total) * 100)
        : 0;

    document.getElementById('res-score').textContent = state.score;
    document.getElementById('res-acc').textContent = accuracy + '%';

    saveGame(state.score, accuracy);
}

// Event Listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);


// Initialize UI on load
updateUI();

// แสดงปุ่มบนจอตอนเริ่มต้น
document.getElementById('authButtonsContainer').style.display = 'flex';
document.getElementById('leaderboardButtonContainer').style.display = 'block';