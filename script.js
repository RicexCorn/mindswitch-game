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
const accountBtn = document.getElementById("accountBtn");
const closeAuth = document.getElementById("closeAuth");

const authLoggedOut = document.getElementById("authLoggedOut");
const authLoggedIn = document.getElementById("authLoggedIn");
const welcomeText = document.getElementById("welcomeText");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const viewProfileBtn = document.getElementById("viewProfileBtn");


/* =========================================
   3. AUTH SYSTEM
========================================= */

async function updateUI() {
    const { data } = await supabaseClient.auth.getUser();
    const user = data.user;

    if (user) {
        authLoggedOut.classList.add("hidden");
        authLoggedIn.classList.remove("hidden");

        const username = user.email.replace("@school.local", "");
        welcomeText.textContent = `Welcome, ${username}`;
    } else {
        authLoggedOut.classList.remove("hidden");
        authLoggedIn.classList.add("hidden");
    }
}

async function register() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

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
    updateUI();
}

async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

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

    overlay.classList.add("hidden");
    updateUI();
}

async function logout() {
    await supabaseClient.auth.signOut();
    updateUI();
}


/* =========================================
   4. PROFILE / DATABASE
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

async function loadHistory() {
    const { data } = await supabaseClient
        .from("game_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

    console.log(data);
}


/* =========================================
   5. EVENT LISTENERS
========================================= */

accountBtn.onclick = async () => {
    overlay.classList.remove("hidden");
    await updateUI();
};

closeAuth.onclick = () => {
    overlay.classList.add("hidden");
};

loginBtn.onclick = login;
registerBtn.onclick = register;
logoutBtn.onclick = logout;

viewProfileBtn.onclick = () => {
    overlay.classList.add("hidden");
    openProfile(); // ใช้ของคุณ
};

/* =========================================*/
const CONFIG = {
    gameDuration: 150,
    ruleVisibleTime: 6000,
    ruleChangeWarning: 3000,
    freezeDuration: 2500,
    
    // Dynamic Difficulty Settings
    initialSpawnRate: 2200,      // เริ่มช้า สำหรับ warm-up
    minSpawnRate: 900,           // เร็วสุดในช่วงท้าย
    maxSpawnRate: 2500,          // spawn ช้าสุดเมื่อเล่นแย่
    
    initialSpeed: 1.5,           // เริ่มช้า สำหรับ warm-up
    maxSpeed: 5.5,               // เร็วสุดในช่วงท้าย
    minSpeed: 1.2,               // ช้าสุดเมื่อเล่นแย่
    
    // Flow State Tuning (ปรับตาม performance)
    targetAccuracy: 0.75,        // เป้าหมายความแม่นยำ 75%
    difficultyAdjustSpeed: 0.3,  // ความเร็วในการปรับความยาก (0-1)
    
    // Sigmoid Curve Parameters
    speedCurveMidpoint: 0.4,     // จุดกลางของ S-curve (0-1)
    speedCurveSteepness: 10,     // ความชันของ curve - เร่งเร็ว
    
    // Physics Config
    friction: 0.92,
    throwForce: 1.5,
    
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
    } catch(e) {}
}

// Helper Functions
// Triangle shape now uses CSS borders instead of SVG

// ========== DYNAMIC DIFFICULTY SYSTEM ==========

/**
 * Sigmoid Curve: ให้ความเร็วเพิ่มแบบ S-curve แทน linear
 * - ช่วงแรก: เพิ่มช้าๆ ให้ผู้เล่นคุ้นเคย
 * - ช่วงกลาง: เพิ่มเร็วขึ้น (sweet spot)
 * - ช่วงท้าย: เพิ่มช้าลง ไม่ให้ chaotic
 */
function sigmoidCurve(progress) {
    // progress = 0 ถึง 1 (เวลาที่ผ่านไป)
    const k = CONFIG.speedCurveSteepness;
    const mid = CONFIG.speedCurveMidpoint;
    
    // Sigmoid formula: 1 / (1 + e^(-k*(x - mid)))
    const x = progress - mid;
    return 1 / (1 + Math.exp(-k * x));
}

/**
 * คำนวณ Accuracy ล่าสุด (10 ครั้งล่าสุด)
 */
function getRecentAccuracy() {
    if (state.recentPerformance.length === 0) return CONFIG.targetAccuracy;
    
    const correct = state.recentPerformance.filter(x => x === true).length;
    return correct / state.recentPerformance.length;
}

