// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging.js";

// Firebase config
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

let currentUser = null;
let adminUsers = ["admin"];

// Splash Screen
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    document.getElementById("splashScreen").style.display="none";
    document.getElementById("loginPage").style.display="block";
  }, 500);
});

// Push notifications
async function requestPermission() {
  try {
    const permission = await Notification.requestPermission();
    if(permission === "granted"){
      const token = await getToken(messaging,{vapidKey:"YOUR_PUBLIC_VAPID_KEY"});
      if(currentUser) await updateDoc(doc(db,"users",currentUser.id),{fcmToken:token});
    }
  } catch(e){console.error(e);}
}

onMessage(messaging,(payload)=>{
  const bar = document.getElementById("warningBar");
  bar.innerText = `🔔 ${payload.notification.title}: ${payload.notification.body}`;
  bar.classList.add("show-warning");
  setTimeout(()=>bar.classList.remove("show-warning"),7000);
});

// ============================
// Login
// ============================
async function login(){
  const name=document.getElementById("loginName").value.trim();
  const pass=document.getElementById("loginPass").value.trim();
  if(!name||!pass){document.getElementById("loginError").innerText="الرجاء ملء جميع الحقول";return;}

  const userDoc=await getDoc(doc(db,"users",name));
  if(userDoc.exists()){
    const data=userDoc.data();
    if(data.password===pass){
      if(!data.active && !adminUsers.includes(name)){ 
        document.getElementById("loginError").innerText="العضو غير مفعل بعد من الإدارة"; 
        return; 
      }
      currentUser={id:name,...data};
      document.getElementById("loginPage").style.display="none";
      document.getElementById("app").style.display="block";
      if(adminUsers.includes(name)) document.getElementById("adminPanel").style.display="block";
      requestPermission();
      loadSchedules();
      renderUsers();
      renderFees();
    } else { document.getElementById("loginError").innerText="كلمة المرور خاطئة"; }
  } else { document.getElementById("loginError").innerText="المستخدم غير موجود"; }
}

// ============================
// Register
// ============================
async function register(){
  const name=document.getElementById("newName").value.trim();
  const pass=document.getElementById("newPass").value.trim();
  const errorEl=document.getElementById("registerError");
  if(!name||!pass){ errorEl.innerText="الرجاء ملء جميع الحقول"; return; }

  const userDoc=await getDoc(doc(db,"users",name));
  if(userDoc.exists()){ errorEl.innerText="هذا الاسم موجود مسبقاً"; return; }

  await setDoc(doc(db,"users",name),{name:name,password:pass,active:false,fcmToken:null});
  errorEl.style.color="lightgreen";
  errorEl.innerText="تم التسجيل بنجاح، سيتم تفعيل العضو من الإدارة";
  document.getElementById("newName").value="";
  document.getElementById("newPass").value="";
}

// ============================
// Event Listeners
// ============================
document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("registerBtn").addEventListener("click", register);
document.getElementById("payNowBtn").addEventListener("click", payNow);
document.getElementById("addUserBtn").addEventListener("click", addUser);
document.getElementById("regenerateBtn").addEventListener("click", regenerate);
document.getElementById("toggleCookingBtn").addEventListener("click", toggleCooking);
document.getElementById("updateFeeBtn").addEventListener("click", updateFee);
document.getElementById("viewStatsBtn").addEventListener("click", viewStats);

// ===================================
// باقي الدوال: renderUsers, loadSchedules, renderFees, etc.
// كما في النسخة السابقة
// ===================================
