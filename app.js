import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging.js";

const firebaseConfig={
  apiKey:"AIzaSyBqBXmf2ui2_39MzoK5HLD6nRWYGO28oso",
  authDomain:"jadwal-beit.firebaseapp.com",
  projectId:"jadwal-beit",
  storageBucket:"jadwal-beit.appspot.com",
  messagingSenderId:"324621350402",
  appId:"1:324621350402:web:a17291d57d14a363f9d91b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

let currentUser=null;
let adminUsers=["admin"];
let showCooking=true;
let members=[], washingMembers=[], cleaningMembers=[], cookingMembers=[], tamweenMembers=[];
let currentView="week";

// ----------------------------
// جلب الأعضاء من Firebase
// ----------------------------
async function fetchMembers(){
  const snapshot = await getDocs(collection(db,"users"));
  members=[]; washingMembers=[]; cleaningMembers=[]; cookingMembers=[]; tamweenMembers=[];
  snapshot.forEach(doc=>{
    const data=doc.data();
    members.push(data.name);
    if(data.taskType==="washing") washingMembers.push(data.name);
    if(data.taskType==="cleaning") cleaningMembers.push(data.name);
    if(data.taskType==="cooking") cookingMembers.push(data.name);
    if(data.taskType==="tamween") tamweenMembers.push(data.name);
  });
}

// ----------------------------
// تسجيل الدخول / تسجيل عضوية
// ----------------------------
async function login(){
  const name=document.getElementById("loginName").value.trim();
  const pass=document.getElementById("loginPass").value.trim();
  const errorEl=document.getElementById("loginError"); errorEl.innerText="";
  if(!name||!pass){errorEl.innerText="الرجاء ملء جميع الحقول"; return;}
  const userDoc = await getDoc(doc(db,"users",name));
  if(userDoc.exists()){
    const data=userDoc.data();
    if(data.password===pass){
      if(!data.active && !adminUsers.includes(name)){errorEl.innerText="العضو غير مفعل بعد"; return;}
      currentUser={id:name,...data};
      document.getElementById("loginPage").style.display="none";
      document.getElementById("app").style.display="block";
      if(adminUsers.includes(name)) document.getElementById("adminPanel").style.display="block";
      loadSchedules(); renderUsers(); renderFees(); renderAdminMembers(); checkNotifications();
    } else { errorEl.innerText="كلمة المرور خاطئة"; }
  } else { errorEl.innerText="المستخدم غير موجود"; }
}

async function register(){
  const name=document.getElementById("newName").value.trim();
  const pass=document.getElementById("newPass").value.trim();
  const errorEl=document.getElementById("registerError"); errorEl.innerText="";
  if(!name||!pass){ errorEl.innerText="الرجاء ملء جميع الحقول"; return;}
  const userDoc = await getDoc(doc(db,"users",name));
  if(userDoc.exists()){ errorEl.innerText="هذا الاسم موجود مسبقاً"; return;}
  await setDoc(doc(db,"users",name),{name:name,password:pass,active:false,taskType:"washing",fcmToken:null});
  errorEl.style.color="lightgreen"; errorEl.innerText="تم التسجيل بنجاح، سيتم تفعيل العضو من الإدارة";
  document.getElementById("newName").value=""; document.getElementById("newPass").value="";
}

function logout(){ currentUser=null; document.getElementById("app").style.display="none"; document.getElementById("loginPage").style.display="block"; }

// ----------------------------
// الجداول
// ----------------------------
function loadSchedules(){
  const today = new Date().getDay();
  function filterByToday(arr){ return currentView==="week"?arr:[arr[today%arr.length]]; }
  document.getElementById("washing").innerHTML=filterByToday(washingMembers).map(m=>`🔹 ${m} <button onclick="markDone('${m}','washing')">تم الإنجاز</button>`).join("<br>");
  document.getElementById("cleaning").innerHTML=filterByToday(cleaningMembers).map(m=>`🧹 ${m} <button onclick="markDone('${m}','cleaning')">تم الإنجاز</button>`).join("<br>");
  document.getElementById("cooking").innerHTML=showCooking?filterByToday(cookingMembers).map(m=>`🍳 ${m}`).join("<br>"):"تم إخفاء جدول الطبخ";
  document.getElementById("tamween").innerHTML=filterByToday(tamweenMembers).map(m=>`📦 ${m}`).join("<br>");
}

// ----------------------------
// تأكيد إنجاز مهمة
// ----------------------------
async function markDone(member,task){
  if(member!==currentUser.id){ alert("غير مسموح"); return; }
  await setDoc(doc(db,"tasks",`${member}-${task}-${new Date().toDateString()}`),{done:true,date:Date.now()});
  alert("تم تسجيل الإنجاز!");
}

// ----------------------------
// أيقونات الأعضاء
// ----------------------------
function renderUsers(){
  const container=document.getElementById("usersIcons"); container.innerHTML="";
  members.forEach(name=>{
    const icon=document.createElement("div"); icon.className="user-icon"; icon.innerText=name[0].toUpperCase(); container.appendChild(icon);
  });
}

// ----------------------------
// لوحة الإدارة
// ----------------------------
async function renderAdminMembers(){
  if(!currentUser||!adminUsers.includes(currentUser.id)) return;
  const container = document.getElementById("adminMembers"); container.innerHTML="";
  members.forEach(async name=>{
    const userDoc=await getDoc(doc(db,"users",name));
    const data=userDoc.data();
    const div=document.createElement("div");
    div.style.margin="5px 0";
    div.innerHTML = `${name} - <span style="color:${data.active?'green':'red'}">${data.active?'مفعّل':'معطّل'}</span>
      <button onclick="toggleUser('${name}')">${data.active?'تعطيل':'تفعيل'}</button>`;
    container.appendChild(div);
  });
}

async function toggleUser(name){
  const userRef=doc(db,"users",name);
  const userSnap=await getDoc(userRef);
  if(userSnap.exists()){
    const currentStatus=userSnap.data().active;
    await setDoc(userRef,{...userSnap.data(),active:!currentStatus});
    renderAdminMembers();
  }
}

// ----------------------------
// الرسوم الشهرية
// ----------------------------
async function renderFees(){
  const snapshot=await getDocs(collection(db,"fees"));
  let html="";
  snapshot.forEach(doc=>{ const data=doc.data(); html+=`${data.name}: ${data.amount} ريال | ${data.paid?"✅ مدفوع":"❌ غير مدفوع"}<br>`; });
  document.getElementById("dueAmount").innerHTML=html;
}

async function payNow(){
  if(!currentUser) return alert("الرجاء تسجيل الدخول");
  await setDoc(doc(db,"fees",currentUser.id),{name:currentUser.id,amount:100,paid:true,date:Date.now()});
  renderFees(); alert("تم تسجيل الدفع بنجاح!");
}

// ----------------------------
// دردشة
// ----------------------------
const chatRef = collection(db,"chat");
async function sendChat(){
  const msg=document.getElementById("chatInput").value.trim();
  if(!msg||!currentUser) return;
  await setDoc(doc(chatRef,Date.now().toString()),{user:currentUser.id,message:msg,time:Date.now()});
  document.getElementById("chatInput").value=""; loadChat();
}
async function loadChat(){
  const snapshot=await getDocs(chatRef); const box=document.getElementById("chatBox"); box.innerHTML="";
  const messages=[];
  snapshot.forEach(doc=>{ messages.push(doc.data()); });
  messages.sort((a,b)=>a.time-b.time);
  messages.forEach(m=>{ const div=document.createElement("div"); div.innerHTML=`<b>${m.user}:</b> ${m.message}`; box.appendChild(div); });
  box.scrollTop = box.scrollHeight;
}
setInterval(loadChat,5000);

// ----------------------------
// الأحداث
// ----------------------------
document.getElementById("loginBtn").addEventListener("click",login);
document.getElementById("registerBtn").addEventListener("click",register);
document.getElementById("logoutBtn").addEventListener("click",logout);
document.getElementById("payNowBtn").addEventListener("click",payNow);
document.getElementById("showWeekBtn").addEventListener("click",()=>{ currentView="week"; loadSchedules(); });
document.getElementById("showTodayBtn").addEventListener("click",()=>{ currentView="today"; loadSchedules(); });
document.getElementById("sendChatBtn").addEventListener("click",sendChat);

// Modal
const modal=document.getElementById("registerModal");
document.getElementById("openRegisterModalBtn").addEventListener("click",()=>{modal.style.display="block";});
document.getElementById("closeModal").addEventListener("click",()=>{modal.style.display="none";});
window.addEventListener("click",(e)=>{if(e.target==modal) modal.style.display="none";});

// Export
window.login=login; window.register=register; window.logout=logout;
window.loadSchedules=loadSchedules; window.renderUsers=renderUsers;
window.renderFees=renderFees; window.payNow=payNow;
window.renderAdminMembers=renderAdminMembers; window.toggleUser=toggleUser;