/**
 * ปรับความยากแบบ Dynamic ตาม Performance ของผู้เล่น
 * - เล่นดี (Accuracy สูง) → เพิ่มความยาก
 * - เล่นแย่ (Accuracy ต่ำ) → ลดความยาก
 */
function adjustDifficulty() {
    // ปรับทุก 3 วินาที
    if (state.elapsedTime - state.lastAdjustTime < 3) return;
    state.lastAdjustTime = state.elapsedTime;
    
    const accuracy = getRecentAccuracy();
    const target = CONFIG.targetAccuracy;
    
    // คำนวณส่วนต่างจากเป้าหมาย
    const diff = accuracy - target;
    
    // ปรับ difficulty multiplier
    const adjustment = diff * CONFIG.difficultyAdjustSpeed;
    state.difficultyMultiplier += adjustment;
    
    // จำกัดไว้ในช่วง 0.5 ถึง 1.5
    state.difficultyMultiplier = Math.max(0.5, Math.min(1.5, state.difficultyMultiplier));
    
    // Debug (ถ้าต้องการ)
    // console.log(`Accuracy: ${(accuracy*100).toFixed(0)}% | Target: ${(target*100).toFixed(0)}% | Difficulty: ${state.difficultyMultiplier.toFixed(2)}x`);
}

/**
 * คำนวณความเร็วแบบ Sigmoid + Dynamic
 */
function getCurrentSpeed() {
    // Warm-up period: 15 วินาทีแรก (ช่วงกฎแรก)
    const warmupDuration = 15;
    
    if (state.elapsedTime <= warmupDuration) {
        // ช่วง warm-up: ใช้ความเร็วต่ำ
        return CONFIG.initialSpeed;
    }
    
    // หลัง warm-up: เร่งความยากขึ้นเรื่อยๆ
    const postWarmupTime = state.elapsedTime - warmupDuration;
    const remainingTime = CONFIG.gameDuration - warmupDuration;
    const progress = Math.min(postWarmupTime / remainingTime, 1);
    
    const sigmoidValue = sigmoidCurve(progress);
    
    // ความเร็วพื้นฐานจาก time progression
    const baseSpeed = CONFIG.initialSpeed + (CONFIG.maxSpeed - CONFIG.initialSpeed) * sigmoidValue;
    
    // ปรับตาม difficulty multiplier
    const adjustedSpeed = CONFIG.initialSpeed + (baseSpeed - CONFIG.initialSpeed) * state.difficultyMultiplier;
    
    // จำกัดให้อยู่ในช่วงที่กำหนด
    return Math.max(CONFIG.minSpeed, Math.min(CONFIG.maxSpeed, adjustedSpeed));
}

/**
 * คำนวณ Spawn Rate แบบ Dynamic ตาม Score และ Performance
 */
function getCurrentSpawnRate() {
    // Warm-up period: 15 วินาทีแรก (ช่วงกฎแรก)
    const warmupDuration = 15;
    
    if (state.elapsedTime <= warmupDuration) {
        // ช่วง warm-up: spawn ช้า
        return CONFIG.initialSpawnRate;
    }
    
    // หลัง warm-up: spawn เร็วขึ้นเรื่อยๆ
    const postWarmupTime = state.elapsedTime - warmupDuration;
    const remainingTime = CONFIG.gameDuration - warmupDuration;
    const progress = Math.min(postWarmupTime / remainingTime, 1);
    
    const sigmoidValue = sigmoidCurve(progress);
    
    // Spawn rate พื้นฐาน (ยิ่งเล่นนาน ยิ่ง spawn เร็ว)
    const baseRate = CONFIG.initialSpawnRate - (CONFIG.initialSpawnRate - CONFIG.minSpawnRate) * sigmoidValue;
    
    // ปรับตาม difficulty multiplier
    // ยิ่ง difficulty สูง ยิ่ง spawn เร็ว (rate ต่ำ)
    const adjustedRate = baseRate / state.difficultyMultiplier;
    
    // จำกัดให้อยู่ในช่วงที่กำหนด
    return Math.max(CONFIG.minSpawnRate, Math.min(CONFIG.maxSpawnRate, adjustedRate));
}

/**
 * บันทึก Performance (เรียกตอนจัดของแต่ละชิ้น)
 */
