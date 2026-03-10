// --- 1. การตั้งค่าตัวแปรและเชื่อมต่อ Supabase ---
const cat = document.getElementById('cat');
const scoreDisplay = document.getElementById('score');
const popSound = document.getElementById('pop-sound');

let count = 0;           // คะแนนในเครื่องเรา
let playerLocation = null;
let isLocationLoaded = false;
let map;
let showAll = false;

// ** กรุณาใช้ URL และ ANON KEY จากโปรเจกต์ Supabase ของพี่สาวนะคะ **
const SUPABASE_URL = 'https://rtfltqeakqlyicygbjrn.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0Zmx0cWVha3FseWljeWdianJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzA2NTksImV4cCI6MjA4ODY0NjY1OX0.OBCd3GW9TMqSzWWhGDpmQeypn8OnrhXzbGtbpKNwMyg'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. ฟังก์ชันจัดการแผนที่และจุด Pop ---

function initMap() {
    // สร้างแผนที่ Dark Mode
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView([20, 100], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
}

function addPopMarker(lat, lon, isOther = false) {
    if(!map || !lat || !lon) return;
    const marker = L.circleMarker([lat, lon], {
        radius: isOther ? 7 : 12,               // จุดคนอื่นเล็กกว่านิดหน่อย
        fillColor: isOther ? "#ffffff" : "#ffcc00", // คนอื่นสีขาว เราสีทอง
        color: "#fff", weight: 1, opacity: 1, fillOpacity: 0.8
    }).addTo(map);
    
    // ให้จุดหายไปหลังจาก 1 วินาที
    setTimeout(() => map.removeLayer(marker), 1000);
}

// --- 3. ฟังก์ชันดึง "คนจริง" จาก Supabase (Real-time) ---

async function fetchRealTimeClicks() {
    try {
        // ดึงพิกัดที่เพิ่งอัปเดตล่าสุด 20 อันดับ
        const { data } = await _supabase
            .from('locations')
            .select('lat, lon, updated_at, country')
            .order('updated_at', { ascending: false })
            .limit(20);

        if (data) {
            const now = Date.now();
            data.forEach(c => {
                const lastUpdate = new Date(c.updated_at).getTime();
                // ถ้ามีการกดภายใน 3 วินาทีล่าสุด และไม่ใช่ประเทศเรา
                if (now - lastUpdate < 3000) {
                    if (c.country !== playerLocation?.country) {
                        addPopMarker(c.lat, c.lon, true); 
                    }
                }
            });
        }
    } catch (e) {
        console.error("Fetch clicks fail", e);
    }
}

// --- 4. ฟังก์ชันระบุพิกัด (สวมรอยหรือพิกัดจริง) ---
async function fetchLocation() {
    if (isLocationLoaded) return;
    
    // ลิสต์ประเทศ 15 แห่งที่พี่สาวแกะมา (ใส่ไว้ใช้ตอน IP โดนบล็อก)
    const countryCenters = [
        { country: "Thailand", country_code: "TH", lat: 13.75, lon: 100.5 },
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
        { country: "Turkey", country_code: "TR", lat: 38.96, lon: 35.24 },
        { country: "Portugal", country_code: "PT", lat: 39.39, lon: -8.22 }
    ];

    try {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error("Limit");
        const data = await res.json();
        playerLocation = { 
            country: data.country_name, 
            country_code: data.country_code, 
            lat: data.latitude, 
            lon: data.longitude 
        };
    } catch (e) {
        playerLocation = countryCenters[Math.floor(Math.random() * countryCenters.length)];
        console.warn("Using fallback location:", playerLocation.country);
    }
    //playerLocation = countryCenters[Math.floor(Math.random() * countryCenters.length)];
    //console.warn("Using fallback location:", playerLocation.country);
    
    isLocationLoaded = true;
    const flagUrl = `https://flagcdn.com/w40/${playerLocation.country_code.toLowerCase()}.png`;
    document.getElementById('ip-display').innerHTML = `
        <img src="${flagUrl}" width="22"> 
        <span style="color:gold">${playerLocation.country}</span> | Real-time
    `;
    
    if (map) map.setView([playerLocation.lat, playerLocation.lon], 4); 
    updateLeaderboard();
}
// --- 5. ระบบการกดแมว (Pop!) ---

async function pop(e) {
    if (e) e.preventDefault();
    
    // เล่นเสียง
    const playPop = popSound.cloneNode(); 
    playPop.play().catch(() => {});
    
    // อัปเดตตัวเลขหน้าเว็บ
    count++;
    scoreDisplay.innerText = count.toLocaleString();
    
    cat.src = "Pop02.jpeg"; 

    // ปักหมุดสีทองตรงที่ของเรา
    if(playerLocation) {
        addPopMarker(playerLocation.lat, playerLocation.lon, false);
        
        // ส่งข้อมูลไป Supabase ทันทีเพื่อให้คนอื่นเห็น
        try {
            // ดึงคะแนนเดิมมาบวก 1
            const { data: current } = await _supabase
                .from('locations')
                .select('score')
                .eq('country', playerLocation.country)
                .maybeSingle();
                
            let newScore = (current ? current.score : 0) + 1;

            await _supabase.from('locations').upsert({ 
                country: playerLocation.country, 
                country_code: playerLocation.country_code,
                lat: playerLocation.lat, 
                lon: playerLocation.lon,
                score: newScore,
                updated_at: new Date() // อัปเดตเวลาเพื่อให้คนอื่นเห็นจุดเรา
            }, { onConflict: 'country' });
        } catch (err) {}
    }
}

function unpop(e) {
    if (e) e.preventDefault();
    cat.src = "Pop01.jpeg"; 
}

// --- 6. ระบบอันดับ (Leaderboard) ---

async function updateLeaderboard() {
    const listDiv = document.getElementById('leaderboard-list');
    const myRankDiv = document.getElementById('my-rank-box');
    
    try {
        const { data } = await _supabase
            .from('locations')
            .select('*')
            .order('score', { ascending: false });

        if (!data) return;

        listDiv.innerHTML = ''; 
        data.forEach((item, index) => {
            const flagUrl = `https://flagcdn.com/w20/${item.country_code?.toLowerCase()}.png`;
            const rowHtml = `
                <div class="rank-row">
                    <span>${index + 1}. <img src="${flagUrl}" width="20"> ${item.country}</span>
                    <span class="rank-score">${parseInt(item.score || 0).toLocaleString()}</span>
                </div>`;
            
            if (showAll || index < 10) listDiv.innerHTML += rowHtml;

            if (playerLocation && item.country === playerLocation.country) {
                myRankDiv.innerHTML = `
                    <div style="text-align:center;font-size:12px;color:gold;margin-bottom:5px;">YOUR COUNTRY</div>
                    <div class="rank-row" style="border:none;padding:0">
                        <span>${index+1}. <img src="${flagUrl}" width="24"> ${item.country}</span>
                        <span style="font-size:24px;color:white;font-weight:bold;">${parseInt(item.score || 0).toLocaleString()}</span>
                    </div>`;
            }
        });
    } catch (e) {}
}

function toggleViewAll() {
    showAll = !showAll;
    const btn = document.querySelector('.view-all-btn');
    const listDiv = document.getElementById('leaderboard-list');

    if (showAll) {
        btn.innerText = "แสดงแค่ Top 10 △";
        listDiv.classList.add('show-scrollbar'); // เปิดลูกเลื่อน
    } else {
        btn.innerText = "ดูอันดับทั้งหมด ▽";
        listDiv.classList.remove('show-scrollbar'); // ปิดลูกเลื่อน
        listDiv.scrollTop = 0; // เลื่อนกลับไปบนสุด
    }
    
    updateLeaderboard(); // สั่งวาดอันดับใหม่
}

// --- 7. Event Listeners และการเริ่มงาน (ย้ายมาไว้ล่างสุด) ---

cat.addEventListener('mousedown', pop);
cat.addEventListener('mouseup', unpop);
cat.addEventListener('touchstart', pop, {passive: false});
cat.addEventListener('touchend', unpop, {passive: false});

// สั่งรันงานตามลำดับ
initMap();
fetchLocation();

// ตั้งเวลาเช็คข้อมูลคนอื่น
setInterval(fetchRealTimeClicks, 2000); // เช็คจุดคนอื่นทุก 2 วินาที
setInterval(updateLeaderboard, 4000);   // อัปเดตอันดับทุก 4 วินาที


