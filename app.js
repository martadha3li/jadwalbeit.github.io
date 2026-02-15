// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging.js";

// ====================
// Firebase config
// ====================
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

// ====================
// Variables
// ====================
let currentUser = null;
let adminUsers = ["admin"];
let showCooking = true; // التحكم في عرض جدول الطبخ
let members = [];       // جميع الأعضاء
let washingMembers = [];
let cleaningMembers = [];
let cookingMembers = [];
let tamweenMembers = [];

// ====================
// Splash Screen
// ====================
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    document.getElementById("splashScreen").style.display="none";
    document.getElementById("loginPage").style.display="block";
    fetchMembers();
  }, 500);
});

// ====================
// Fetch Members from Firebase
// ====================
async function fetchMembers(){
  const snapshot = await getDocs(collection(db,"users"));
  members = [];
  washingMembers = [];
  cleaningMembers = [];
  cookingMembers = [];
  tamweenMembers = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const name = data.name;
    members.push(name);
    if(data.taskType === "washing") washingMembers.push(name);
    if(data.taskType === "cleaning") cleaningMembers.push(name);
    if(data.taskType === "cooking") cookingMembers.push(name);
    if(data.taskType === "tamween") tamweenMembers.push(name);
  });
}

// ====================
// Generate Fair Schedule
// ====================
function loadSchedules(){
  // مثال بسيط للتوزيع الدائري
  const washHTML = washingMembers.map((m,i)=>`🔹 ${m} يغسل هذا الأسبوع`).join("<br>");
  const cleanHTML = cleaningMembers.map((m,i)=>`🧹 ${m} ينظف هذا الأسبوع`).join("<br>");
  const cookHTML = showCooking ? cookingMembers.map((m,i)=>`🍳 ${m} يطبخ هذا الأسبوع`).join("<br>") : "تم إخفاء جدول الطبخ";
  const tamweenHTML = tamweenMembers.map((m,i)=>`📦 ${m} تموين`).join("<br>");
  
  document.getElementById("washing").innerHTML = washHTML;
  document.getElementById("cleaning").innerHTML = cleanHTML;
  document.getElementById("cooking").innerHTML = cookHTML;
  document.getElementById("tamween").innerHTML = tamweenHTML;
}

// ====================
// Render Users Icons
// ====================
function renderUsers(){
  const container = document.getElementById("usersIcons");
  container.innerHTML = "";
  members.forEach(name=>{
    const icon = document.createElement("div");
    icon.className="user-icon";
    icon.style.display="inline-block";
    icon.style.margin="5px";
    icon.style.padding="10px";
    icon.style.border="1px solid #333";
    icon.style.borderRadius="50%";
    icon.style.textAlign="center";
    icon.innerText = name[0].toUpperCase();
    container.appendChild(icon);
  });
}

// ====================
// Fees
// ====================
async function renderFees(){
  const snapshot = await getDocs(collection(db,"fees"));
  let html = "";
  snapshot.forEach(doc=>{
    const data = doc.data();
    html += `${data.name}: ${data.amount} ريال | ${data.paid ? "✅ مدفوع" : "❌ غير مدفوع"}<br>`;
  });
  document.getElementById("dueAmount").innerHTML = html;
}

// ====================
// Payment
// ====================
async function payNow(){
  if(!currentUser) return alert("الرجاء تسجيل الدخول");
  await setDoc(doc(db,"fees",currentUser.id),{name:currentUser.id,amount:100,paid:true,date:Date.now()});
  renderFees();
  alert("تم تسجيل الدفع بنجاح!");
}

// ====================
// Admin actions
// ====================
function toggleCooking(){
  showCooking = !showCooking;
  loadSchedules();
}

// ====================
// Login / Register / Logout
// ====================
async function login(){
  const name = document.getElementById("loginName").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  const errorEl = document.getElementById("loginError");
  errorEl.innerText = "";

  if(!name || !pass){
    errorEl.innerText="الرجاء ملء جميع الحقول";
    return;
  }

  const userDoc = await getDoc(doc(db,"users",name));
  if(userDoc.exists()){
    const data = userDoc.data();
    if(data.password === pass){
      if(!data.active && !adminUsers.includes(name)){
        errorEl.innerText="العضو غير مفعل بعد من الإدارة";
        return;
      }
      currentUser = {id:name, ...data};
      document.getElementById("loginPage").style.display="none";
      document.getElementById("app").style.display="block";
      if(adminUsers.includes(name)) document.getElementById("adminPanel").style.display="block";
      loadSchedules();
      renderUsers();
      renderFees();
    } else {
      errorEl.innerText="كلمة المرور خاطئة";
    }
  } else {
    errorEl.innerText="المستخدم غير موجود";
  }
}

async function register(){
  const name = document.getElementById("newName").value.trim();
  const pass = document.getElementById("newPass").value.trim();
  const errorEl = document.getElementById("registerError");
  errorEl.innerText = "";

  if(!name || !pass){
    errorEl.innerText="الرجاء ملء جميع الحقول";
    return;
  }

  const userDoc = await getDoc(doc(db,"users",name));
  if(userDoc.exists()){
    errorEl.innerText="هذا الاسم موجود مسبقاً";
    return;
  }

  await setDoc(doc(db,"users",name),{name:name,password:pass,active:false,taskType:"washing",fcmToken:null});
  errorEl.style.color="lightgreen";
  errorEl.innerText="تم التسجيل بنجاح، سيتم تفعيل العضو من الإدارة";
  document.getElementById("newName").value="";
  document.getElementById("newPass").value="";
}

function logout(){
  currentUser = null;
  document.getElementById("app").style.display="none";
  document.getElementById("loginPage").style.display="block";
}

// ====================
// Modal for Register
// ====================
const modal = document.getElementById("registerModal");
document.getElementById("openRegisterModalBtn").addEventListener("click", ()=>{ modal.style.display="block"; });
document.getElementById("closeModal").addEventListener("click", ()=>{ modal.style.display="none"; });
window.addEventListener("click",(e)=>{ if(e.target==modal) modal.style.display="none"; });

// ====================
// Event Listeners
// ====================
document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("registerBtn").addEventListener("click", register);
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("payNowBtn").addEventListener("click", payNow);
document.getElementById("toggleCookingBtn").addEventListener("click", toggleCooking);

// ====================
// Global Access
// ====================
window.login = login;
window.register = register;
window.logout = logout;
window.loadSchedules = loadSchedules;
window.renderUsers = renderUsers;
window.renderFees = renderFees;
window.payNow = payNow;
window.toggleCooking = toggleCooking;