function recordPerformance(isCorrect) {
    state.recentPerformance.push(isCorrect);
    
    // เก็บแค่ 10 ครั้งล่าสุด
    if (state.recentPerformance.length > 10) {
        state.recentPerformance.shift();
    }
    
    // ปรับความยาก
    adjustDifficulty();
}

// ========== END DYNAMIC DIFFICULTY SYSTEM ==========

function createParticles(x, y, color) {
    // ลดจาก 12 เป็น 4 particles - less visual noise
    for (let i = 0; i < 4; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.backgroundColor = color;
        p.style.width = '6px'; 
        p.style.height = '6px';
        p.style.left = x + 'px'; 
        p.style.top = y + 'px';
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 40 + 15; // ลดระยะทางการกระเด็น
        p.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 0.7 },
            { transform: `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) scale(0)`, opacity: 0 }
        ], { duration: 400, easing: 'ease-out' }).onfinish = () => p.remove(); // เร็วขึ้น
        playArea.appendChild(p);
    }
    
    // เพิ่ม subtle glow effect แทน particles เยอะๆ
    const glow = document.createElement('div');
    glow.style.position = 'absolute';
    glow.style.left = (x - 10) + 'px';
    glow.style.top = (y - 10) + 'px';
    glow.style.width = '50px';
    glow.style.height = '50px';
    glow.style.borderRadius = '50%';
    glow.style.background = `radial-gradient(circle, ${color}40 0%, transparent 70%)`;
    glow.style.pointerEvents = 'none';
    glow.style.zIndex = '199';
    playArea.appendChild(glow);
    
    glow.animate([
        { transform: 'scale(0.5)', opacity: 0.8 },
        { transform: 'scale(1.5)', opacity: 0 }
    ], { duration: 500, easing: 'ease-out' }).onfinish = () => glow.remove();
}

