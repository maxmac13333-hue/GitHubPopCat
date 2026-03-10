const cat = document.getElementById('cat');
const scoreDisplay = document.getElementById('score');
const popSound = document.getElementById('pop-sound');
let count = 0;
let playerLocation = null;
let isLocationLoaded = false;
let map;
let showAll = false;

// 1. เชื่อมต่อ Supabase (Cloud Database)
const SUPABASE_URL = 'https://rtfltqeakqlyicygbjrn.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0Zmx0cWVha3FseWljeWdianJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzA2NTksImV4cCI6MjA4ODY0NjY1OX0.OBCd3GW9TMqSzWWhGDpmQeypn8OnrhXzbGtbpKNwMyg'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. เริ่มต้นแผนที่
function initMap() {
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView([20, 100], 1);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
}

// 3. ปักหมุด
function addPopMarker(lat, lon, isOther = false) {
    if(!map) return;
    const marker = L.circleMarker([lat, lon], {
        radius: isOther ? 7 : 10, 
        fillColor: isOther ? "#ffffff" : "#ffcc00", 
        color: "#fff", weight: 1, opacity: 1, fillOpacity: 0.8
    }).addTo(map);
    setTimeout(() => map.removeLayer(marker), 1000);
}

// 4. ดึงข้อมูลพิกัดคนอื่น
async function fetchRealClicks() {
    try {
        const { data } = await _supabase.from('locations').select('lat, lon').limit(10);
        if (data) {
            data.forEach(p => {
                if (p.lat && p.lon) addPopMarker(p.lat, p.lon, true);
            });
        }
    } catch (e) {}
}

// 5. รายชื่อพิกัดประเทศ (กลับมาแล้วค่ะ!)
// 5. รายชื่อพิกัดประเทศ (จำลอง 20 ประเทศ)
async function fetchLocation() {
    if (isLocationLoaded) return;
    try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const realData = await ipRes.json();

        // ตรวจสอบว่า IP ดึงมาได้จริงไหม
        if(!realData.ip) throw new Error("IP fetch failed");

        const countryCenters = [
            { ip_address: realData.ip, country: realData.country_name, country_code: realData.country_code, lat: realData.latitude, lon: realData.longitude },
            { ip_address: "1.160.0.0", country: "Taiwan", country_code: "TW", lat: 23.6978, lon: 120.9605 },
            { ip_address: "1.64.0.0", country: "Hong Kong", country_code: "HK", lat: 22.3193, lon: 114.1694 },
            { ip_address: "1.21.0.0", country: "Japan", country_code: "JP", lat: 36.2048, lon: 138.2529 },
            { ip_address: "1.214.0.0", country: "South Korea", country_code: "KR", lat: 35.9078, lon: 127.7669 },
            { ip_address: "8.8.8.8", country: "USA", country_code: "US", lat: 37.0902, lon: -95.7129 },
            { ip_address: "1.1.1.1", country: "Australia", country_code: "AU", lat: -25.2744, lon: 133.7751 },
            { ip_address: "31.13.64.1", country: "United Kingdom", country_code: "GB", lat: 55.3781, lon: -3.4360 },
            { ip_address: "185.129.61.1", country: "Germany", country_code: "DE", lat: 51.1657, lon: 10.4515 },
            { ip_address: "185.129.62.1", country: "France", country_code: "FR", lat: 46.2276, lon: 2.2137 },
            { ip_address: "185.129.63.1", country: "Italy", country_code: "IT", lat: 41.8719, lon: 12.5674 },
            { ip_address: "201.217.20.1", country: "Brazil", country_code: "BR", lat: -14.2350, lon: -51.9253 },
            { ip_address: "202.141.240.1", country: "Singapore", country_code: "SG", lat: 1.3521, lon: 103.8198 },
            { ip_address: "202.184.0.1", country: "Malaysia", country_code: "MY", lat: 4.2105, lon: 101.9758 },
            { ip_address: "203.215.114.1", country: "Vietnam", country_code: "VN", lat: 14.0583, lon: 108.2772 },
            { ip_address: "2.16.104.0", country: "Finland", country_code: "FI", lat: 61.9241, lon: 25.7482 },
            { ip_address: "2.16.176.0", country: "Sweden", country_code: "SE", lat: 60.1282, lon: 18.6435 },
            { ip_address: "2.16.216.0", country: "Norway", country_code: "NO", lat: 60.4720, lon: 8.4689 },
            { ip_address: "5.103.128.0", country: "Denmark", country_code: "DK", lat: 56.2639, lon: 9.5018 },
            { ip_address: "5.173.0.0", country: "Poland", country_code: "PL", lat: 51.9194, lon: 19.1445 }
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
        setInterval(fetchRealClicks, 3000); 
    } catch (e) { 
        console.error("Location fail", e);
        document.getElementById('ip-display').innerText = "เชื่อมต่อ IP ไม่สำเร็จ กรุณาลองใหม่";
    }
}

// 6. ระบบ Pop (แก้ไขจุดที่ทำให้ปากไม่ขยับ)
function pop(e) {
    if (e) e.preventDefault();
    
    // ปากขยับ: เปลี่ยนรูปทันที
    cat.src = "Pop02.png"; 

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
    // กลับเป็นรูปเดิมเมื่อปล่อยนิ้ว/เมาส์
    cat.src = "Pop01.jpeg"; 
}

function unpop(e) {
    if (e) e.preventDefault();
    cat.src = "Pop01.jpeg"; 
}

// 7. ส่งข้อมูลไป Supabase
async function logPlayerInfo() {
    if (!playerLocation) return;
    try {
        const { data } = await _supabase.from('locations').select('score').eq('country', playerLocation.country).single();
        let currentScore = data ? data.score : 0;

        await _supabase.from('locations').upsert({ 
            country: playerLocation.country, 
            country_code: playerLocation.country_code,
            lat: playerLocation.lat,
            lon: playerLocation.lon,
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


