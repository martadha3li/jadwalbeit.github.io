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

// Splash
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    document.getElementById("splashScreen").style.display="none";
    document.getElementById("loginPage").style.display="block";
  }, 500);
});

// Request permission for Push
async function requestPermission() {
  try {
    const permission = await Notification.requestPermission();
    if(permission === "granted"){
      const token = await getToken(messaging,{vapidKey:"YOUR_PUBLIC_VAPID_KEY"});
      if(currentUser) await updateDoc(doc(db,"users",currentUser.id),{fcmToken:token});
    }
  } catch(e){console.error(e);}
}

// Listen Push
onMessage(messaging,(payload)=>{
  const bar = document.getElementById("warningBar");
  bar.innerText = `🔔 ${payload.notification.title}: ${payload.notification.body}`;
  bar.classList.add("show-warning");
  setTimeout(()=>bar.classList.remove("show-warning"),7000);
});

// Login
async function login(){
  const name=document.getElementById("loginName").value.trim();
  const pass=document.getElementById("loginPass").value.trim();
  if(!name||!pass){document.getElementById("loginError").innerText="الرجاء ملء جميع الحقول";return;}

  const userDoc=await getDoc(doc(db,"users",name));
  if(userDoc.exists()){
    const data=userDoc.data();
    if(data.password===pass){
      if(!data.active && !adminUsers.includes(name)){ document.getElementById("loginError").innerText="العضو غير مفعل بعد من الإدارة"; return; }
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

// Register
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

// Render Users with Activate/Deactivate for admin
async function renderUsers(){
  const usersSnap=await getDocs(collection(db,"users"));
  const container=document.getElementById("usersIcons");
  container.innerHTML="";
  usersSnap.forEach(docSnap=>{
    const u=docSnap.data();
    const div=document.createElement("div");
    div.innerText=u.name[0].toUpperCase();
    div.title=u.name + (u.active?" ✅":" ❌");
    container.appendChild(div);

    if(currentUser && adminUsers.includes(currentUser.id)){
      const btn=document.createElement("button");
      btn.innerText=u.active?"تعطيل":"تفعيل";
      btn.style.marginLeft="10px";
      btn.onclick=async()=>{
        await updateDoc(doc(db,"users",u.name),{active:!u.active});
        renderUsers();
      };
      container.appendChild(btn);
    }
  });
}

// Load schedules
async function loadSchedules(){ 
  const washingSnap=await getDoc(doc(db,"schedules","washing"));
  const washing=washingSnap.exists()? washingSnap.data().list:[];
  document.getElementById("washing").innerText="🧺 جدول الغسيل: "+washing.join(", ");

  const cleaningSnap=await getDoc(doc(db,"schedules","cleaning"));
  const cleaning=cleaningSnap.exists()? cleaningSnap.data().list:[];
  document.getElementById("cleaning").innerText="🧹 جدول التنظيف: "+cleaning.join(", ");

  const cookingSnap=await getDoc(doc(db,"schedules","cooking"));
  const cooking=cookingSnap.exists()? cookingSnap.data().list:[];
  document.getElementById("cooking").innerText="🍳 جدول الطبخ: "+cooking.join(", ");
}

// Toggle cooking visibility
function toggleCooking(){
  const el=document.getElementById("cooking");
  el.style.display=(el.style.display==="none")?"block":"none";
}

// Admin regenerate schedules
async function regenerate(){
  const washingSnap=await getDoc(doc(db,"schedules","washing"));
  const washing=washingSnap.exists()? washingSnap.data().list:[];
  const cleaningSnap=await getDoc(doc(db,"schedules","cleaning"));
  const cleaning=cleaningSnap.exists()? cleaningSnap.data().list:[];
  const cookingSnap=await getDoc(doc(db,"schedules","cooking"));
  const cooking=cookingSnap.exists()? cookingSnap.data().list:[];

  washing.push(washing.shift());
  cleaning.push(cleaning.shift());
  cooking.push(cooking.shift());

  await updateDoc(doc(db,"schedules","washing"),{list:washing});
  await updateDoc(doc(db,"schedules","cleaning"),{list:cleaning});
  await updateDoc(doc(db,"schedules","cooking"),{list:cooking});

  alert("تم إعادة التوزيع بنجاح");
  sendPushToAll("📌 تحديث جدول البيت","تم تحديث الجداول!");
  loadSchedules();
}

// Send push
async function sendPushToAll(title,body){
  const usersSnap=await getDocs(collection(db,"users"));
  usersSnap.forEach(async docSnap=>{
    const u=docSnap.data();
    if(u.fcmToken){
      fetch('https://fcm.googleapis.com/fcm/send',{
        method:'POST',
        headers:{'Authorization':'key=YOUR_SERVER_KEY','Content-Type':'application/json'},
        body:JSON.stringify({to:u.fcmToken,notification:{title:title,body:body}})
      });
    }
  });
}

// Fees
async function renderFees(){
  const feesSnap=await getDoc(doc(db,"fees","monthly"));
  const list=feesSnap.exists()? feesSnap.data().list:[];
  document.getElementById("dueAmount").innerText="💰 الرسوم: "+list.map(u=>u.name+": "+(u.paid?"✓":"❌")).join(", ");
}

async function payNow(){
  if(!currentUser) return;
  const feesRef=doc(db,"fees","monthly");
  const feesSnap=await getDoc(feesRef);
  let list=feesSnap.exists()? feesSnap.data().list:[];
  const idx=list.findIndex(u=>u.name===currentUser.id);
  if(idx>=0){ list[idx].paid=true; list[idx].date=new Date().toLocaleDateString(); }
  else{ list.push({name:currentUser.id,paid:true,date:new Date().toLocaleDateString()}); }
  await updateDoc(feesRef,{list:list});
  renderFees();
}