function showFloatingText(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.color = color;
    el.style.left = x + 'px'; 
    el.style.top = y + 'px';
    playArea.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

// Rule Generators
const ruleGens = [
    { type: 'color', gen: () => {
        const c = [...CONFIG.colors].sort(() => Math.random() - 0.5);
        return { type: 'color', left: c[0], right: c[1], text: `${c[0].name} | ${c[1].name}` };
    }},
    { type: 'shape', gen: () => {
        const s = [...CONFIG.shapes].sort(() => Math.random() - 0.5);
        const n = { circle: 'วงกลม', square: 'สี่เหลี่ยม', triangle: 'สามเหลี่ยม' };
        return { type: 'shape', left: s[0], right: s[1], text: `${n[s[0]]} | ${n[s[1]]} ` };
    }},
    { type: 'label', gen: () => {
        const l = [...CONFIG.labels].sort(() => Math.random() - 0.5);
        return { type: 'label', left: l[0], right: l[1], text: `${l[0]} | ${l[1]} ` };
    }}
];

// Pop all objects with animation and sound effect
function popAllObjects() {
    // สร้างสำเนาของ array เพื่อป้องกันปัญหาจาก concurrent modification
    const objectsToRemove = [...state.objects];
    
    objectsToRemove.forEach((obj, index) => {
        // Delay แต่ละ object เล็กน้อยเพื่อให้ดูเป็น cascade effect
        setTimeout(() => {
            if (!obj.el || !obj.el.parentNode) return; // Skip ถ้า element ถูกลบไปแล้ว
            
            // เล่นเสียง pop (แต่ละตัวจะมีเสียงสูงต่างกันเล็กน้อย)
            const freq = 800 + (index * 50) + Math.random() * 100;
            playTone(freq, 'sine', 0.08, 0.06);
            
            // เพิ่ม animation class
            obj.el.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            obj.el.style.transform = 'scale(0) rotate(180deg)';
            obj.el.style.opacity = '0';
            
            // สร้าง particle effect เล็กๆ
            const objCenterX = obj.x + (obj.el.offsetWidth / 2);
            const objCenterY = obj.y + (obj.el.offsetHeight / 2);
            
            // Particle effect แบบเล็กๆ (2 particles ต่อ object)
            for (let i = 0; i < 2; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.backgroundColor = obj.color.hex;
                p.style.width = '4px';
                p.style.height = '4px';
                p.style.left = objCenterX + 'px';
                p.style.top = objCenterY + 'px';
                
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 25 + 10;
                
                p.animate([
                    { transform: 'translate(0, 0) scale(1)', opacity: 0.8 },
                    { transform: `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) scale(0)`, opacity: 0 }
                ], { duration: 300, easing: 'ease-out' }).onfinish = () => p.remove();
                
                playArea.appendChild(p);
            }
            
            // สร้าง spark effect (ประกายไฟ 8 เส้น)
            for (let i = 0; i < 8; i++) {
                const spark = document.createElement('div');
                spark.className = 'spark';
                spark.style.left = objCenterX + 'px';
                spark.style.top = objCenterY + 'px';
                
                const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.2; // กระจาย 8 ทิศทาง
                const length = Math.random() * 35 + 30; // ความยาวของประกาย 30-65px
                
                const endX = Math.cos(angle) * length;
                const endY = Math.sin(angle) * length;
                
                // สร้างเส้นประกาย
                spark.style.width = '3px';
                spark.style.height = length + 'px';
                spark.style.background = `linear-gradient(to bottom, ${obj.color.hex}, transparent)`;
                spark.style.transformOrigin = 'top center';
                spark.style.transform = `rotate(${angle}rad)`;
                
                spark.animate([
                    { 
                        opacity: 1, 
                        transform: `rotate(${angle}rad) translateY(0) scaleY(1)`,
                        filter: 'brightness(2.5)'
                    },
                    { 
                        opacity: 0, 
                        transform: `rotate(${angle}rad) translateY(${length * 0.6}px) scaleY(0.2)`,
                        filter: 'brightness(0.5)'
                    }
                ], { 
                    duration: 350 + Math.random() * 150, 
                    easing: 'ease-out' 
                }).onfinish = () => spark.remove();
                
                playArea.appendChild(spark);
            }
            
            // ลบ element หลังจาก animation เสร็จ
            setTimeout(() => {
                if (obj.el && obj.el.parentNode) {
                    obj.el.remove();
                }
            }, 300);
            
        }, index * 30); // Cascade delay 30ms ต่อ object
    });
    
    // Clear objects array
    state.objects = [];
}

function setRule() {
    if (state.isGameOver) return;
    
    state.isFrozen = true;
    freezeOverlay.classList.remove('hidden');
    gameContainer.classList.add('is-frozen');
    playTone(440, 'sine', 0.2, 0.1);

    const r = ruleGens[Math.floor(Math.random() * ruleGens.length)].gen();
    state.currentRule = r;
    ruleEl.textContent = r.text;
    ruleEl.classList.remove('hidden-rule');

    setTimeout(() => {
        state.isFrozen = false;
        freezeOverlay.classList.add('hidden');
        gameContainer.classList.remove('is-frozen');
        
        // Pop วัตถุทั้งหมดหลังจาก unfreeze 1 วินาที
        setTimeout(() => {
            if (!state.isGameOver) {
                popAllObjects();
            }
        }, 1000);
        
        clearTimeout(state.hideTime);
        state.hideTime = setTimeout(() => { 
            if(!state.isGameOver && !state.isFrozen) ruleEl.classList.add('hidden-rule'); 
        }, CONFIG.ruleVisibleTime);

        const nextInterval = Math.random() * 5000 + 12000;
        state.ruleTime = setTimeout(() => {
            startRuleWarning();
        }, nextInterval - CONFIG.ruleChangeWarning);
        
    }, CONFIG.freezeDuration);
}

function startRuleWarning() {
    if (state.isGameOver || state.isFrozen) return;
    
    ruleWarningBar.style.transition = 'none';
    ruleWarningBar.style.transform = 'scaleX(0)';
    setTimeout(() => {
        ruleWarningBar.style.transition = `transform ${CONFIG.ruleChangeWarning}ms linear`;
        ruleWarningBar.style.transform = 'scaleX(1)';
    }, 20);

    alertEl.classList.add('animate-alert');
    playTone(330, 'triangle', 0.4, 0.08);
    setTimeout(() => alertEl.classList.remove('animate-alert'), 1000);

    setTimeout(() => {
        ruleWarningBar.style.transform = 'scaleX(0)';
        setRule();
    }, CONFIG.ruleChangeWarning);
}

// Object Spawning
function spawnSingle() {
    if (state.isFrozen) return;
    const c = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
    const s = CONFIG.shapes[Math.floor(Math.random() * CONFIG.shapes.length)];
    const l = CONFIG.labels[Math.floor(Math.random() * CONFIG.labels.length)];
    const el = document.createElement('div');
    el.className = `game-object shape-${s}`;
    
    // Store color in data attribute for triangles
    if (s === 'triangle') {
        el.dataset.color = c.hex;
        el.style.setProperty('--triangle-color', c.hex);
    } else {
        el.style.backgroundColor = c.hex;
    }
    el.textContent = l;

    const x = Math.random() * (playArea.clientWidth - 90) + 10;
    el.style.left = x + 'px'; 
    el.style.top = '-90px';
    
    const obj = { 
        el, x, y: -90, 
        vx: 0, vy: 0, 
        color: c, shape: s, label: l, 
        dragging: false,
        beingSucked: false,
        lastX: x, lastY: -90,
        grabOffsetX: 0,
        grabOffsetY: 0
    };


    const onStart = (e) => {
        if (state.isFrozen || obj.beingSucked) return;
        obj.dragging = true;
        obj.vx = 0; obj.vy = 0;
        
        const rect = playArea.getBoundingClientRect();
        const cx = e.clientX;
        const cy = e.clientY;

        const currentX = cx - rect.left;
        const currentY = cy - rect.top;

        // จำระยะที่กดภายในวัตถุ
        obj.grabOffsetX = currentX - obj.x;
        obj.grabOffsetY = currentY - obj.y;

        obj.lastX = currentX;
        obj.lastY = currentY;


        el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
    };

    const onMove = (e) => {
        if (!obj.dragging || state.isFrozen || obj.beingSucked) return;
        const rect = playArea.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        
        const currentX = cx - rect.left;
        const currentY = cy - rect.top;

        obj.vx = ((currentX - obj.lastX) / 16.67) * CONFIG.throwForce;
        obj.vy = ((currentY - obj.lastY) / 16.67) * CONFIG.throwForce;

        const maxVelocity = 25;
        obj.vx = Math.max(-maxVelocity, Math.min(maxVelocity, obj.vx));
        obj.vy = Math.max(-maxVelocity, Math.min(maxVelocity, obj.vy));

        
        obj.lastX = currentX;
        obj.lastY = currentY;

        // คำนวณ offset สำหรับแต่ละรูปร่าง
        obj.x = currentX - obj.grabOffsetX;
        obj.y = currentY - obj.grabOffsetY;

        
        requestAnimationFrame(() => {
            el.style.left = obj.x + 'px'; 
            el.style.top = obj.y + 'px';
        });
    };

    const onEnd = (e) => {
        if (!obj.dragging) return;
        obj.dragging = false; 
        el.classList.remove('dragging');
        obj.vx *= 0.7;
        obj.vy *= 0.7;
    };

    el.addEventListener('pointerdown', onStart);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onEnd);
    el.addEventListener('pointercancel', onEnd);

    playArea.appendChild(el);
    state.objects.push(obj);
}

