// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAxWB-QiaBLMezmPveit9GKHPaY_uqCKnc",
  authDomain: "stock-manager-1589a.firebaseapp.com",
  projectId: "stock-manager-1589a",
  storageBucket: "stock-manager-1589a.firebasestorage.app",
  messagingSenderId: "167249353002",
  appId: "1:167249353002:web:87ec2d6cf79b1386c7e653",
  measurementId: "G-WE7N1LVM9H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
