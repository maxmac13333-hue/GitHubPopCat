const cat = document.getElementById('cat');
const scoreDisplay = document.getElementById('score');
const popSound = document.getElementById('pop-sound');
let count = 0;
let playerLocation = null;
let isLocationLoaded = false;
let map;
let showAll = false;

// 1. เชื่อมต่อ Supabase
const SUPABASE_URL = 'https://rtfltqeakqlyicygbjrn.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0Zmx0cWVha3FseWljeWdianJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzA2NTksImV4cCI6MjA4ODY0NjY1OX0.OBCd3GW9TMqSzWWhGDpmQeypn8OnrhXzbGtbpKNwMyg'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. แผนที่
function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView([20, 0], 1);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
}

// 3. ปักหมุดคนอื่น
function addPopMarker(lat, lon, isOther = false) {
    if(!map) return;
    const marker = L.circleMarker([lat, lon], {
        radius: isOther ? 5 : 8, 
        fillColor: isOther ? "#ffffff" : "#ffcc00", 
        color: "#fff", weight: 1, opacity: 1, fillOpacity: 0.8
    }).addTo(map);
    setTimeout(() => map.removeLayer(marker), 800);
}

// 4. ดึงข้อมูลพิกัดคนอื่น
async function fetchRealClicks() {
    try {
        const { data } = await _supabase.from('locations').select('lat, lon').limit(5);
        if (data) data.forEach(p => { if (p.lat && p.lon) addPopMarker(p.lat, p.lon, true); });
    } catch (e) {}
}

// 5. ดึง IP (แก้ใหม่ให้เสถียรขึ้น)
async function fetchLocation() {
    if (isLocationLoaded) return;
    try {
        const res = await fetch('https://ipapi.co/json/'); // หรือใช้ http://ip-api.com/json/
        const data = await res.json();

        playerLocation = {
            ip_address: data.ip || data.query,
            country: data.country_name || data.country,
            country_code: data.country_code || data.countryCode,
            lat: data.latitude || data.lat,
            lon: data.longitude || data.lon
        };

        isLocationLoaded = true;
        const flagUrl = `https://flagcdn.com/w40/${playerLocation.country_code.toLowerCase()}.png`;
        document.getElementById('ip-display').innerHTML = `
            <img src="${flagUrl}" width="18"> ${playerLocation.country} | IP: ${playerLocation.ip_address}
        `;
        
        map.setView([playerLocation.lat, playerLocation.lon], 3); 
        updateLeaderboard();
        setInterval(fetchRealClicks, 4000); 
    } catch (e) { console.error("IP Load Fail", e); }
}

// 6. ระบบ Pop (แก้ปากขยับ + ปิดจุดเหลือง)
function pop(e) {
    if (e) e.preventDefault();
    popSound.cloneNode().play().catch(()=>{});
    count++;
    scoreDisplay.innerText = count.toLocaleString();
    
    // ตรวจสอบนามสกุลไฟล์ใน GitHub อีกรอบนะคะ ถ้าเป็น .jpeg ให้แก้ตามนี้
    cat.src = "Pop02.jpeg"; 

    if(playerLocation) {
        // addPopMarker(playerLocation.lat, playerLocation.lon, false); // ปิดตามที่พี่ขอค่ะ
        logPlayerInfo();
    }
}

function unpop() { cat.src = "Pop01.jpeg"; }

// 7. ส่งข้อมูล (ต้องไปตั้ง Primary Key ใน Supabase ด้วยนะคะ!)
async function logPlayerInfo() {
    if (!playerLocation) return;
    try {
        const { data } = await _supabase.from('locations').select('score').eq('country', playerLocation.country).maybeSingle();
        let currentScore = data ? data.score : 0;
        await _supabase.from('locations').upsert({ 
            country: playerLocation.country, 
            country_code: playerLocation.country_code,
            lat: playerLocation.lat, lon: playerLocation.lon,
            score: currentScore + 1 
        }, { onConflict: 'country' });
    } catch (err) {}
}

// 8. Leaderboard
async function updateLeaderboard() {
    try {
        const { data } = await _supabase.from('locations').select('*').order('score', { ascending: false });
        if (!data) return;
        const listDiv = document.getElementById('leaderboard-list');
        listDiv.innerHTML = '';
        data.forEach((item, index) => {
            if (showAll || index < 10) {
                const flagUrl = `https://flagcdn.com/w20/${item.country_code.toLowerCase()}.png`;
                listDiv.innerHTML += `
                    <div class="rank-row">
                        <span>${index + 1}. <img src="${flagUrl}" width="16"> ${item.country}</span>
                        <b>${parseInt(item.score).toLocaleString()}</b>
                    </div>`;
            }
        });
    } catch (e) {}
}

function toggleViewAll() {
    showAll = !showAll;
    document.querySelector('.view-all-btn').innerText = showAll ? "Show Top 10 △" : "View All ▽";
    updateLeaderboard();
}

cat.addEventListener('mousedown', pop);
cat.addEventListener('mouseup', unpop);
cat.addEventListener('touchstart', pop, {passive: false});
cat.addEventListener('touchend', unpop, {passive: false});

initMap(); fetchLocation(); setInterval(updateLeaderboard, 5000);