// Sorting Logic
function handleSort(obj, zone) {
    const r = state.currentRule;
    let result = '';

    let target = null;
    if (r.type === 'color') {
        if (obj.color.name === r.left.name) target = 'left';
        else if (obj.color.name === r.right.name) target = 'right';
    } else if (r.type === 'shape') {
        if (obj.shape === r.left) target = 'left';
        else if (obj.shape === r.right) target = 'right';
    } else if (r.type === 'label') {
        if (obj.label === r.left) target = 'left';
        else if (obj.label === r.right) target = 'right';
    }

    if (zone === 'left') {
        if (target === 'left') result = 'correct';
        else result = 'incorrect';
    } else if (zone === 'right') {
        if (target === 'right') result = 'correct';
        else result = 'incorrect';
    } else if (zone === 'center') {
        if (target === null) result = 'trash-correct';
        else result = 'trash-incorrect';
    }

    // บันทึก Performance สำหรับ Dynamic Difficulty
    const isCorrect = (result === 'correct' || result === 'trash-correct');
    recordPerformance(isCorrect);

    if (result === 'correct') {
        state.score += 5; state.stats.correct++;
        playTone(850, 'sine', 0.1, 0.1);
        setTimeout(() => {
            playTone(1100, 'sine', 0.1, 0.1);
        }, 80);
        createParticles(obj.x + 30, obj.y + 30, obj.color.hex);
        showFloatingText(obj.x, playArea.clientHeight - 80, "+5", "#6AB187"); // Medical Green
    } else if (result === 'incorrect') {
        state.score = Math.max(0, state.score - 2); state.stats.incorrect++;
        playTone(180, 'sawtooth', 0.15, 0.08);
        showFloatingText(obj.x, playArea.clientHeight - 80, "-2", "#D67C7C"); // Soft Red
    } else if (result === 'trash-correct') {
        state.score += 1;
        playTone(850, 'sine', 0.1, 0.1);
        setTimeout(() => {
            playTone(1100, 'sine', 0.1, 0.1);
        }, 80);
        showFloatingText(obj.x, playArea.clientHeight - 80, "+1", "#5B8FB9"); // Medical Blue
    } else if (result === 'trash-incorrect') {
        state.score = Math.max(0, state.score - 2); state.stats.incorrect++;
        playTone(180, 'sawtooth', 0.15, 0.08);
        showFloatingText(obj.x, playArea.clientHeight - 80, "-2", "#D67C7C"); // Soft Red
    }

    obj.el.remove();
    scoreEl.textContent = state.score;
    state.objects = state.objects.filter(o => o !== obj);
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
    
    const objCenterX = obj.x + (obj.el.offsetWidth / 2);
    const objCenterY = obj.y + (obj.el.offsetHeight / 2);
    
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
                
                // ดูดลงไปข้างล่างนอกจอ (ไม่ใช่ไปที่จุดกลาง)
                const suckDuration = 500;
                const startX = obj.x;
                const startY = obj.y;
                const startTime = Date.now();
                
                // จุดปลายทาง: ตรงแนวเดิมของ X แต่ลงไปข้างล่างนอกจอ
                const targetX = gp.x - obj.el.offsetWidth/2; // ตรงแนว X ของ gravity point
                const targetY = height + 100; // ลงไปข้างล่างนอกจอ
                
                const suckInterval = setInterval(() => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / suckDuration, 1);
                    
                    // Ease-in cubic สำหรับความเร็วเพิ่มขึ้นเรื่อยๆ
                    const eased = progress * progress * progress;
                    
                    obj.x = startX + (targetX - startX) * eased;
                    obj.y = startY + (targetY - startY) * eased;
                    
                    obj.el.style.left = obj.x + 'px';
                    obj.el.style.top = obj.y + 'px';
                    
                    if (progress >= 1) {
                        clearInterval(suckInterval);
                        handleSort(obj, gp.zone);
                    }
                }, 16);
                
                return true;
            }
            
            // ดึงเบาๆ เมื่ออยู่ในรัศมี
            if (!obj.beingSucked) {
                const pullX = (dx / distance) * strength * CONFIG.gravityStrength;
                const pullY = (dy / distance) * strength * CONFIG.gravityStrength;
                
                obj.vx += pullX;
                obj.vy += pullY;
            }
        }
    }
    
    return false;
}

