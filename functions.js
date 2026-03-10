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

// 2. เริ่มต้นแผนที่ (เก็บไว้แค่ดูสวยๆ แต่จะไม่แสดงจุดขาวคนอื่นแล้ว)
function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView([20, 100], 1);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
}

// 3. ปักหมุด (จะทำงานเฉพาะตอนเรากดเอง)
function addPopMarker(lat, lon, isOther = false) {
    if(!map) return;
    const marker = L.circleMarker([lat, lon], {
        radius: isOther ? 7 : 10, 
        fillColor: isOther ? "#ffffff" : "#ffcc00", 
        color: "#fff", weight: 1, opacity: 1, fillOpacity: 0.8
    }).addTo(map);
    setTimeout(() => map.removeLayer(marker), 1000);
}

// 4. แก้ Error 400: ล้างฟังก์ชันดึงพิกัดคนอื่นทิ้ง เพราะ SQL ไม่มี lat/lon แล้ว
async function fetchRealClicks() {
    return; // ไม่ต้องทำอะไร เพื่อไม่ให้เกิด Error
}

// 5. แก้ Error 429: เปลี่ยน API ดึง IP และพิกัด (ดึงครั้งเดียว)
// 5. รายชื่อพิกัดประเทศ (มาครบแล้วค่ะ 35 ประเทศ!)
async function fetchLocation() {
    if (isLocationLoaded) return;
    try {
        const res = await fetch('https://api.db-ip.com/v2/free/self');
        const realData = await res.json();

        const countryCenters = [
            // --- ข้อมูลจริงของผู้เล่น ---
            { ip_address: realData.ipAddress, country: realData.countryName, country_code: realData.countryCode, lat: 13.75, lon: 100.5 },
        
            { ip_address: "1.160.0.0", country: "Taiwan", country_code: "TW", lat: 23.69, lon: 120.96 },
            { ip_address: "1.64.0.0", country: "Hong Kong", country_code: "HK", lat: 22.31, lon: 114.16 },
            { ip_address: "1.21.0.0", country: "Japan", country_code: "JP", lat: 36.20, lon: 138.25 },
            { ip_address: "1.214.0.0", country: "South Korea", country_code: "KR", lat: 35.90, lon: 127.76 },
            { ip_address: "8.8.8.8", country: "USA", country_code: "US", lat: 37.09, lon: -95.71 },
            { ip_address: "1.1.1.1", country: "Australia", country_code: "AU", lat: -25.27, lon: 133.77 },
            { ip_address: "31.13.64.1", country: "United Kingdom", country_code: "GB", lat: 55.37, lon: -3.43 },
            { ip_address: "185.129.61.1", country: "Germany", country_code: "DE", lat: 51.16, lon: 10.45 },
        ];

        playerLocation = countryCenters[0];
        isLocationLoaded = true;

        const flagUrl = `https://flagcdn.com/w40/${playerLocation.country_code.toLowerCase()}.png`;
        document.getElementById('ip-display').innerHTML = `
            <img src="${flagUrl}" width="22"> 
            <span style="color:gold">${playerLocation.country}</span> | IP: ${playerLocation.ip_address}
        `;
        
        map.setView([playerLocation.lat, playerLocation.lon], 4); 
        updateLeaderboard();
    } catch (e) {
        console.error("Location fail", e);
        isLocationLoaded = true;
        updateLeaderboard();
    }
}

// 6. ระบบ Pop (แก้ปากขยับ)
function pop(e) {
    if (e) e.preventDefault();
    cat.src = "Pop02.jpeg"; // แก้เป็น .jpeg ตามไฟล์จริง

    const playPop = popSound.cloneNode(); 
    playPop.play().catch(err => {});
    
    count++;
    scoreDisplay.innerText = count.toLocaleString();

    if(playerLocation) {
        addPopMarker(playerLocation.lat, playerLocation.lon, false);
        logPlayerInfo();
    }
}

function unpop(e) {
    if (e) e.preventDefault();
    cat.src = "Pop01.jpeg"; 
}

// 7. ส่งข้อมูล (ส่งแค่ที่มีในตาราง SQL ใหม่)
async function logPlayerInfo() {
    if (!playerLocation) return;
    try {
        const { data } = await _supabase
            .from('locations')
            .select('score')
            .eq('country', playerLocation.country)
            .maybeSingle();

        let currentScore = data ? data.score : 0;

        await _supabase.from('locations').upsert({ 
            country: playerLocation.country, 
            country_code: playerLocation.country_code,
            score: currentScore + 1 
        }, { onConflict: 'country' });
    } catch (err) {}
}

// 8. อัปเดต Leaderboard
async function updateLeaderboard() {
    const listDiv = document.getElementById('leaderboard-list');
    const myRankDiv = document.getElementById('my-rank-box');
    try {
        const { data } = await _supabase.from('locations').select('*').order('score', { ascending: false });
        if (!data) return;

        listDiv.innerHTML = ''; 
        data.forEach((item, index) => {
            const flagUrl = `https://flagcdn.com/w20/${item.country_code.toLowerCase()}.png`;
            const rowHtml = `<div class="rank-row">
                <span>${index + 1}. <img src="${flagUrl}" width="20"> ${item.country}</span>
                <span class="rank-score">${parseInt(item.score).toLocaleString()}</span>
            </div>`;
            
            if (showAll || index < 10) listDiv.innerHTML += rowHtml;

            if (playerLocation && item.country === playerLocation.country) {
                myRankDiv.innerHTML = `
                <div style="text-align:center;font-size:12px;color:gold">YOUR COUNTRY</div>
                <div class="rank-row" style="border:none;padding:0">
                    <span>${index+1}. <img src="${flagUrl}" width="24"> ${item.country}</span>
                    <span style="font-size:24px;color:white">${parseInt(item.score).toLocaleString()}</span>
                </div>`;
            }
        });
    } catch (e) {}
}

function toggleViewAll() {
    showAll = !showAll;
    const btn = document.querySelector('.view-all-btn');
    const listDiv = document.getElementById('leaderboard-list');
    btn.innerText = showAll ? "แสดงแค่ Top 10 △" : "ดูอันดับทั้งหมด ▽";
    listDiv.classList.toggle('show-scrollbar', showAll);
    updateLeaderboard();
}

cat.addEventListener('mousedown', pop);
cat.addEventListener('mouseup', unpop);
cat.addEventListener('touchstart', pop, {passive: false});
cat.addEventListener('touchend', unpop, {passive: false});

initMap();
fetchLocation();
setInterval(updateLeaderboard, 4000);

