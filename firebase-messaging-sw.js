importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:"AIzaSyBqBXmf2ui2_39MzoK5HLD6nRWYGO28oso",
  authDomain:"jadwal-beit.firebaseapp.com",
  projectId:"jadwal-beit",
  storageBucket:"jadwal-beit.appspot.com",
  messagingSenderId:"324621350402",
  appId:"1:324621350402:web:a17291d57d14a363f9d91b"
});

const messaging = firebase.messaging();
