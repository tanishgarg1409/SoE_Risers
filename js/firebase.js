// ============================================
// SoE RISERS - FIREBASE CONFIGURATION
// ============================================

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider
} from
    "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    getFirestore
} from
    "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyAJl0mUKKtYqnIDSDXV0yXv1pi1MAG_Nuc",
    authDomain: "soe-campus.firebaseapp.com",
    projectId: "soe-campus",
    storageBucket: "soe-campus.firebasestorage.app",
    messagingSenderId: "739212150322",
    appId: "1:739212150322:web:aaa54703218c77c54b5e2b",
    measurementId: "G-HPRSVDNQMS"
};


// ============================================
// MAIN APP
// ============================================

const app = initializeApp(firebaseConfig);


// ============================================
// PRIMARY AUTH
// ============================================

export const auth =
    getAuth(app);


// ============================================
// TEACHER ACCOUNT CREATION AUTH
// ============================================
//
// This secondary Auth instance allows the
// administrator to create teacher accounts
// without logging the administrator out.
//

const teacherApp =
    initializeApp(
        firebaseConfig,
        "teacherAccountCreation"
    );

export const teacherAuth =
    getAuth(teacherApp);


// ============================================
// STUDENT ACCOUNT CREATION AUTH
// ============================================
//
// This secondary Auth instance allows the
// class in-charge teacher to create a
// student's Firebase Email/Password account
// without logging the teacher out.
//

const studentApp =
    initializeApp(
        firebaseConfig,
        "studentAccountCreation"
    );

export const studentAuth =
    getAuth(studentApp);


// ============================================
// GOOGLE AUTH PROVIDER
// ============================================

export const googleProvider =
    new GoogleAuthProvider();


// ============================================
// FIRESTORE
// ============================================

export const db =
    getFirestore(app);