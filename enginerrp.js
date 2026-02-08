/**
 * RELATIVE ROLEPLAY - ENGINE
 * 1. Fixed Modal: Data lengkap muncul
 * 2. Fixed Ads: Gambar dari custom user
 * 3. No Music: Fitur musik dihapus
 */

const API_URL = "http://localhost:3000/api"; 
const MAX_CHAR_SLOTS = 3;

// --- DATA REFERENSI ---
const JOB_NAMES = [
    "Unemployed", "Trucker", "Mechanic", "Bodyguard", "Farmer", 
    "Taxi Driver", "Smuggler", "Miner", "Pizza Stack", "Lumberjack", 
    "Trashmaster", "Street Sweeper"
];

const FACTION_NAMES = [
    "Civilian", "Police Dept (SAPD)", "FBI / Agency", 
    "Fire Dept (SAFD)", "News Network (SAN)", "Government"
];

// --- UTILITIES ---
function navigate(page) { window.location.href = page; }
function logout() { sessionStorage.clear(); navigate('login.html'); }
function checkSession() {
    const token = sessionStorage.getItem('rrp_token');
    if(!token) return navigate('login.html');
}

// --- ADS SLIDESHOW ---
const adImages = [
    "Hijau_dan_Cokelat_Modern_Ucapan_Hari_Raya_Idul_Fitri_Banner_2.jpg", 
    "https://prod-rockstar-games-cms.akamaized.net/d4e5/img/games/GTASA/1280x720.jpg",
    "https://images.hdqwalls.com/wallpapers/gta-san-andreas-remastered-4k-ue.jpg"
];
let currentAdIndex = 0;

function startAdSlideshow() {
    const adBg = document.getElementById('ad-widget-bg');
    if(!adBg) return;

    adBg.style.backgroundImage = `url('${adImages[0]}')`;

    setInterval(() => {
        currentAdIndex = (currentAdIndex + 1) % adImages.length;
        adBg.style.backgroundImage = `url('${adImages[currentAdIndex]}')`;
    }, 5000); 
}

// --- NAVIGASI ---
function showPage(pageId, element) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById('section-' + pageId);
    if(target) {
        target.classList.remove('hidden');
        target.classList.remove('fade-up');
        void target.offsetWidth; 
        target.classList.add('fade-up');
    }
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active', 'bg-cyan-600/10', 'text-cyan-400', 'border-r-2', 'border-cyan-400');
        link.classList.add('text-slate-400');
        const iconDiv = link.querySelector('div');
        if(iconDiv) iconDiv.classList.remove('bg-cyan-500/20');
    });
    if(element) {
        element.classList.remove('text-slate-400');
        element.classList.add('active', 'bg-cyan-600/10', 'text-cyan-400', 'border-r-2', 'border-cyan-400');
        const iconDiv = element.querySelector('div');
        if(iconDiv) iconDiv.classList.add('bg-cyan-500/20');
    }
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    // Login
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('button');
            const old = btn.innerHTML;
            btn.innerHTML = "Loading...";
            btn.disabled = true;

            const data = Object.fromEntries(new FormData(loginForm).entries());
            try {
                const res = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                
                if(result.success) {
                    sessionStorage.setItem('rrp_token', result.token);
                    sessionStorage.setItem('rrp_user', JSON.stringify(result.user));
                    navigate('dashboard.html');
                } else {
                    alert(result.message);
                    btn.disabled = false;
                    btn.innerHTML = old;
                }
            } catch (err) {
                console.warn("Server Offline, entering Demo Mode");
                sessionStorage.setItem('rrp_token', 'demo-token');
                sessionStorage.setItem('rrp_user', JSON.stringify({ucp: data.ucp_name}));
                navigate('dashboard.html');
            }
        });
    }

    if(window.location.pathname.includes('dashboard.html')) {
        startAdSlideshow();
        loadDashboard();
    }
});

