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

// 2. เริ่มต้นแผนที่
function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView([20, 100], 1);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
}

// 3. ปักหมุด (เฉพาะตอนเรากดเอง)
function addPopMarker(lat, lon) {
    if(!map || !lat || !lon) return;
    const marker = L.circleMarker([lat, lon], {
        radius: 10, 
        fillColor: "#ffcc00", 
        color: "#fff", weight: 1, opacity: 1, fillOpacity: 0.8
    }).addTo(map);
    setTimeout(() => map.removeLayer(marker), 800);
}

// 4. ฟังก์ชันดึง IP (ดึงครั้งเดียว) และรายชื่อประเทศ 35 ประเทศ
async function fetchLocation() {
    if (isLocationLoaded) return;
    try {
        const res = await fetch('https://api.db-ip.com/v2/free/self');
        const realData = await res.json();

        const countryCenters = [
            { ip_address: realData.ipAddress, country: realData.countryName, country_code: realData.countryCode, lat: 13.75, lon: 100.5 },
            // กลุ่ม 15 ประเทศใหม่ใน SQL
            { country: "Canada", country_code: "CA", lat: 56.13, lon: -106.34 },
            { country: "Switzerland", country_code: "CH", lat: 46.81, lon: 8.22 },
            { country: "Netherlands", country_code: "NL", lat: 52.13, lon: 5.29 },
            { country: "Spain", country_code: "ES", lat: 40.46, lon: -3.74 },
            { country: "Russia", country_code: "RU", lat: 61.52, lon: 105.31 },
            { country: "India", country_code: "IN", lat: 20.59, lon: 78.96 },
            { country: "Indonesia", country_code: "ID", lat: -0.78, lon: 113.92 },
            { country: "Philippines", country_code: "PH", lat: 12.87, lon: 121.77 },
            { country: "Mexico", country_code: "MX", lat: 23.63, lon: -102.55 },
            { country: "Argentina", country_code: "AR", lat: -38.41, lon: -63.61 },
            { country: "New Zealand", country_code: "NZ", lat: -40.90, lon: 174.88 },
            { country: "Austria", country_code: "AT", lat: 47.51, lon: 14.55 },
            { country: "Belgium", country_code: "BE", lat: 50.50, lon: 4.46 },
            { country: "Turkey", country_code: "TR", lat: 38.96, lon: 35.24 },
            { country: "Portugal", country_code: "PT", lat: 39.39, lon: -8.22 },
            // กลุ่ม 20 ประเทศเดิม
            { country: "Taiwan", country_code: "TW", lat: 23.69, lon: 120.96 },
            { country: "Hong Kong", country_code: "HK", lat: 22.31, lon: 114.16 },
            { country: "Japan", country_code: "JP", lat: 36.20, lon: 138.25 },
            { country: "South Korea", country_code: "KR", lat: 35.90, lon: 127.76 }
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
    }
}

// 5. ระบบ Pop
function pop(e) {
    if (e) e.preventDefault();
    cat.src = "Pop02.jpeg"; // แก้ให้เป็น .jpeg ตามไฟล์พี่

    const playPop = popSound.cloneNode(); 
    playPop.play().catch(err => {});
    
    count++;
    scoreDisplay.innerText = count.toLocaleString();

    if(playerLocation) {
        addPopMarker(playerLocation.lat, playerLocation.lon);
        logPlayerInfo();
    }
}

function unpop(e) {
    if (e) e.preventDefault();
    cat.src = "Pop01.jpeg"; 
}

// 6. ส่งข้อมูล (ตัด lat, lon ออก)
async function logPlayerInfo() {
    if (!playerLocation) return;
    try {
        const { data } = await _supabase.from('locations').select('score').eq('country', playerLocation.country).maybeSingle();
        let currentScore = data ? data.score : 0;

        await _supabase.from('locations').upsert({ 
            country: playerLocation.country, 
            country_code: playerLocation.country_code,
            score: currentScore + 1 
        }, { onConflict: 'country' });
    } catch (err) {}
}

// 7. อัปเดต Leaderboard
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

// Event Listeners
cat.addEventListener('mousedown', pop);
cat.addEventListener('mouseup', unpop);
cat.addEventListener('touchstart', pop, {passive: false});
cat.addEventListener('touchend', unpop, {passive: false});

// Start
initMap();
fetchLocation();
setInterval(updateLeaderboard, 4000);
