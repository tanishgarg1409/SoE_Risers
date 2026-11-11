// =========================================
// SoE RISERS - PORTAL AUTHENTICATION
// =========================================


// =========================================
// FIREBASE IMPORTS
// =========================================

import {
    signInWithEmailAndPassword
} from
    "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from
    "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";


// =========================================
// PAGE ELEMENTS
// =========================================

const roleSelection =
    document.getElementById("roleSelection");

const studentView =
    document.getElementById("studentView");

const teacherView =
    document.getElementById("teacherView");

const adminView =
    document.getElementById("adminView");

const roleCards =
    document.querySelectorAll(".role-card");

const backButtons =
    document.querySelectorAll("[data-back]");


// =========================================
// SHOW VIEW
// =========================================

function showView(view) {

    document
        .querySelectorAll(".auth-view")
        .forEach(element => {

            element.classList.remove("active");

        });

    view.classList.add("active");
}


// =========================================
// ROLE SELECTION
// =========================================

roleCards.forEach(card => {

    card.addEventListener("click", () => {

        const role =
            card.dataset.role;

        if (role === "student") {

            showView(studentView);

        }

        else if (role === "teacher") {

            showView(teacherView);

        }

        else if (role === "admin") {

            showView(adminView);

        }

    });

});


// =========================================
// BACK / CHANGE ROLE
// =========================================

backButtons.forEach(button => {

    button.addEventListener("click", () => {

        showView(roleSelection);

    });

});


// =========================================
// MESSAGE FUNCTION
// =========================================

function showMessage(
    elementId,
    message,
    type = "error"
) {

    const element =
        document.getElementById(elementId);

    if (!element) return;

    element.textContent =
        message;

    element.className =
        `message ${type}`;

}


// =========================================
// STUDENT LOGIN
// =========================================

const studentForm =
    document.getElementById("studentForm");


studentForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        // ---------------------------------
        // GET STUDENT CREDENTIALS
        // ---------------------------------

        const studentId =
            document
                .getElementById("studentId")
                .value
                .trim()
                .toUpperCase();


        const email =
            document
                .getElementById("studentEmail")
                .value
                .trim()
                .toLowerCase();


        const password =
            document
                .getElementById("studentPassword")
                .value;


        // ---------------------------------
        // BASIC VALIDATION
        // ---------------------------------

        if (!studentId) {

            showMessage(
                "studentMessage",
                "Please enter your Student ID."
            );

            return;
        }


        if (!email) {

            showMessage(
                "studentMessage",
                "Please enter your school email."
            );

            return;
        }


        if (!password) {

            showMessage(
                "studentMessage",
                "Please enter your password."
            );

            return;
        }


        try {

            showMessage(
                "studentMessage",
                "Signing in...",
                "info"
            );


            // =================================
            // FIREBASE EMAIL/PASSWORD LOGIN
            // =================================

            const result =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                result.user;


            // =================================
            // VERIFY AUTH EMAIL
            // =================================

            if (
                !user.email ||
                user.email
                    .trim()
                    .toLowerCase() !== email
            ) {

                showMessage(
                    "studentMessage",
                    "The authenticated account does not match the entered email."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // GET STUDENT RECORD
            // =================================

            const studentRef =
                doc(
                    db,
                    "students",
                    studentId
                );


            const studentSnap =
                await getDoc(studentRef);


            if (!studentSnap.exists()) {

                showMessage(
                    "studentMessage",
                    "Student ID was not found. Please contact your school."
                );

                await auth.signOut();

                return;
            }


            const student =
                studentSnap.data();


            // =================================
            // VERIFY STUDENT ID
            // =================================

            if (
                !student.studentId ||
                student.studentId
                    .toUpperCase() !== studentId
            ) {

                showMessage(
                    "studentMessage",
                    "This Student ID is not correctly linked to its school record."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // VERIFY EMAIL
            // =================================

            if (
                !student.email ||
                student.email
                    .trim()
                    .toLowerCase() !== email
            ) {

                showMessage(
                    "studentMessage",
                    "This email is not registered with the entered Student ID."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // VERIFY ACCOUNT STATUS
            // =================================

            if (
                student.status !== "active"
            ) {

                showMessage(
                    "studentMessage",
                    "This student account is not active. Please contact your school."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // VERIFY FIREBASE UID
            // =================================

            if (
                !student.firebaseUid ||
                student.firebaseUid !== user.uid
            ) {

                showMessage(
                    "studentMessage",
                    "This Student ID is not linked to this Firebase account."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // USER DOCUMENT
            // =================================

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userSnap =
                await getDoc(userRef);


            // =================================
            // CREATE STUDENT USER DOCUMENT
            // =================================
            //
            // A newly created student may not
            // have a users/{uid} document yet.
            //
            // At this point we have already
            // verified:
            //
            // 1. Firebase authentication
            // 2. Student ID
            // 3. Email
            // 4. Active status
            // 5. Firebase UID
            //
            // Firestore rules also verify that
            // the authenticated UID matches the
            // student record.
            // =================================

            if (!userSnap.exists()) {

                await setDoc(
                    userRef,
                    {
                        name:
                            student.name || "",

                        email:
                            email,

                        role:
                            "student",

                        status:
                            "active",

                        studentId:
                            studentId,

                        createdAt:
                            serverTimestamp(),

                        lastLoginAt:
                            serverTimestamp()
                    }
                );

            }


            // =================================
            // VERIFY EXISTING USER DOCUMENT
            // =================================

            else {

                const userData =
                    userSnap.data();


                // ---------------------------------
                // VERIFY ROLE
                // ---------------------------------

                if (
                    userData.role !==
                    "student"
                ) {

                    showMessage(
                        "studentMessage",
                        "This account is not registered as a student."
                    );

                    await auth.signOut();

                    return;
                }


                // ---------------------------------
                // VERIFY STATUS
                // ---------------------------------

                if (
                    userData.status !==
                    "active"
                ) {

                    showMessage(
                        "studentMessage",
                        "This student account is not active."
                    );

                    await auth.signOut();

                    return;
                }


                // ---------------------------------
                // VERIFY STUDENT ID MAPPING
                // ---------------------------------

                if (
                    userData.studentId !==
                    studentId
                ) {

                    showMessage(
                        "studentMessage",
                        "This account is linked to a different Student ID."
                    );

                    await auth.signOut();

                    return;
                }


                // ---------------------------------
                // VERIFY EMAIL MAPPING
                // ---------------------------------

                if (
                    !userData.email ||
                    userData.email
                        .trim()
                        .toLowerCase() !== email
                ) {

                    showMessage(
                        "studentMessage",
                        "This account is linked to a different email address."
                    );

                    await auth.signOut();

                    return;
                }


                // ---------------------------------
                // UPDATE LAST LOGIN
                // ---------------------------------

                await updateDoc(
                    userRef,
                    {
                        lastLoginAt:
                            serverTimestamp()
                    }
                );

            }


            // =================================
            // SUCCESS
            // =================================

            showMessage(
                "studentMessage",
                "Login successful. Opening student dashboard...",
                "success"
            );


            setTimeout(() => {

                window.location.href =
                    "./student/dashboard.html";

            }, 700);

        }


        catch (error) {

            console.error(
                "Student login error:",
                error
            );


            showMessage(
                "studentMessage",
                getFirebaseErrorMessage(error)
            );

        }

    }
);


// =========================================
// TEACHER LOGIN
// =========================================

const teacherForm =
    document.getElementById("teacherForm");


teacherForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const teacherId =
            document
                .getElementById("teacherId")
                .value
                .trim()
                .toUpperCase();


        const email =
            document
                .getElementById("teacherEmail")
                .value
                .trim()
                .toLowerCase();


        const password =
            document
                .getElementById("teacherPassword")
                .value;


        // ---------------------------------
        // BASIC VALIDATION
        // ---------------------------------

        if (!teacherId) {

            showMessage(
                "teacherMessage",
                "Please enter your Teacher ID."
            );

            return;
        }


        if (!email) {

            showMessage(
                "teacherMessage",
                "Please enter your email."
            );

            return;
        }


        if (!password) {

            showMessage(
                "teacherMessage",
                "Please enter your password."
            );

            return;
        }


        try {

            showMessage(
                "teacherMessage",
                "Signing in...",
                "info"
            );


            // =================================
            // FIREBASE LOGIN
            // =================================

            const result =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                result.user;


            // =================================
            // GET TEACHER RECORD
            // =================================

            const teacherRef =
                doc(
                    db,
                    "teachers",
                    teacherId
                );


            const teacherSnap =
                await getDoc(
                    teacherRef
                );


            if (!teacherSnap.exists()) {

                showMessage(
                    "teacherMessage",
                    "Teacher ID was not found. Please contact the administrator."
                );

                await auth.signOut();

                return;
            }


            const teacher =
                teacherSnap.data();


            // =================================
            // VERIFY STATUS
            // =================================

            if (
                teacher.status !== "active"
            ) {

                showMessage(
                    "teacherMessage",
                    "This teacher account is not active."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // VERIFY EMAIL
            // =================================

            if (
                !teacher.email ||
                teacher.email.toLowerCase() !==
                    user.email.toLowerCase()
            ) {

                showMessage(
                    "teacherMessage",
                    "This email is not registered with the entered Teacher ID."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // VERIFY FIREBASE UID
            // =================================

            if (
                !teacher.firebaseUid ||
                teacher.firebaseUid !== user.uid
            ) {

                showMessage(
                    "teacherMessage",
                    "This Teacher ID is not linked to this Firebase account."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // VERIFY USER DOCUMENT
            // =================================

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userSnap =
                await getDoc(
                    userRef
                );


            if (!userSnap.exists()) {

                showMessage(
                    "teacherMessage",
                    "Teacher account is not registered in the school portal."
                );

                await auth.signOut();

                return;
            }


            const existingUser =
                userSnap.data();


            // =================================
            // VERIFY ROLE
            // =================================

            if (
                existingUser.role !==
                "teacher"
            ) {

                showMessage(
                    "teacherMessage",
                    "This account is not registered as a teacher."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // VERIFY STATUS
            // =================================

            if (
                existingUser.status !==
                "active"
            ) {

                showMessage(
                    "teacherMessage",
                    "This teacher account is not active."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // VERIFY TEACHER ID MAPPING
            // =================================

            if (
                existingUser.teacherId !==
                teacherId
            ) {

                showMessage(
                    "teacherMessage",
                    "This account is linked to a different Teacher ID."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // UPDATE LAST LOGIN
            // =================================

            await updateDoc(
                userRef,
                {
                    lastLoginAt:
                        serverTimestamp()
                }
            );


            // =================================
            // SUCCESS
            // =================================

            showMessage(
                "teacherMessage",
                "Login successful. Opening teacher dashboard...",
                "success"
            );


            setTimeout(() => {

                window.location.href =
                    "./teacher/dashboard.html";

            }, 700);


        }

        catch (error) {

            console.error(
                "Teacher login error:",
                error
            );


            showMessage(
                "teacherMessage",
                getFirebaseErrorMessage(error)
            );

        }

    }
);


// =========================================
// ADMIN LOGIN
// =========================================

const adminForm =
    document.getElementById("adminForm");


adminForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const email =
            document
                .getElementById("adminEmail")
                .value
                .trim()
                .toLowerCase();


        const password =
            document
                .getElementById("adminPassword")
                .value;


        // ---------------------------------
        // BASIC VALIDATION
        // ---------------------------------

        if (!email || !password) {

            showMessage(
                "adminMessage",
                "Please enter your email and password."
            );

            return;
        }


        try {

            showMessage(
                "adminMessage",
                "Signing in...",
                "info"
            );


            // =================================
            // FIREBASE LOGIN
            // =================================

            const result =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                result.user;


            // =================================
            // GET USER DOCUMENT
            // =================================

            const userRef =
                doc(
                    db,
                    "users",
                    user.uid
                );


            const userSnap =
                await getDoc(
                    userRef
                );


            if (!userSnap.exists()) {

                showMessage(
                    "adminMessage",
                    "Your account is not registered in the school portal."
                );

                await auth.signOut();

                return;
            }


            const userData =
                userSnap.data();


            // =================================
            // VERIFY ROLE
            // =================================

            if (
                userData.role !==
                "admin"
            ) {

                showMessage(
                    "adminMessage",
                    "This account does not have administrator access."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // VERIFY STATUS
            // =================================

            if (
                userData.status !==
                "active"
            ) {

                showMessage(
                    "adminMessage",
                    "This administrator account is not active."
                );

                await auth.signOut();

                return;
            }


            // =================================
            // SUCCESS
            // =================================

            showMessage(
                "adminMessage",
                "Login successful. Opening administrator dashboard...",
                "success"
            );


            setTimeout(() => {

                window.location.href =
                    "./admin/dashboard.html";

            }, 700);

        }

        catch (error) {

            console.error(
                "Admin login error:",
                error
            );


            showMessage(
                "adminMessage",
                getFirebaseErrorMessage(error)
            );

        }

    }
);


// =========================================
// FIREBASE ERROR HANDLER
// =========================================

function getFirebaseErrorMessage(error) {

    switch (error.code) {

        case "auth/network-request-failed":

            return "Network error. Please check your internet connection.";


        case "auth/invalid-credential":

            return "Invalid email or password.";


        case "auth/user-not-found":

            return "No account exists with this email.";


        case "auth/wrong-password":

            return "Incorrect email or password.";


        case "auth/invalid-email":

            return "Please enter a valid email address.";


        case "auth/too-many-requests":

            return "Too many login attempts. Please try again later.";


        case "auth/user-disabled":

            return "This account has been disabled by the administrator.";


        case "auth/operation-not-allowed":

            return "Email/password sign-in is not enabled for this school portal.";


        case "auth/weak-password":

            return "The password does not meet the required security policy.";


        case "permission-denied":

            return "You are authenticated, but this account is not permitted to access the requested school record.";


        case "auth/invalid-api-key":

            return "Firebase configuration is invalid. Please contact the administrator.";


        default:

            console.error(
                "Unhandled Firebase error:",
                error
            );

            return "Something went wrong. Please try again.";

    }

}


// =========================================
// INITIAL STATE
// =========================================

showView(roleSelection);


console.log(
    "School Portal authentication loaded successfully."
);