// --- CORE DASHBOARD ---
async function loadDashboard() {
    checkSession();
    
    const user = JSON.parse(sessionStorage.getItem('rrp_user'));
    if(user && user.ucp) document.getElementById('user-name-display').innerText = user.ucp.toUpperCase();

    const tableBody = document.getElementById('player-table-body');
    const statTotal = document.getElementById('stat-total-chars');
    const slotIndicator = document.getElementById('slot-indicator');

    if(!tableBody) return;

    let chars = [];
    const token = sessionStorage.getItem('rrp_token');

    try {
        if(token === 'demo-token') {
            chars = [{ username: user.ucp, skin: 294, level: 1, money: 500, vip: 0, health: 100, bmoney: 0, job: 0, faction: 0 }];
        } else {
            const res = await fetch(`${API_URL}/characters`, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await res.json();
            if(result.success) chars = result.data;
        }
    } catch(e) { console.error(e); }

    const count = chars.length;
    if(statTotal) statTotal.innerHTML = `${count} <span class="text-sm text-slate-500 font-bold">/ ${MAX_CHAR_SLOTS} Slot</span>`;
    
    if(slotIndicator) {
        if(count >= MAX_CHAR_SLOTS) {
            slotIndicator.innerHTML = `<span class="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[9px] font-bold">FULL</span>`;
        } else {
            slotIndicator.innerHTML = `<span class="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-[9px] font-bold">AVAILABLE</span>`;
        }
    }

    if(count > 0) {
        tableBody.innerHTML = chars.map(p => {
            const charStr = encodeURIComponent(JSON.stringify(p));
            const skinUrl = `https://assets.open.mp/assets/images/skins/${p.skin}.png`;
            const name = p.username || p.name || "Unknown";

            return `
            <tr class="hover:bg-slate-900/60 transition-colors group border-b border-slate-800/50">
                <td class="px-8 py-4">
                    <div class="flex items-center">
                        <div class="h-14 w-14 bg-slate-800 rounded-xl mr-4 overflow-hidden border border-slate-700 shadow relative group-hover:border-cyan-500/50 transition-all">
                            <img src="${skinUrl}" class="h-24 max-w-none mx-auto -mt-2 group-hover:scale-110 transition-transform duration-500">
                        </div>
                        <div>
                            <div class="text-white font-bold text-sm tracking-wide uppercase group-hover:text-cyan-400 transition-colors">${name.replace('_', ' ')}</div>
                            <div class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Skin ID: ${p.skin}</div>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-4">
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-slate-300">Level ${p.level}</span>
                        <span class="text-green-400 font-mono font-black text-xs">$${p.money.toLocaleString()}</span>
                    </div>
                </td>
                <td class="px-8 py-4">
                    <span class="px-2 py-1 rounded text-[10px] font-bold ${p.vip > 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-700 text-slate-400'}">
                        ${p.vip > 0 ? 'VIP' : 'Citizen'}
                    </span>
                </td>
                <td class="px-8 py-4 text-right">
                    <button onclick="openModal('${charStr}')" class="p-2 bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-400 rounded-lg transition-all shadow hover:shadow-cyan-500/20">
                        <i data-lucide="scan-eye" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
        lucide.createIcons();
    } else {
        tableBody.innerHTML = `<tr><td colspan="4" class="p-10 text-center text-slate-500 text-xs">Belum ada karakter.</td></tr>`;
    }
}

// --- MODAL POPUP ---
function openModal(charString) {
    const char = JSON.parse(decodeURIComponent(charString));
    const skinUrl = `https://assets.open.mp/assets/images/skins/${char.skin}.png`;
    const name = char.username || char.name;

    document.getElementById('modal-name').innerText = name.replace('_', ' ');
    document.getElementById('modal-skin').src = skinUrl;
    document.getElementById('modal-level').innerText = "Lvl. " + char.level;
    document.getElementById('modal-age').innerText = char.age || "-";
    document.getElementById('modal-gender').innerText = (char.gender === 1 ? 'Laki-laki' : 'Perempuan');
    document.getElementById('modal-reg-date').innerText = char.reg_date || "-";

    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    document.getElementById('modal-cash').innerText = fmt.format(char.money);
    document.getElementById('modal-bank').innerText = fmt.format(char.bmoney || 0);
    document.getElementById('modal-norek').innerText = char.brek || "-";

    document.getElementById('modal-job').innerText = JOB_NAMES[char.job] || "Job " + char.job;
    const fName = FACTION_NAMES[char.faction] || "Civilian";
    document.getElementById('modal-faction').innerText = char.faction > 0 ? `${fName} (Rank ${char.factionrank})` : fName;

    const setBar = (idVal, idBar, val) => {
        if(document.getElementById(idVal)) document.getElementById(idVal).innerText = Math.round(val) + '%';
        if(document.getElementById(idBar)) document.getElementById(idBar).style.width = Math.round(val) + '%';
    };
    setBar('val-health', 'bar-health', char.health || 0);
    setBar('val-armor', 'bar-armor', char.armour || 0);
    setBar('val-hunger', 'bar-hunger', char.hunger || 0);

    document.getElementById('modal-warn').innerText = char.warn || 0;
    document.getElementById('modal-hours').innerText = (char.hours || 0) + 'h';
    document.getElementById('modal-last-login').innerText = char.last_login || "-";

    document.getElementById('character-modal').classList.remove('hidden');
    lucide.createIcons();
}

function closeModal() { document.getElementById('character-modal').classList.add('hidden'); }
function copyNorek() { navigator.clipboard.writeText(document.getElementById('modal-norek').innerText); alert("Tersalin!"); }