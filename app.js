// ================================
// Firebase Init
// ================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyBqBXmf2ui2_39MzoK5HLD6nRWYGO28oso",
  authDomain: "jadwal-beit.firebaseapp.com",
  projectId: "jadwal-beit",
  storageBucket: "jadwal-beit.appspot.com",
  messagingSenderId: "324621350402",
  appId: "1:324621350402:web:a17291d57d14a363f9d91b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

// ================================
// Global Variables
// ================================
let currentUser = null;
let users = [];
let washingSchedule = [];
let cleaningSchedule = [];
let cookingSchedule = [];
let adminUsers = ["admin"]; // مثال: اسماء المديرين

// ================================
// Splash + Show Login
// ================================
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const splash = document.getElementById("splashScreen");
    if (splash) splash.style.display = "none";
    document.getElementById("loginPage").style.display = "block";
  }, 500);
});

// ================================
// Request Push Permission
// ================================
async function requestPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, { vapidKey: "YOUR_PUBLIC_VAPID_KEY" });
      console.log("FCM Token:", token);
      if(currentUser){
        await updateDoc(doc(db, "users", currentUser.id), { fcmToken: token });
      }
    }
  } catch (e) { console.error(e); }
}

// ================================
// Listen Push Messages
// ================================
onMessage(messaging, (payload) => {
  console.log("Message received. ", payload);
  const bar = document.getElementById("warningBar");
  bar.innerText = `🔔 ${payload.notification.title}: ${payload.notification.body}`;
  bar.classList.add("show-warning");
  setTimeout(()=>bar.classList.remove("show-warning"),7000);
});

// ================================
// Login Function
// ================================
async function login() {
  const name = document.getElementById("loginName").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  if(!name || !pass){ document.getElementById("loginError").innerText = "الرجاء ملء جميع الحقول"; return; }

  const userDoc = await getDoc(doc(db, "users", name));
  if(userDoc.exists()){
    const data = userDoc.data();
    if(data.password === pass){
      currentUser = { id:name, ...data };
      document.getElementById("loginPage").style.display = "none";
      document.getElementById("app").style.display = "block";
      if(adminUsers.includes(name)) document.getElementById("adminPanel").style.display="block";
      requestPermission();
      loadSchedules();
      renderUsers();
      renderFees();
    } else {
      document.getElementById("loginError").innerText = "كلمة المرور خاطئة";
    }
  } else {
    document.getElementById("loginError").innerText = "المستخدم غير موجود";
  }
}

// ================================
// Load schedules from Firestore
// ================================
async function loadSchedules(){
  const washingSnap = await getDoc(doc(db,"schedules","washing"));
  washingSchedule = washingSnap.exists()? washingSnap.data().list : [];
  document.getElementById("washing").innerText = "🧺 جدول الغسيل: " + washingSchedule.join(", ");

  const cleaningSnap = await getDoc(doc(db,"schedules","cleaning"));
  cleaningSchedule = cleaningSnap.exists()? cleaningSnap.data().list : [];
  document.getElementById("cleaning").innerText = "🧹 جدول التنظيف: " + cleaningSchedule.join(", ");

  const cookingSnap = await getDoc(doc(db,"schedules","cooking"));
  cookingSchedule = cookingSnap.exists()? cookingSnap.data().list : [];
  document.getElementById("cooking").innerText = "🍳 جدول الطبخ: " + cookingSchedule.join(", ");
}

// ================================
// Render Users Icons
// ================================
async function renderUsers(){
  const usersSnap = await getDocs(collection(db,"users"));
  const container = document.getElementById("usersIcons");
  container.innerHTML = "";
  usersSnap.forEach(docSnap => {
    const u = docSnap.data();
    const div = document.createElement("div");
    div.innerText = u.name[0].toUpperCase();
    div.title = u.name;
    container.appendChild(div);
  });
}

// ================================
// Admin: Add User
// ================================
async function addUser(){
  const name = prompt("اسم العضو:");
  const pass = prompt("الرقم السري:");
  if(!name || !pass) return alert("خطأ في البيانات");
  await setDoc(doc(db,"users",name), {name:name,password:pass});
  alert("تم إضافة العضو");
  renderUsers();
}

// ================================
// Admin: Regenerate Schedules & Send Push
// ================================
async function regenerate(){
  // مثال: تدوير القوائم بشكل بسيط
  washingSchedule.push(washingSchedule.shift());
  cleaningSchedule.push(cleaningSchedule.shift());
  cookingSchedule.push(cookingSchedule.shift());

  await updateDoc(doc(db,"schedules","washing"),{list:washingSchedule});
  await updateDoc(doc(db,"schedules","cleaning"),{list:cleaningSchedule});
  await updateDoc(doc(db,"schedules","cooking"),{list:cookingSchedule});

  alert("تم إعادة التوزيع بنجاح");
  sendPushToAll("📌 تحديث جدول البيت","تم تحديث الجداول!");
  loadSchedules();
}

// ================================
// Admin: Toggle Cooking visibility
// ================================
function toggleCooking(){
  const el = document.getElementById("cooking");
  el.style.display = (el.style.display==="none")?"block":"none";
}

// ================================
// Send Push Notification
// ================================
async function sendPushToAll(title,body){
  const usersSnap = await getDocs(collection(db,"users"));
  usersSnap.forEach(async docSnap=>{
    const u = docSnap.data();
    if(u.fcmToken){
      fetch('https://fcm.googleapis.com/fcm/send',{
        method:'POST',
        headers:{
          'Authorization':'key=YOUR_SERVER_KEY',
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          to:u.fcmToken,
          notification:{title:title,body:body}
        })
      });
    }
  });
}

// ================================
// Fees System
// ================================
async function renderFees(){
  const feesSnap = await getDoc(doc(db,"fees","monthly"));
  const list = feesSnap.exists()? feesSnap.data().list : [];
  document.getElementById("dueAmount").innerText = "💰 الرسوم: " + list.map(u=>u.name + ": " + (u.paid?"✓":"❌")).join(", ");
}

async function payNow(){
  if(!currentUser) return;
  const feesRef = doc(db,"fees","monthly");
  const feesSnap = await getDoc(feesRef);
  let list = feesSnap.exists()? feesSnap.data().list : [];
  const idx = list.findIndex(u=>u.name===currentUser.id);
  if(idx>=0){
    list[idx].paid=true;
    list[idx].date = new Date().toLocaleDateString();
  } else {
    list.push({name:currentUser.id,paid:true,date:new Date().toLocaleDateString()});
  }
  await updateDoc(feesRef,{list:list});
  renderFees();
}