let lastTime = performance.now();
// Main Game Loop
function loop(now) {
    const delta = (now - lastTime) / 16.67; 
    lastTime = now;
    if (state.isGameOver) return;
    
    if (!state.isFrozen) {
        // ใช้ Sigmoid Curve + Dynamic Difficulty แทน linear
        const currentSpeed = getCurrentSpeed();
        
        state.objects.forEach(obj => {
            if (obj.beingSucked) return;
            
            if (!obj.dragging) {
                // Apply Gravity Wells
                const sucked = applyGravity(obj);
                if (sucked) return;
                
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
                } else if (obj.x >= playArea.clientWidth - obj.el.offsetWidth) {
                    obj.x = playArea.clientWidth - obj.el.offsetWidth;
                    obj.vx = -Math.abs(obj.vx) * 0.1;
                    if(obj.vx < -2) obj.vx = -2;
                }

                obj.el.style.left = obj.x + 'px';
                obj.el.style.top = obj.y + 'px';
                
                // Bottom Collision (backup)
                if (obj.y > playArea.clientHeight + 20) {
                    const width = playArea.clientWidth;
                    let zone = 'center';
                    
                    const centerX = obj.x + (obj.el.offsetWidth / 2);
                    if (centerX < width * 0.33) zone = 'left';
                    else if (centerX > width * 0.66) zone = 'right';
                    
                    handleSort(obj, zone);
                }
            }
        });
    }
    requestAnimationFrame(loop);
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
    loop();
    
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


updateUI();
