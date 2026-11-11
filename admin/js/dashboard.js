// ============================================
// SoE RISERS - ADMIN DASHBOARD
// ============================================

import {
    auth,
    db,
    teacherAuth
} from "../../js/firebase.js";

import {
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    deleteUser
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    serverTimestamp,
    writeBatch,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


// ============================================
// STATE
// ============================================

let teachers = [];
let classes = [];
let subjects = [];

let adminSessionReady = false;
let dashboardLoading = false;


// ============================================
// ELEMENTS
// ============================================

const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".dashboard-section");

const pageTitle = document.getElementById("pageTitle");

const teacherModal = document.getElementById("teacherModal");
const classModal = document.getElementById("classModal");
const assignmentModal = document.getElementById("assignmentModal");
const subjectModal = document.getElementById("subjectModal");

const addTeacherButton = document.getElementById("addTeacherButton");
const addClassButton = document.getElementById("addClassButton");
const addSubjectButton = document.getElementById("addSubjectButton");

const teacherForm = document.getElementById("teacherForm");
const classForm = document.getElementById("classForm");
const assignmentForm = document.getElementById("assignmentForm");
const subjectForm = document.getElementById("subjectForm");

const teacherTableBody = document.getElementById("teachersTableBody");
const classTableBody = document.getElementById("classesTableBody");
const subjectTableBody = document.getElementById("subjectsTableBody");

const assignmentMatrix = document.getElementById("assignmentMatrix");
const assignmentTeacherName = document.getElementById("assignmentTeacherName");
const assignmentTeacherId = document.getElementById("assignmentTeacherId");

const noticeForm = document.getElementById("noticeForm");
const noticesTableBody = document.getElementById("noticesTableBody");
const publishNoticeButton = document.getElementById("publishNoticeButton");


// ============================================
// TOAST SYSTEM
// ============================================

function showToast(message, type = "success") {
    let container = document.getElementById("toastContainer");

    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icon =
        type === "success"
            ? "✓"
            : type === "error"
                ? "!"
                : "i";

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${escapeHTML(message)}</div>
        <button
            class="toast-close"
            type="button"
            aria-label="Close"
        >×</button>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    const closeToast = () => {
        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 250);
    };

    toast.querySelector(".toast-close")
        ?.addEventListener("click", closeToast);

    setTimeout(closeToast, 3500);
}


// ============================================
// AUTH CHECK
// ============================================

onAuthStateChanged(auth, async (user) => {
    adminSessionReady = false;

    if (!user) {
        window.location.href = "../login.html";
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await signOut(auth);
            window.location.href = "../login.html";
            return;
        }

        const userData = userSnap.data();

        if (
            userData.role !== "admin" ||
            userData.status !== "active"
        ) {
            await signOut(auth);
            window.location.href = "../login.html";
            return;
        }

        const adminName = document.getElementById("adminName");

        if (adminName) {
            adminName.textContent =
                userData.name || user.email || "Administrator";
        }

        adminSessionReady = true;

        await loadDashboard();

    } catch (error) {
        console.error("Admin verification error:", error);

        showToast(
            "Could not verify administrator account. Check your connection and try again.",
            "error"
        );
    }
});


// ============================================
// ADMIN SESSION GUARD
// ============================================

function requireAdminSession() {
    if (!adminSessionReady || !auth.currentUser) {
        showToast(
            "Your administrator session is not ready. Please sign in again.",
            "error"
        );

        return false;
    }

    return true;
}


// ============================================
// NAVIGATION
// ============================================

navItems.forEach(button => {
    button.addEventListener("click", () => {
        openSection(button.dataset.section);
    });
});

document.querySelectorAll("[data-open]").forEach(button => {
    button.addEventListener("click", () => {
        openSection(button.dataset.open);
    });
});

async function openSection(section) {
    const target = document.getElementById(`${section}Section`);

    if (!target) {
        return;
    }

    navItems.forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.section === section
        );
    });

    sections.forEach(item => {
        item.classList.remove("active");
    });

    target.classList.add("active");

    const titles = {
        overview: "Dashboard",
        teachers: "Teachers",
        classes: "Classes",
        students: "Students",
        subjects: "Subjects",
        attendance: "Attendance",
        results: "Results",
        fees: "Fees",
        notices: "Notices",
        homepage: "Homepage Management"
    };

    if (pageTitle) {
        pageTitle.textContent = titles[section] || "Dashboard";
    }

    if (!requireAdminSession()) {
        return;
    }

    if (section === "teachers") {
        await loadTeachers();
    } else if (section === "classes") {
        await loadClasses();
    } else if (section === "subjects") {
        await loadSubjects();
    } else if (section === "notices") {
        await loadNotices();
    } else if (section === "results") {
        await loadAdminResults();
    } else if (section === "fees") {
        await loadAdminFees();
    } else if (section === "homepage") {
        await loadHomepageContent();
        await loadHomepageFaculty();
        await loadHomepageAchievements();
    }
}


// ============================================
// LOAD DASHBOARD
// ============================================

async function loadDashboard() {
    if (dashboardLoading) {
        return;
    }

    dashboardLoading = true;

    try {
        await Promise.all([
            loadTeachers(),
            loadClasses(),
            loadSubjects(),
            loadStudentCount(),
            loadNotices()
        ]);
    } catch (error) {
        console.error("Dashboard loading error:", error);

        showToast(
            "Some dashboard data could not be loaded.",
            "error"
        );
    } finally {
        dashboardLoading = false;
    }
}


// ============================================
// LOAD TEACHERS
// ============================================

async function loadTeachers() {
    try {
        const snapshot = await getDocs(
            collection(db, "teachers")
        );

        teachers = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        teachers.sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || ""))
        );

        renderTeachers();

        const count = document.getElementById("teacherCount");

        if (count) {
            count.textContent = String(teachers.length);
        }

    } catch (error) {
        console.error("Error loading teachers:", error);

        showToast(
            getFirestoreErrorMessage(error, "Could not load teachers."),
            "error"
        );

        throw error;
    }
}


// ============================================
// RENDER TEACHERS
// ============================================

function renderTeachers(searchTerm = "") {
    if (!teacherTableBody) {
        return;
    }

    teacherTableBody.innerHTML = "";

    const term = searchTerm.trim().toLowerCase();

    const filtered = teachers.filter(teacher => {
        const value = [
            teacher.name,
            teacher.teacherId,
            teacher.email,
            teacher.department
        ].join(" ").toLowerCase();

        return value.includes(term);
    });

    if (filtered.length === 0) {
        teacherTableBody.innerHTML = `
            <tr>
                <td colspan="6">No teachers found.</td>
            </tr>
        `;

        return;
    }

    filtered.forEach(teacher => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${escapeHTML(teacher.teacherId || teacher.id)}</strong>
            </td>
            <td>${escapeHTML(teacher.name || "-")}</td>
            <td>${escapeHTML(teacher.email || "-")}</td>
            <td>${escapeHTML(teacher.department || "-")}</td>
            <td>
                <span class="status">
                    ${escapeHTML(teacher.status || "active")}
                </span>
            </td>
            <td>
                <button
                    class="secondary-button manage-teacher-button"
                    type="button"
                    data-teacher-id="${escapeHTML(teacher.id)}"
                >Manage</button>
            </td>
        `;

        teacherTableBody.appendChild(row);
    });

    teacherTableBody
        .querySelectorAll(".manage-teacher-button")
        .forEach(button => {
            button.addEventListener("click", () => {
                openAssignmentModal(button.dataset.teacherId);
            });
        });
}


// ============================================
// LOAD CLASSES
// ============================================

async function loadClasses() {
    try {
        const snapshot = await getDocs(
            collection(db, "classes")
        );

        classes = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        classes.sort((a, b) => {
            const aName = `${a.className || ""}-${a.section || ""}`;
            const bName = `${b.className || ""}-${b.section || ""}`;

            return aName.localeCompare(bName);
        });

        renderClasses();

        const count = document.getElementById("classCount");

        if (count) {
            count.textContent = String(classes.length);
        }

    } catch (error) {
        console.error("Error loading classes:", error);

        showToast(
            getFirestoreErrorMessage(error, "Could not load classes."),
            "error"
        );

        throw error;
    }
}


// ============================================
// RENDER CLASSES
// ============================================

function renderClasses() {
    if (!classTableBody) {
        return;
    }

    classTableBody.innerHTML = "";

    if (classes.length === 0) {
        classTableBody.innerHTML = `
            <tr>
                <td colspan="6">No classes created yet.</td>
            </tr>
        `;

        return;
    }

    classes.forEach(item => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(item.classId || item.id)}</td>
            <td>${escapeHTML(item.className || "-")}</td>
            <td>${escapeHTML(item.section || "-")}</td>
            <td>
                ${
                    item.inchargeTeacherId
                        ? escapeHTML(getTeacherName(item.inchargeTeacherId))
                        : "Not assigned"
                }
            </td>
            <td>${Number(item.studentCount) || 0}</td>
            <td>
                <button
                    class="secondary-button manage-class-button"
                    type="button"
                    data-class-id="${escapeHTML(item.id)}"
                >Manage</button>
            </td>
        `;

        classTableBody.appendChild(row);
    });

    classTableBody
        .querySelectorAll(".manage-class-button")
        .forEach(button => {
            button.addEventListener("click", () => {
                const selectedClass = classes.find(
                    item => item.id === button.dataset.classId
                );

                if (!selectedClass) {
                    return;
                }

                showToast(
                    `${selectedClass.className}-${selectedClass.section} is managed through Teacher → Manage.`,
                    "info"
                );
            });
        });
}


// ============================================
// LOAD SUBJECTS
// ============================================

async function loadSubjects() {
    try {
        const snapshot = await getDocs(
            collection(db, "subjects")
        );

        subjects = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        subjects.sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || ""))
        );

        renderSubjects();

        const count = document.getElementById("subjectCount");

        if (count) {
            count.textContent = String(subjects.length);
        }

    } catch (error) {
        console.error("Error loading subjects:", error);

        showToast(
            getFirestoreErrorMessage(error, "Could not load subjects."),
            "error"
        );

        throw error;
    }
}


// ============================================
// RENDER SUBJECTS
// ============================================

function renderSubjects(searchTerm = "") {
    if (!subjectTableBody) {
        return;
    }

    subjectTableBody.innerHTML = "";

    const term = searchTerm.trim().toLowerCase();

    const filtered = subjects.filter(subject => {
        const value = [
            subject.name,
            subject.code,
            subject.id
        ].join(" ").toLowerCase();

        return value.includes(term);
    });

    if (filtered.length === 0) {
        subjectTableBody.innerHTML = `
            <tr>
                <td colspan="4">No subjects found.</td>
            </tr>
        `;

        return;
    }

    filtered.forEach(subject => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td><strong>${escapeHTML(subject.id)}</strong></td>
            <td>${escapeHTML(subject.name || "-")}</td>
            <td>${escapeHTML(subject.code || "-")}</td>
            <td>
                <span class="status">
                    ${escapeHTML(subject.status || "active")}
                </span>
            </td>
        `;

        subjectTableBody.appendChild(row);
    });
}


// ============================================
// STUDENT COUNT
// ============================================

async function loadStudentCount() {
    try {
        const snapshot = await getDocs(
            collection(db, "students")
        );

        const count = document.getElementById("studentCount");

        if (count) {
            count.textContent = String(snapshot.size);
        }

    } catch (error) {
        console.error("Error loading students:", error);

        showToast(
            getFirestoreErrorMessage(error, "Could not load student count."),
            "error"
        );

        throw error;
    }
}


// ============================================
// TEACHER ID GENERATOR
// ============================================

function generateTeacherId() {
    const year = new Date().getFullYear();

    const existingIds = new Set(
        teachers
            .map(teacher => teacher.teacherId)
            .filter(Boolean)
    );

    let number = 1;
    let candidate;

    do {
        candidate = `TCH-${year}-${String(number).padStart(3, "0")}`;
        number++;
    } while (existingIds.has(candidate));

    return candidate;
}

const generateTeacherIdButton =
    document.getElementById("generateTeacherId");

if (generateTeacherIdButton) {
    generateTeacherIdButton.addEventListener("click", () => {
        const input = document.getElementById("teacherId");

        if (input) {
            input.value = generateTeacherId();
        }
    });
}


// ============================================
// ADD TEACHER MODAL
// ============================================

if (addTeacherButton && teacherForm) {
    addTeacherButton.addEventListener("click", () => {
        teacherForm.reset();
        openModal(teacherModal);
    });
}


// ============================================
// CREATE TEACHER
// ============================================

if (teacherForm) {
    teacherForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!requireAdminSession()) {
            return;
        }

        const name =
            document.getElementById("teacherName")?.value.trim() || "";

        const email =
            document.getElementById("teacherEmail")?.value.trim().toLowerCase() || "";

        const password =
            document.getElementById("teacherPassword")?.value || "";

        const department =
            document.getElementById("teacherDepartment")?.value.trim() || "";

        const teacherId =
            document.getElementById("teacherId")?.value.trim().toUpperCase() || "";

        if (!name || !email || !password || !department || !teacherId) {
            showToast("Please fill all teacher fields.", "error");
            return;
        }

        if (password.length < 6) {
            showToast(
                "Teacher password must contain at least 6 characters.",
                "error"
            );

            return;
        }

        const teacherRef = doc(db, "teachers", teacherId);
        const adminUid = auth.currentUser?.uid;

        if (!adminUid) {
            showToast("Administrator session expired. Please log in again.", "error");
            return;
        }

        let createdTeacherUser = null;
        let teacherDocumentCreated = false;
        let userDocumentCreated = false;

        try {
            showToast("Creating teacher account...", "info");

            const existingTeacher = await getDoc(teacherRef);

            if (existingTeacher.exists()) {
                showToast("This Teacher ID already exists.", "error");
                return;
            }

            const emailSnapshot = await getDocs(
                query(
                    collection(db, "teachers"),
                    where("email", "==", email)
                )
            );

            if (!emailSnapshot.empty) {
                showToast(
                    "This email is already registered to a teacher.",
                    "error"
                );

                return;
            }

            // Create the teacher in the secondary Auth instance.
            const credential = await createUserWithEmailAndPassword(
                teacherAuth,
                email,
                password
            );

            createdTeacherUser = credential.user;

            const teacherUid = createdTeacherUser.uid;

            await setDoc(teacherRef, {
                teacherId,
                name,
                email,
                department,
                status: "active",
                firebaseUid: teacherUid,
                assignedClasses: [],
                assignedSubjects: [],
                assignedClassIds: [],
                createdAt: serverTimestamp(),
                linkedAt: serverTimestamp()
            });

            teacherDocumentCreated = true;

            await setDoc(doc(db, "users", teacherUid), {
                name,
                email,
                role: "teacher",
                status: "active",
                teacherId,
                createdAt: serverTimestamp(),
                createdBy: adminUid
            });

            userDocumentCreated = true;

            // Sign out only the secondary teacher Auth instance.
            await signOut(teacherAuth);

            closeModal(teacherModal);
            teacherForm.reset();

            showToast(
                `Teacher ${teacherId} created successfully.`,
                "success"
            );

            await loadTeachers();

        } catch (error) {
            console.error("Create teacher error:", error);

            const createdUid = createdTeacherUser?.uid;

            // Roll back Firestore records created by this attempt.
            if (createdUid && userDocumentCreated) {
                try {
                    await deleteDoc(doc(db, "users", createdUid));
                } catch (rollbackError) {
                    console.error("User document rollback failed:", rollbackError);
                }
            }

            if (createdUid && teacherDocumentCreated) {
                try {
                    await deleteDoc(teacherRef);
                } catch (rollbackError) {
                    console.error("Teacher document rollback failed:", rollbackError);
                }
            }

            // Delete the newly created teacher account before signing out.
            if (createdTeacherUser && teacherAuth.currentUser?.uid === createdTeacherUser.uid) {
                try {
                    await deleteUser(createdTeacherUser);
                } catch (deleteAuthError) {
                    console.error(
                        "Teacher Auth account cleanup failed:",
                        deleteAuthError
                    );
                }
            }

            // Sign out the secondary Auth instance.
            try {
                if (teacherAuth.currentUser) {
                    await signOut(teacherAuth);
                }
            } catch (signOutError) {
                console.error("Teacher Auth cleanup error:", signOutError);
            }

            showToast(
                getFirebaseErrorMessage(
                    error,
                    "Could not create teacher account."
                ),
                "error"
            );

        } finally {
            // Do not leave the secondary Auth session signed in.
            try {
                if (teacherAuth.currentUser) {
                    await signOut(teacherAuth);
                }
            } catch (cleanupError) {
                console.error("Secondary Auth sign-out failed:", cleanupError);
            }
        }
    });
}


// ============================================
// ADD CLASS MODAL
// ============================================

if (addClassButton && classForm) {
    addClassButton.addEventListener("click", () => {
        classForm.reset();
        openModal(classModal);
    });
}


// ============================================
// CREATE CLASS
// ============================================

if (classForm) {
    classForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!requireAdminSession()) {
            return;
        }

        const className =
            document.getElementById("className")?.value.trim() || "";

        const section =
            document.getElementById("classSection")?.value.trim().toUpperCase() || "";

        if (!className || !section) {
            showToast("Please enter class and section.", "error");
            return;
        }

        const classId = `CLASS-${className}-${section}`
            .replace(/\s+/g, "")
            .toUpperCase();

        try {
            const classRef = doc(db, "classes", classId);
            const existing = await getDoc(classRef);

            if (existing.exists()) {
                showToast("This class already exists.", "error");
                return;
            }

            await setDoc(classRef, {
                classId,
                className,
                section,
                inchargeTeacherId: null,
                teacherIds: [],
                subjectIds: [],
                teacherAssignments: [],
                studentCount: 0,
                createdAt: serverTimestamp()
            });

            closeModal(classModal);
            classForm.reset();

            showToast(
                `Class ${className}-${section} created successfully.`,
                "success"
            );

            await loadClasses();

        } catch (error) {
            console.error("Error creating class:", error);

            showToast(
                getFirestoreErrorMessage(error, "Could not create class."),
                "error"
            );
        }
    });
}


// ============================================
// ADD SUBJECT MODAL
// ============================================

if (addSubjectButton && subjectForm) {
    addSubjectButton.addEventListener("click", () => {
        subjectForm.reset();
        openModal(subjectModal);
    });
}


// ============================================
// CREATE SUBJECT
// ============================================

if (subjectForm) {
    subjectForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!requireAdminSession()) {
            return;
        }

        const name =
            document.getElementById("subjectName")?.value.trim() || "";

        const code =
            document.getElementById("subjectCode")?.value.trim().toUpperCase() || "";

        if (!name || !code) {
            showToast("Please enter subject name and code.", "error");
            return;
        }

        const subjectId = `SUB-${code}`
            .replace(/\s+/g, "")
            .toUpperCase();

        try {
            const subjectRef = doc(db, "subjects", subjectId);
            const existing = await getDoc(subjectRef);

            if (existing.exists()) {
                showToast("This subject code already exists.", "error");
                return;
            }

            await setDoc(subjectRef, {
                name,
                code,
                status: "active",
                createdAt: serverTimestamp()
            });

            closeModal(subjectModal);
            subjectForm.reset();

            showToast(`${name} added successfully.`, "success");

            await loadSubjects();

        } catch (error) {
            console.error("Error creating subject:", error);

            showToast(
                getFirestoreErrorMessage(error, "Could not create subject."),
                "error"
            );
        }
    });
}


// ============================================
// TEACHER ASSIGNMENT MODAL
// ============================================

async function openAssignmentModal(teacherDocId) {
    if (!requireAdminSession()) {
        return;
    }

    if (!assignmentModal || !assignmentMatrix) {
        showToast("Assignment interface is unavailable.", "error");
        return;
    }

    const teacher = teachers.find(item => item.id === teacherDocId);

    if (!teacher) {
        showToast("Teacher could not be found.", "error");
        return;
    }

    if (assignmentTeacherName) {
        assignmentTeacherName.textContent =
            `${teacher.name || "Teacher"} — ${teacher.teacherId || teacherDocId}`;
    }

    if (assignmentTeacherId) {
        assignmentTeacherId.value = teacherDocId;
    }

    try {
        await Promise.all([
            loadClasses(),
            loadSubjects()
        ]);

        // Find the refreshed teacher record.
        const freshTeacher =
            teachers.find(item => item.id === teacherDocId) || teacher;

        renderAssignmentMatrix(freshTeacher);
        openModal(assignmentModal);

    } catch (error) {
        console.error("Assignment modal loading error:", error);

        showToast(
            "Could not load class and subject assignments.",
            "error"
        );
    }
}


// ============================================
// RENDER ASSIGNMENT MATRIX
// ============================================

function renderAssignmentMatrix(teacher) {
    if (!assignmentMatrix) {
        return;
    }

    assignmentMatrix.innerHTML = "";

    if (classes.length === 0) {
        assignmentMatrix.innerHTML = `
            <div class="assignment-empty">
                <strong>No classes created yet.</strong>
                <span>Create a class first.</span>
            </div>
        `;

        return;
    }

    classes.forEach(classItem => {
        const assignment = getTeacherClassAssignment(teacher, classItem);

        const card = document.createElement("div");
        card.className = "assignment-class-card";
        card.dataset.classId = classItem.id;

        card.innerHTML = `
            <div class="assignment-class-top">
                <div>
                    <div class="assignment-class-title">
                        ${escapeHTML(classItem.className || "-")}-${escapeHTML(classItem.section || "-")}
                    </div>
                    <small>${escapeHTML(classItem.classId || classItem.id)}</small>
                </div>

                <label class="check-control incharge-control">
                    <input
                        type="checkbox"
                        class="incharge-checkbox"
                        data-class-id="${escapeHTML(classItem.id)}"
                        ${assignment?.incharge ? "checked" : ""}
                    >
                    <span>Class In-Charge</span>
                </label>
            </div>

            <div class="assignment-subjects ${subjects.length === 0 ? "disabled" : ""}">
                ${
                    subjects.length === 0
                        ? `<div class="inline-note">No subjects available.</div>`
                        : subjects.map(subject => {
                            const selected =
                                Array.isArray(assignment?.subjectIds) &&
                                assignment.subjectIds.includes(subject.id);

                            return `
                                <label class="subject-chip">
                                    <input
                                        type="checkbox"
                                        class="subject-checkbox"
                                        data-class-id="${escapeHTML(classItem.id)}"
                                        data-subject-id="${escapeHTML(subject.id)}"
                                        ${selected ? "checked" : ""}
                                    >
                                    <span>${escapeHTML(subject.name || subject.code || subject.id)}</span>
                                </label>
                            `;
                        }).join("")
                }
            </div>
        `;

        assignmentMatrix.appendChild(card);
    });

    assignmentMatrix
        .querySelectorAll(".incharge-checkbox")
        .forEach(checkbox => {
            checkbox.addEventListener("change", () => {
                if (!checkbox.checked) {
                    return;
                }

                const classId = checkbox.dataset.classId;

                assignmentMatrix
                    .querySelectorAll(".incharge-checkbox")
                    .forEach(other => {
                        if (other !== checkbox && other.dataset.classId === classId) {
                            other.checked = false;
                        }
                    });
            });
        });
}


// ============================================
// GET EXISTING TEACHER ASSIGNMENT
// ============================================

function getTeacherClassAssignment(teacher, classItem) {
    if (Array.isArray(teacher.assignedClasses)) {
        const found = teacher.assignedClasses.find(item => {
            if (typeof item === "string") {
                return item === classItem.id;
            }

            return item.classId === classItem.id;
        });

        if (found) {
            if (typeof found === "string") {
                return {
                    classId: classItem.id,
                    subjectIds: [],
                    incharge:
                        classItem.inchargeTeacherId === teacher.teacherId
                };
            }

            return {
                classId: classItem.id,
                subjectIds: Array.isArray(found.subjectIds)
                    ? found.subjectIds
                    : [],
                incharge: Boolean(found.incharge)
            };
        }
    }

    if (Array.isArray(classItem.teacherAssignments)) {
        const found = classItem.teacherAssignments.find(
            item => item.teacherId === teacher.teacherId
        );

        if (found) {
            return {
                classId: classItem.id,
                subjectIds: Array.isArray(found.subjectIds)
                    ? found.subjectIds
                    : [],
                incharge: Boolean(found.incharge)
            };
        }
    }

    return null;
}


// ============================================
// SAVE TEACHER ASSIGNMENTS
// ============================================

if (assignmentForm) {
    assignmentForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!requireAdminSession()) {
            return;
        }

        const teacherDocId = assignmentTeacherId?.value;

        const teacher = teachers.find(
            item => item.id === teacherDocId
        );

        if (!teacher) {
            showToast("Teacher not found.", "error");
            return;
        }

        if (!assignmentMatrix) {
            showToast("Assignment interface is unavailable.", "error");
            return;
        }

        const submitButton = assignmentForm.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Saving...";
        }

        try {
            const [teacherSnapshot, classSnapshot] = await Promise.all([
                getDocs(collection(db, "teachers")),
                getDocs(collection(db, "classes"))
            ]);

            const freshTeachers = teacherSnapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));

            const freshClasses = classSnapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));

            // Each teacher and class will be updated once.
            if (freshClasses.length + freshTeachers.length > 490) {
                showToast(
                    "There are too many teachers and classes for one safe assignment update.",
                    "error"
                );

                return;
            }

            const selectedAssignments = new Map();

            for (const classItem of freshClasses) {
                const card = Array.from(
                    assignmentMatrix.querySelectorAll(".assignment-class-card")
                ).find(item => item.dataset.classId === classItem.id);

                if (!card) {
                    continue;
                }

                const incharge =
                    card.querySelector(".incharge-checkbox")?.checked || false;

                const selectedSubjectIds = Array.from(
                    card.querySelectorAll(".subject-checkbox:checked")
                ).map(input => input.dataset.subjectId);

                if (incharge || selectedSubjectIds.length > 0) {
                    selectedAssignments.set(classItem.id, {
                        classId: classItem.id,
                        subjectIds: selectedSubjectIds,
                        incharge
                    });
                }
            }

            const teacherClassMap = new Map();

            freshTeachers.forEach(item => {
                teacherClassMap.set(item.teacherId, []);
            });

            const batch = writeBatch(db);

            for (const classItem of freshClasses) {
                let assignments = Array.isArray(classItem.teacherAssignments)
                    ? [...classItem.teacherAssignments]
                    : [];

                // Remove only the selected teacher's previous assignment.
                assignments = assignments.filter(
                    assignment => assignment.teacherId !== teacher.teacherId
                );

                const selected = selectedAssignments.get(classItem.id);

                if (selected) {
                    // Only one in-charge per class.
                    if (selected.incharge) {
                        assignments = assignments.map(assignment => ({
                            ...assignment,
                            incharge: false
                        }));
                    }

                    assignments.push({
                        teacherId: teacher.teacherId,
                        subjectIds: selected.subjectIds,
                        incharge: selected.incharge
                    });
                }

                const teacherIds = [
                    ...new Set(
                        assignments.map(item => item.teacherId)
                    )
                ];

                const subjectIds = [
                    ...new Set(
                        assignments.flatMap(item =>
                            Array.isArray(item.subjectIds)
                                ? item.subjectIds
                                : []
                        )
                    )
                ];

                const inchargeAssignment = assignments.find(
                    item => item.incharge
                );

                batch.update(
                    doc(db, "classes", classItem.id),
                    {
                        teacherAssignments: assignments,
                        teacherIds,
                        subjectIds,
                        inchargeTeacherId:
                            inchargeAssignment?.teacherId || null
                    }
                );

                assignments.forEach(assignment => {
                    if (!teacherClassMap.has(assignment.teacherId)) {
                        teacherClassMap.set(assignment.teacherId, []);
                    }

                    teacherClassMap.get(assignment.teacherId).push({
                        classId: classItem.id,
                        subjectIds: Array.isArray(assignment.subjectIds)
                            ? assignment.subjectIds
                            : [],
                        incharge: Boolean(assignment.incharge)
                    });
                });
            }

            for (const teacherItem of freshTeachers) {
                const assignments =
                    teacherClassMap.get(teacherItem.teacherId) || [];

                const assignedSubjects = [
                    ...new Set(
                        assignments.flatMap(item =>
                            Array.isArray(item.subjectIds)
                                ? item.subjectIds
                                : []
                        )
                    )
                ];

                const assignedClassIds = assignments.map(
                    item => item.classId
                );

                batch.update(
                    doc(db, "teachers", teacherItem.id),
                    {
                        assignedClasses: assignments,
                        assignedSubjects,
                        assignedClassIds
                    }
                );
            }

            await batch.commit();

            await Promise.all([
                loadTeachers(),
                loadClasses()
            ]);

            closeModal(assignmentModal);

            showToast(
                `${teacher.name}'s class and subject assignments were saved.`,
                "success"
            );

        } catch (error) {
            console.error("Assignment save error:", error);

            showToast(
                getFirestoreErrorMessage(error, "Could not save assignments."),
                "error"
            );

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Save";
            }
        }
    });
}


// ============================================
// SEARCH
// ============================================

const subjectSearch = document.getElementById("subjectSearch");

if (subjectSearch) {
    subjectSearch.addEventListener("input", event => {
        renderSubjects(event.target.value);
    });
}

const teacherSearch = document.getElementById("teacherSearch");

if (teacherSearch) {
    teacherSearch.addEventListener("input", event => {
        renderTeachers(event.target.value);
    });
}


// ============================================
// MODAL CONTROLS
// ============================================

function openModal(modal) {
    modal?.classList.add("active");
}

function closeModal(modal) {
    modal?.classList.remove("active");
}

document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
        const modal = document.getElementById(button.dataset.close);
        closeModal(modal);
    });
});

document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal(modal);
        }
    });
});

document.addEventListener("keydown", event => {
    if (event.key !== "Escape") {
        return;
    }

    document.querySelectorAll(".modal.active").forEach(modal => {
        closeModal(modal);
    });
});


// ============================================
// LOGOUT
// ============================================

const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        try {
            adminSessionReady = false;

            await signOut(auth);

            window.location.href = "../login.html";

        } catch (error) {
            console.error("Logout error:", error);

            showToast(
                getFirebaseErrorMessage(error, "Could not log out."),
                "error"
            );
        }
    });
}


// ============================================
// TEACHER NAME HELPER
// ============================================

function getTeacherName(teacherId) {
    const teacher = teachers.find(
        item => item.teacherId === teacherId
    );

    return teacher
        ? `${teacher.name} (${teacher.teacherId})`
        : teacherId;
}


// ============================================
// SCHOOL NOTICES — LOAD
// ============================================

async function loadNotices() {
    if (!noticesTableBody) {
        return;
    }

    noticesTableBody.innerHTML = `
        <tr>
            <td colspan="6">Loading notices...</td>
        </tr>
    `;

    try {
        const snapshot = await getDocs(
            collection(db, "notices")
        );

        const notices = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        notices.sort((a, b) => {
            const aTime =
                a.publishedAt?.toMillis?.() ||
                a.createdAt?.toMillis?.() ||
                0;

            const bTime =
                b.publishedAt?.toMillis?.() ||
                b.createdAt?.toMillis?.() ||
                0;

            return bTime - aTime;
        });

        if (notices.length === 0) {
            noticesTableBody.innerHTML = `
                <tr>
                    <td colspan="6">No notices have been published yet.</td>
                </tr>
            `;

            return;
        }

        noticesTableBody.innerHTML = "";

        notices.forEach(notice => {
            const row = document.createElement("tr");

            const timestamp = notice.publishedAt || notice.createdAt;

            const dateText = timestamp?.toDate
                ? timestamp.toDate().toLocaleDateString()
                : (notice.date || "—");

            row.innerHTML = `
                <td>
                    <strong>${escapeHTML(notice.title || "Untitled notice")}</strong>
                    <div style="
                        white-space: normal;
                        max-width: 420px;
                        margin-top: 5px;
                    ">${escapeHTML(notice.message || notice.description || "")}</div>
                </td>

                <td>${escapeHTML(notice.category || "General")}</td>

                <td>${escapeHTML(
                    notice.audience === "students"
                        ? "Students Only"
                        : notice.audience === "teachers"
                            ? "Teachers Only"
                            : "Everyone"
                )}</td>

                <td>${escapeHTML(dateText)}</td>
                <td>${escapeHTML(notice.createdByName || "Administrator")}</td>

                <td>
                    <button
                        type="button"
                        class="secondary-button delete-notice-button"
                        data-notice-id="${escapeHTML(notice.id)}"
                    >Delete</button>
                </td>
            `;

            noticesTableBody.appendChild(row);
        });

        noticesTableBody
            .querySelectorAll(".delete-notice-button")
            .forEach(button => {
                button.addEventListener("click", async () => {
                    const noticeId = button.dataset.noticeId;

                    if (
                        !noticeId ||
                        !window.confirm(
                            "Delete this notice? It will disappear from student dashboards."
                        )
                    ) {
                        return;
                    }

                    button.disabled = true;

                    try {
                        if (!requireAdminSession()) {
                            button.disabled = false;
                            return;
                        }

                        await deleteDoc(
                            doc(db, "notices", noticeId)
                        );

                        showToast("Notice deleted.", "success");

                        await loadNotices();

                    } catch (error) {
                        console.error("Notice deletion error:", error);

                        showToast(
                            getFirebaseErrorMessage(
                                error,
                                "Could not delete the notice."
                            ),
                            "error"
                        );

                        button.disabled = false;
                    }
                });
            });

    } catch (error) {
        console.error("Notices loading error:", error);

        noticesTableBody.innerHTML = `
            <tr>
                <td colspan="6">Notices could not be loaded. Check Firestore permissions.</td>
            </tr>
        `;

        showToast(
            getFirebaseErrorMessage(error, "Could not load notices."),
            "error"
        );

        throw error;
    }
}


// ============================================
// SCHOOL NOTICES — PUBLISH
// ============================================

if (noticeForm) {
    noticeForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!requireAdminSession()) {
            return;
        }

        const title =
            document.getElementById("noticeTitle")?.value.trim() || "";

        const category =
            document.getElementById("noticeCategory")?.value || "General";

        const message =
            document.getElementById("noticeMessage")?.value.trim() || "";

        const audience =
            document.getElementById("noticeAudience")?.value || "everyone";

        const allowedAudiences = [
            "students",
            "teachers",
            "everyone"
        ];

        if (!allowedAudiences.includes(audience)) {
            showToast("Please select a valid notice audience.", "error");
            return;
        }

        const user = auth.currentUser;

        if (!user || !title || !message) {
            showToast("Enter both a title and notice details.", "error");
            return;
        }

        if (publishNoticeButton) {
            publishNoticeButton.disabled = true;
            publishNoticeButton.textContent = "Publishing...";
        }

        try {
            // Verify the current admin again before writing.
            const userSnap = await getDoc(
                doc(db, "users", user.uid)
            );

            if (
                !userSnap.exists() ||
                userSnap.data().role !== "admin" ||
                userSnap.data().status !== "active"
            ) {
                throw new Error(
                    "Only an active administrator can publish school notices."
                );
            }

            const userData = userSnap.data();

            await addDoc(collection(db, "notices"), {
                title,
                message,
                category,

                // Intended audience:
                // "students", "teachers", or "everyone"
                audience,

                date: new Date().toLocaleDateString(),
                status: "published",

                createdBy: user.uid,
                createdByName:
                    userData.name || user.email || "Administrator",

                createdAt: serverTimestamp(),
                publishedAt: serverTimestamp()
            });

            noticeForm.reset();

            showToast(
                "Notice published successfully. Students can now see it.",
                "success"
            );

            await loadNotices();

        } catch (error) {
            console.error("Notice publishing error:", error);

            showToast(
                getFirebaseErrorMessage(
                    error,
                    "Could not publish the notice."
                ),
                "error"
            );

        } finally {
            if (publishNoticeButton) {
                publishNoticeButton.disabled = false;
                publishNoticeButton.textContent = "📢 Publish Notice";
            }
        }
    });
}


// ============================================
// FIREBASE ERROR MESSAGE
// ============================================

function getFirebaseErrorMessage(error, fallback) {
    if (!error) {
        return fallback;
    }

    const code = error.code || "";

    if (
        code === "permission-denied" ||
        code === "firestore/permission-denied"
    ) {
        return "Permission denied. Check the Firestore rules and administrator account.";
    }

    if (
        code === "auth/email-already-in-use"
    ) {
        return "A Firebase account already exists with this email.";
    }

    if (
        code === "auth/invalid-email"
    ) {
        return "Please enter a valid email address.";
    }

    if (
        code === "auth/weak-password"
    ) {
        return "Password must contain at least 6 characters.";
    }

    if (
        code === "auth/network-request-failed" ||
        code === "network-request-failed"
    ) {
        return "Network error. Please check your internet connection.";
    }

    if (code === "unavailable") {
        return "Firebase is temporarily unavailable. Please try again.";
    }

    if (typeof error.message === "string" && error.message.trim()) {
        return error.message;
    }

    return fallback;
}


// ============================================
// FIRESTORE ERROR MESSAGE
// ============================================

function getFirestoreErrorMessage(error, fallback) {
    if (!error) {
        return fallback;
    }

    if (
        error.code === "permission-denied" ||
        error.code === "firestore/permission-denied"
    ) {
        return "Permission denied. Please check Firestore rules and the administrator account.";
    }

    if (error.code === "unavailable") {
        return "Firebase is temporarily unavailable. Check your internet connection and try again.";
    }

    if (error.code === "failed-precondition") {
        return "This operation requires a Firestore configuration that is currently unavailable.";
    }

    if (
        error.code === "network-request-failed" ||
        error.code === "auth/network-request-failed"
    ) {
        return "Network error. Please check your internet connection.";
    }

    if (typeof error.message === "string" && error.message.trim()) {
        return error.message;
    }

    return fallback;
}

// ============================================
// LOAD TEACHER-SUBMITTED RESULTS
// ============================================

async function loadAdminResults() {
    const tableBody = document.getElementById("adminResultsTableBody");
    const message = document.getElementById("adminResultsMessage");

    if (!tableBody) {
        console.error("Admin results table not found.");
        return;
    }

    tableBody.innerHTML =
        '<tr><td colspan="9">Loading submitted results...</td></tr>';

    if (message) message.textContent = "";

    try {
        const resultsQuery = query(collection(db, "results"));
        const snapshot = await getDocs(resultsQuery);

        const submittedResults = snapshot.docs
            .map(resultDoc => ({
                id: resultDoc.id,
                ...resultDoc.data()
            }))
            .filter(result => result.status === "submitted")
            .sort((a, b) =>
                (a.studentName || "").localeCompare(b.studentName || "")
            );

        if (submittedResults.length === 0) {
            tableBody.innerHTML =
                '<tr><td colspan="9">No results are waiting for review.</td></tr>';
            return;
        }

        tableBody.innerHTML = submittedResults.map(result => `
            <tr>
                <td>${escapeHTML(result.studentName || "—")}</td>
                <td>${escapeHTML(
                    `${result.className || ""}${result.section ? " - " + result.section : ""}` || "—"
                )}</td>
                <td>${escapeHTML(result.examName || result.exam || "—")}</td>
                <td>${escapeHTML(result.academicYear || "—")}</td>
                <td>${Number(result.totalMarks ?? 0)} / ${Number(result.maximumMarks ?? 0)}</td>
                <td>${Number(result.percentage ?? 0).toFixed(2)}%</td>
                <td>${escapeHTML(result.submittedByName || "—")}</td>
                <td><span class="status-badge">Awaiting review</span></td>
                <td>
                    <button
                        type="button"
                        class="primary-button publish-result-button"
                        data-result-id="${escapeHTML(result.id)}"
                    >
                        Publish
                    </button>
                </td>
            </tr>
        `).join("");

        tableBody.querySelectorAll(".publish-result-button").forEach(button => {
            button.addEventListener("click", () => {
                publishAdminResult(button.dataset.resultId);
            });
        });

    } catch (error) {
        console.error("Error loading admin results:", error);

        tableBody.innerHTML =
            '<tr><td colspan="9">Unable to load results. Check permissions and try again.</td></tr>';

        if (message) {
            message.textContent = "Could not load submitted results.";
        }
    }
}

async function publishAdminResult(resultId) {
    if (!requireAdminSession() || !resultId) return;

    const confirmed = window.confirm(
        "Publish this student's result? The student will be able to view it."
    );

    if (!confirmed) return;

    try {
        const resultRef = doc(db, "results", resultId);
        const resultSnapshot = await getDoc(resultRef);

        if (!resultSnapshot.exists()) {
            alert("This result no longer exists. Refresh the page.");
            await loadAdminResults();
            return;
        }

        const result = resultSnapshot.data();

        if (result.status !== "submitted") {
            alert("This result is no longer awaiting review.");
            await loadAdminResults();
            return;
        }

        await updateDoc(resultRef, {
            status: "published",
            publishedAt: serverTimestamp(),
            publishedByAdminUid: auth.currentUser.uid,
            updatedAt: serverTimestamp()
        });

        alert("Result published successfully!");
        await loadAdminResults();

    } catch (error) {
        console.error("Error publishing result:", error);
        alert(
            "Could not publish the result. Check your permissions and try again."
        );
    }
}

// =====================================================
// ADMIN FEE OVERVIEW
// =====================================================

async function loadAdminFees() {
    const container = document.getElementById(
        "adminFeesContainer"
    );

    if (!container) return;

    container.innerHTML = "<p>Loading school fee records...</p>";

    try {
        const snapshot = await getDocs(
            collection(db, "fees")
        );

        const fees = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        const total = fees.reduce(
            (sum, fee) => sum + Number(fee.amount || 0),
            0
        );

        const paid = fees.reduce(
            (sum, fee) => sum + Number(fee.paidAmount || 0),
            0
        );

        const balance = Math.max(0, total - paid);

        const pendingFees = fees.filter(
            fee => Number(fee.balance ?? (
                Number(fee.amount || 0) -
                Number(fee.paidAmount || 0)
            )) > 0
        );

        container.innerHTML = `
            <div class="content-card">
                <h3>School Fee Overview</h3>

                <div class="record-meta">
                    <span>
                        Fee records: ${fees.length}
                    </span>

                    <span>
                        Total assessed: ₹${total.toFixed(2)}
                    </span>

                    <span>
                        Total received: ₹${paid.toFixed(2)}
                    </span>

                    <span>
                        Outstanding: ₹${balance.toFixed(2)}
                    </span>

                    <span>
                        Records with balances: ${pendingFees.length}
                    </span>
                </div>
            </div>

            <div class="content-card">
                <h3>Fee Records</h3>

                <div style="overflow-x:auto">
                    <table>
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Class</th>
                                <th>Fee</th>
                                <th>Total</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Due Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${
                                fees.length
                                    ? fees.map(fee => {
                                        const amount = Number(
                                            fee.amount || 0
                                        );

                                        const received = Number(
                                            fee.paidAmount || 0
                                        );

                                        const remaining = Math.max(
                                            0,
                                            Number(
                                                fee.balance ??
                                                amount - received
                                            )
                                        );

                                        return `
                                            <tr>
                                                <td>${escapeHTML(
                                                    fee.studentName || "Unknown"
                                                )}</td>

                                                <td>${escapeHTML(
                                                    (fee.className || "") +
                                                    " " +
                                                    (fee.section || "")
                                                )}</td>

                                                <td>${escapeHTML(
                                                    fee.title || "Fee"
                                                )}</td>

                                                <td>₹${amount.toFixed(2)}</td>
                                                <td>₹${received.toFixed(2)}</td>
                                                <td>₹${remaining.toFixed(2)}</td>

                                                <td>${escapeHTML(
                                                    fee.dueDate || "—"
                                                )}</td>

                                                <td>${escapeHTML(
                                                    fee.status || "pending"
                                                )}</td>
                                            </tr>
                                        `;
                                    }).join("")
                                    : `
                                        <tr>
                                            <td colspan="8">
                                                No fee records available.
                                            </td>
                                        </tr>
                                    `
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Admin fee loading failed:", error);

        container.innerHTML = `
            <p>
                Fee records could not be loaded.
                Check the administrator's Firestore permissions.
            </p>
        `;
    }
}

const refreshResultsButton =
    document.getElementById("refreshResultsButton");

if (refreshResultsButton) {
    refreshResultsButton.addEventListener("click", loadAdminResults);
}

// ============================================
// HOMEPAGE MANAGEMENT
// ============================================


// --------------------------------------------
// IMAGE URL VALIDATION
// --------------------------------------------

function isValidHomepageImageUrl(value) {

    if (!value) {
        return true;
    }

    try {

        const url = new URL(value);

        return url.protocol === "https:";

    }

    catch {
        return false;
    }

}


// --------------------------------------------
// IMAGE PREVIEW
// --------------------------------------------

function setupHomepageImagePreview(inputId, previewId, containerId) {

    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const container = document.getElementById(containerId);

    if (!input || !preview || !container) {
        return;
    }

    input.addEventListener("input", () => {

        const url = input.value.trim();

        if (!url || !isValidHomepageImageUrl(url)) {

            container.style.display = "none";
            preview.removeAttribute("src");

            return;
        }

        preview.onerror = () => {

            container.style.display = "none";

            showToast(
                "Image could not be loaded. Check the image URL.",
                "error"
            );

        };

        preview.onload = () => {

            container.style.display = "block";

        };

        preview.src = url;

    });

}

// ============================================
// RENDER PUBLIC FACULTY
// ============================================

function renderPublicFaculty(members = []) {

    const container =
        document.getElementById("publicFacultyGrid");

    if (!container || !Array.isArray(members)) return;

    container.replaceChildren();

    const sortedMembers = [...members].sort(
        (a, b) => Number(a.order) - Number(b.order)
    );

    sortedMembers.forEach(member => {

        const card = document.createElement("div");
        card.className = "faculty-card reveal";

        const photo = document.createElement("div");
        photo.className = "faculty-photo";

        if (member.imageUrl) {

            try {

                const url = new URL(member.imageUrl);

                if (url.protocol === "https:") {

                    const image = document.createElement("img");

                    image.src = url.href;
                    image.alt = member.name || "Faculty member";
                    image.loading = "lazy";
                    image.referrerPolicy = "no-referrer";

                    image.onerror = () => {
                        image.remove();
                        photo.textContent = "👩‍🏫";
                    };

                    photo.appendChild(image);

                } else {

                    photo.textContent = "👩‍🏫";

                }

            } catch {

                photo.textContent = "👩‍🏫";

            }

        } else {

            photo.textContent = "👩‍🏫";

        }

        const info = document.createElement("div");
        info.className = "faculty-info";

        const designation = document.createElement("small");
        designation.textContent = member.designation || "FACULTY";

        const name = document.createElement("h3");
        name.textContent = member.name || "";

        const department = document.createElement("p");
        department.textContent = member.department || "";

        info.append(designation, name, department);

        card.append(photo, info);

        container.appendChild(card);

    });

}

// --------------------------------------------
// LOAD HOMEPAGE CONTENT
// --------------------------------------------

async function loadHomepageContent() {

    try {

        const homepageRef = doc(
            db,
            "siteContent",
            "homepage"
        );

        const snapshot = await getDoc(homepageRef);

        if (!snapshot.exists()) {

            document.getElementById("homepageHeroForm")?.reset();
            document.getElementById("homepageAboutForm")?.reset();
            document.getElementById("homepageAcademicsForm")?.reset();
            document.getElementById("homepageStatsForm")?.reset();

            return;
        }

        const data = snapshot.data();
        // renderPublicFaculty(data.faculty?.members || []);

        const hero = data.hero || {};
        const about = data.about || {};


        // HERO FIELDS

        document.getElementById("heroBadge").value =
            hero.badge || "";

        document.getElementById("heroHeading").value =
            hero.heading || "";

        document.getElementById("heroDescription").value =
            hero.description || "";

        document.getElementById("heroImageUrl").value =
            hero.imageUrl || "";


        // ABOUT FIELDS

        document.getElementById("aboutHeading").value =
            about.heading || "";

        document.getElementById("aboutDescription").value =
            about.description || "";

        document.getElementById("aboutImageUrl").value =
            about.imageUrl || "";

        // ====================================
        // ACADEMICS SECTION
        // ====================================

        const academics = data.academics || {};

        document.getElementById("academicsHeading").value =
            academics.heading || "";

        document.getElementById("academicsDescription").value =
            academics.description || "";

        const cards = academics.cards || [];

        for (let i = 0; i < 4; i++) {

            const card = cards[i] || {};
            const number = i + 1;

            document.getElementById(`academic${number}Icon`).value =
                card.icon || "";

            document.getElementById(`academic${number}Title`).value =
                card.title || "";

            document.getElementById(`academic${number}Description`).value =
                card.description || "";

        }

        // ====================================
        // HOMEPAGE STATISTICS
        // ====================================

        const stats = data.stats || {};

        const heroStats = stats.heroStats || [];
        const mainStats = stats.cards || [];

        for (let i = 0; i < 3; i++) {

            const number = i + 1;
            const item = heroStats[i] || {};

            const valueInput = document.getElementById(
                `heroStat${number}Value`
            );

            const labelInput = document.getElementById(
                `heroStat${number}Label`
            );

            if (valueInput) valueInput.value = item.value || "";
            if (labelInput) labelInput.value = item.label || "";

        }

        for (let i = 0; i < 4; i++) {

            const number = i + 1;
            const item = mainStats[i] || {};

            const valueInput = document.getElementById(
                `publicStat${number}Value`
            );

            const labelInput = document.getElementById(
                `publicStat${number}Label`
            );

            if (valueInput) valueInput.value = item.value ?? "";
            if (labelInput) labelInput.value = item.label || "";

        }


        // REFRESH IMAGE PREVIEWS

        document.getElementById("heroImageUrl")
            .dispatchEvent(new Event("input"));

        document.getElementById("aboutImageUrl")
            .dispatchEvent(new Event("input"));

    }

    catch (error) {

        console.error(
            "Homepage loading error:",
            error
        );

        showToast(
            "Could not load homepage content.",
            "error"
        );

    }

}

// ============================================
// HOMEPAGE FACULTY MANAGEMENT
// ============================================

let homepageFaculty = [];

const facultyForm = document.getElementById("facultyForm");

const facultyList = document.getElementById("adminFacultyList");

function resetFacultyForm() {

    facultyForm.reset();

    document.getElementById("facultyEditId").value = "";

    document.getElementById("facultyOrder").value =
        homepageFaculty.length + 1;

    document.getElementById("saveFacultyButton").textContent =
        "Add Faculty Member";

    document.getElementById("cancelFacultyEdit").hidden = true;

}

async function loadHomepageFaculty() {

    try {

        const snapshot = await getDoc(
            doc(db, "siteContent", "homepage")
        );

        homepageFaculty = snapshot.exists()
            ? snapshot.data().faculty?.members || []
            : [];

        renderAdminFaculty();

    } catch (error) {

        console.error("Faculty loading error:", error);

        showToast("Could not load faculty members.", "error");

    }

}

function renderAdminFaculty() {

    if (!facultyList) return;

    if (homepageFaculty.length === 0) {

        facultyList.innerHTML =
            '<p class="empty-state">No faculty members added yet.</p>';

        return;

    }

    facultyList.replaceChildren();

    [...homepageFaculty]
        .sort((a, b) => Number(a.order) - Number(b.order))
        .forEach(member => {

            const card = document.createElement("div");

            card.className = "record-card";

            const name = document.createElement("h3");
            name.textContent = member.name;

            const details = document.createElement("p");

            details.textContent =
                `${member.designation} — ${member.department}`;

            const editButton = document.createElement("button");

            editButton.type = "button";
            editButton.textContent = "Edit";
            editButton.className = "secondary-button";

            editButton.addEventListener("click", () => {
                editFacultyMember(member.id);
            });

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.className = "danger-button";

            deleteButton.addEventListener("click", () => {
                deleteFacultyMember(member.id);
            });

            card.append(name, details, editButton, deleteButton);

            facultyList.appendChild(card);

        });

}

facultyForm?.addEventListener("submit", async event => {

    event.preventDefault();

    const name =
        document.getElementById("facultyName").value.trim();

    const designation =
        document.getElementById("facultyDesignation").value.trim();

    const department =
        document.getElementById("facultyDepartment").value.trim();

    const imageUrl =
        document.getElementById("facultyImageUrl").value.trim();

    const order = Number(
        document.getElementById("facultyOrder").value
    );

    const editId =
        document.getElementById("facultyEditId").value;

    if (!name || !designation || !department ||
        !Number.isInteger(order) || order < 1 || order > 100) {

        showToast("Please enter valid faculty information.", "error");
        return;

    }

    if (imageUrl) {

        try {

            if (new URL(imageUrl).protocol !== "https:") {
                throw new Error("HTTPS required");
            }

        } catch {

            showToast("Please enter a valid HTTPS photograph URL.", "error");
            return;

        }

    }

    const button =
        document.getElementById("saveFacultyButton");

    button.disabled = true;

    try {

        const member = {
            id: editId || crypto.randomUUID(),
            name,
            designation,
            department,
            imageUrl,
            order
        };

        if (editId) {

            homepageFaculty = homepageFaculty.map(item =>
                item.id === editId ? member : item
            );

        } else {

            homepageFaculty.push(member);

        }

        await setDoc(
            doc(db, "siteContent", "homepage"),
            {
                faculty: {
                    members: homepageFaculty
                },
                updatedAt: serverTimestamp(),
                updatedBy: auth.currentUser.uid
            },
            { merge: true }
        );

        renderAdminFaculty();
        resetFacultyForm();

        showToast("Faculty information saved successfully.", "success");

    } catch (error) {

        console.error("Faculty save error:", error);

        showToast(
            getFirebaseErrorMessage(error, "Could not save faculty information."),
            "error"
        );

        await loadHomepageFaculty();

    } finally {

        button.disabled = false;

    }

});

function editFacultyMember(id) {

    const member = homepageFaculty.find(item => item.id === id);

    if (!member) return;

    document.getElementById("facultyEditId").value = member.id;
    document.getElementById("facultyName").value = member.name;
    document.getElementById("facultyDesignation").value = member.designation;
    document.getElementById("facultyDepartment").value = member.department;
    document.getElementById("facultyImageUrl").value = member.imageUrl || "";
    document.getElementById("facultyOrder").value = member.order;

    document.getElementById("saveFacultyButton").textContent =
        "Update Faculty Member";

    document.getElementById("cancelFacultyEdit").hidden = false;

    facultyForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}

async function deleteFacultyMember(id) {
    if (!requireAdminSession()) {
        return;
    }

    if (!confirm("Are you sure you want to remove this faculty member?")) {
        return;
    }

    const previousFaculty = [...homepageFaculty];

    homepageFaculty = homepageFaculty.filter(
        member => member.id !== id
    );

    try {

        await setDoc(
            doc(db, "siteContent", "homepage"),
            {
                faculty: {
                    members: homepageFaculty
                },
                updatedAt: serverTimestamp(),
                updatedBy: auth.currentUser.uid
            },
            { merge: true }
        );

        renderAdminFaculty();

        showToast("Faculty member removed successfully.", "success");

        if (document.getElementById("facultyEditId").value === id) {
            resetFacultyForm();
        }

    } catch (error) {

        homepageFaculty = previousFaculty;

        renderAdminFaculty();

        console.error("Faculty deletion error:", error);

        showToast("Could not remove faculty member.", "error");

    }

}

document.getElementById("cancelFacultyEdit")
    ?.addEventListener("click", resetFacultyForm);


// ============================================
// HOMEPAGE ACHIEVEMENTS MANAGEMENT
// ============================================

let homepageAchievements = [];

async function loadHomepageAchievements() {

    try {

        const snapshot = await getDoc(
            doc(db, "siteContent", "homepage")
        );

        homepageAchievements = snapshot.exists()
            ? snapshot.data().achievements?.cards || []
            : [];

        if (snapshot.exists()) {

            const data = snapshot.data().achievements || {};

            document.getElementById("achievementsHeading").value =
                data.heading || "";

            document.getElementById("achievementsDescription").value =
                data.description || "";
        }

        renderAdminAchievements();

    } catch (error) {

        console.error("Achievements loading error:", error);

        showToast("Could not load achievements.", "error");

    }
}


function renderAdminAchievements() {

    const container = document.getElementById(
        "adminAchievementsList"
    );

    if (!container) return;

    container.replaceChildren();

    if (homepageAchievements.length === 0) {

        container.textContent = "No achievements added yet.";

        return;
    }

    const sorted = [...homepageAchievements].sort(
        (a, b) => Number(a.order) - Number(b.order)
    );

    sorted.forEach(item => {

        const card = document.createElement("div");

        card.className = "record-card";

        const title = document.createElement("h3");
        title.textContent = `${item.icon || "🏆"} ${item.title}`;

        const description = document.createElement("p");
        description.textContent = item.description || "";

        const category = document.createElement("small");
        category.textContent = item.category || "Other";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "secondary-button";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editHomepageAchievement(item.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "secondary-button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteHomepageAchievement(item.id);
        });

        card.append(
            title,
            description,
            category,
            editButton,
            deleteButton
        );

        container.appendChild(card);

    });

}


async function saveHomepageAchievements() {

    await setDoc(
        doc(db, "siteContent", "homepage"),
        {
            achievements: {
                heading: document.getElementById(
                    "achievementsHeading"
                ).value.trim(),

                description: document.getElementById(
                    "achievementsDescription"
                ).value.trim(),

                cards: homepageAchievements
            },

            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid

        },
        { merge: true }
    );

}


const achievementForm = document.getElementById(
    "achievementForm"
);

if (achievementForm) {

    achievementForm.addEventListener("submit", async event => {

        event.preventDefault();

        const editId = document.getElementById(
            "achievementEditId"
        ).value;

        const imageUrl = document.getElementById(
            "achievementImageUrl"
        ).value.trim();

        if (imageUrl) {

            try {

                if (new URL(imageUrl).protocol !== "https:") {
                    throw new Error("HTTPS required");
                }

            } catch {

                showToast(
                    "Please enter a valid HTTPS image URL.",
                    "error"
                );

                return;
            }

        }

        const achievement = {

            id: editId || crypto.randomUUID(),

            title: document.getElementById(
                "achievementTitle"
            ).value.trim(),

            category: document.getElementById(
                "achievementCategory"
            ).value,

            description: document.getElementById(
                "achievementDescription"
            ).value.trim(),

            icon: document.getElementById(
                "achievementIcon"
            ).value.trim() || "🏆",

            imageUrl,

            order: Number(
                document.getElementById(
                    "achievementOrder"
                ).value
            ) || 1

        };

        if (
            !achievement.title ||
            !achievement.description
        ) {

            showToast("Complete the required fields.", "error");

            return;
        }

        const button = document.getElementById(
            "saveAchievementButton"
        );

        button.disabled = true;

        try {

            if (editId) {

                homepageAchievements =
                    homepageAchievements.map(item =>
                        item.id === editId ? achievement : item
                    );

            } else {

                homepageAchievements.push(achievement);

            }

            await saveHomepageAchievements();

            achievementForm.reset();

            document.getElementById(
                "achievementEditId"
            ).value = "";

            document.getElementById(
                "achievementOrder"
            ).value = 1;

            document.getElementById(
                "saveAchievementButton"
            ).textContent = "Add Achievement";

            document.getElementById(
                "cancelAchievementEdit"
            ).hidden = true;

            renderAdminAchievements();

            showToast("Achievement saved successfully.", "success");

        } catch (error) {

            console.error(error);

            showToast("Could not save achievement.", "error");

        } finally {

            button.disabled = false;

        }

    });

}


function editHomepageAchievement(id) {

    const item = homepageAchievements.find(
        achievement => achievement.id === id
    );

    if (!item) return;

    document.getElementById("achievementEditId").value = item.id;
    document.getElementById("achievementTitle").value = item.title || "";
    document.getElementById("achievementCategory").value = item.category || "Other";
    document.getElementById("achievementDescription").value = item.description || "";
    document.getElementById("achievementIcon").value = item.icon || "";
    document.getElementById("achievementImageUrl").value = item.imageUrl || "";
    document.getElementById("achievementOrder").value = item.order || 1;

    document.getElementById(
        "saveAchievementButton"
    ).textContent = "Update Achievement";

    document.getElementById(
        "cancelAchievementEdit"
    ).hidden = false;

    achievementForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


async function deleteHomepageAchievement(id) {
    if (!requireAdminSession()) {
        return;
    }

    if (!confirm("Delete this achievement from the homepage?")) {
        return;
    }

    const previous = [...homepageAchievements];

    homepageAchievements = homepageAchievements.filter(
        item => item.id !== id
    );

    try {

        await saveHomepageAchievements();

        renderAdminAchievements();

        showToast("Achievement deleted.", "success");

    } catch (error) {

        homepageAchievements = previous;

        renderAdminAchievements();

        console.error(error);

        showToast("Could not delete achievement.", "error");

    }

}


document.getElementById(
    "cancelAchievementEdit"
)?.addEventListener("click", () => {

    achievementForm.reset();

    document.getElementById("achievementEditId").value = "";

    document.getElementById(
        "saveAchievementButton"
    ).textContent = "Add Achievement";

    document.getElementById(
        "cancelAchievementEdit"
    ).hidden = true;

});

// --------------------------------------------
// IMAGE PREVIEW LISTENERS
// --------------------------------------------

setupHomepageImagePreview(
    "heroImageUrl",
    "heroImagePreview",
    "heroImagePreviewContainer"
);

setupHomepageImagePreview(
    "aboutImageUrl",
    "aboutImagePreview",
    "aboutImagePreviewContainer"
);


// --------------------------------------------
// SAVE HERO SECTION
// --------------------------------------------

const homepageHeroForm =
    document.getElementById("homepageHeroForm");


if (homepageHeroForm) {

    homepageHeroForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const badge =
                document.getElementById("heroBadge").value.trim();

            const heading =
                document.getElementById("heroHeading").value.trim();

            const description =
                document.getElementById("heroDescription").value.trim();

            const imageUrl =
                document.getElementById("heroImageUrl").value.trim();


            if (!badge || !heading || !description) {

                showToast(
                    "Please complete all required hero fields.",
                    "error"
                );

                return;
            }


            if (!isValidHomepageImageUrl(imageUrl)) {

                showToast(
                    "Please enter a valid HTTPS image URL.",
                    "error"
                );

                return;
            }


            const button =
                document.getElementById("saveHeroButton");

            const originalText = button.textContent;

            button.disabled = true;
            button.textContent = "Saving...";


            try {

                await setDoc(
                    doc(db, "siteContent", "homepage"),

                    {
                        hero: {
                            badge,
                            heading,
                            description,
                            imageUrl
                        },

                        updatedAt: serverTimestamp(),

                        updatedBy: auth.currentUser.uid

                    },

                    { merge: true }
                );


                showToast(
                    "Hero section saved successfully.",
                    "success"
                );

            }

            catch (error) {

                console.error(
                    "Hero save error:",
                    error
                );

                showToast(
                    getFirebaseErrorMessage(
                        error,
                        "Could not save hero section."
                    ),
                    "error"
                );

            }

            finally {

                button.disabled = false;
                button.textContent = originalText;

            }

        }
    );

}


// --------------------------------------------
// SAVE ABOUT SECTION
// --------------------------------------------

const homepageAboutForm =
    document.getElementById("homepageAboutForm");


if (homepageAboutForm) {

    homepageAboutForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const heading =
                document.getElementById("aboutHeading").value.trim();

            const description =
                document.getElementById("aboutDescription").value.trim();

            const imageUrl =
                document.getElementById("aboutImageUrl").value.trim();


            if (!heading || !description) {

                showToast(
                    "Please complete all required About fields.",
                    "error"
                );

                return;
            }


            if (!isValidHomepageImageUrl(imageUrl)) {

                showToast(
                    "Please enter a valid HTTPS image URL.",
                    "error"
                );

                return;
            }


            const button =
                document.getElementById("saveAboutButton");

            const originalText = button.textContent;

            button.disabled = true;
            button.textContent = "Saving...";


            try {

                await setDoc(
                    doc(db, "siteContent", "homepage"),

                    {
                        about: {
                            heading,
                            description,
                            imageUrl
                        },

                        updatedAt: serverTimestamp(),

                        updatedBy: auth.currentUser.uid

                    },

                    { merge: true }
                );


                showToast(
                    "About section saved successfully.",
                    "success"
                );

            }

            catch (error) {

                console.error(
                    "About save error:",
                    error
                );

                showToast(
                    getFirebaseErrorMessage(
                        error,
                        "Could not save About section."
                    ),
                    "error"
                );

            }

            finally {

                button.disabled = false;
                button.textContent = originalText;

            }

        }
    );

}

// ============================================
// SAVE HOMEPAGE ACADEMICS
// ============================================

const homepageAcademicsForm =
    document.getElementById("homepageAcademicsForm");

if (homepageAcademicsForm) {

    homepageAcademicsForm.addEventListener("submit", async event => {

        event.preventDefault();

        const heading =
            document.getElementById("academicsHeading").value.trim();

        const description =
            document.getElementById("academicsDescription").value.trim();

        const cards = [];

        for (let i = 1; i <= 4; i++) {

            cards.push({

                icon: document.getElementById(`academic${i}Icon`).value.trim(),

                title: document.getElementById(`academic${i}Title`).value.trim(),

                description: document.getElementById(`academic${i}Description`).value.trim()

            });

        }

        if (!heading || !description) {

            showToast("Please complete the Academics section heading and description.", "error");

            return;

        }

        if (cards.some(card => !card.title || !card.description)) {

            showToast("Please complete all four academic cards.", "error");

            return;

        }

        const button =
            document.getElementById("saveAcademicsButton");

        const originalText = button.textContent;

        button.disabled = true;
        button.textContent = "Saving...";

        try {

            await setDoc(
                doc(db, "siteContent", "homepage"),
                {
                    academics: {
                        heading,
                        description,
                        cards
                    },

                    updatedAt: serverTimestamp(),
                    updatedBy: auth.currentUser.uid

                },
                { merge: true }
            );

            showToast("Academics section saved successfully.", "success");

        }

        catch (error) {

            console.error("Academics save error:", error);

            showToast(
                getFirebaseErrorMessage(error, "Could not save Academics section."),
                "error"
            );

        }

        finally {

            button.disabled = false;
            button.textContent = originalText;

        }

    });

}

// ============================================
// CLOUDINARY IMAGE UPLOAD
// ============================================

const CLOUDINARY_CLOUD_NAME = "yy1la9uu";
const CLOUDINARY_UPLOAD_PRESET = "soe_homepage_upload";

const cloudinaryImagePicker = document.getElementById(
    "cloudinaryImagePicker"
);

let cloudinaryTargetInput = null;
let cloudinaryUploadButton = null;


// Handle all four upload buttons
document.querySelectorAll(".cloudinary-upload-button").forEach(button => {

    button.addEventListener("click", () => {

        const targetId = button.dataset.uploadTarget;

        cloudinaryTargetInput = document.getElementById(targetId);
        cloudinaryUploadButton = button;

        if (!cloudinaryTargetInput || !cloudinaryImagePicker) {
            showToast("Image upload configuration is missing.", "error");
            return;
        }

        cloudinaryImagePicker.value = "";
        cloudinaryImagePicker.click();

    });

});


// Upload selected image
if (cloudinaryImagePicker) {

    cloudinaryImagePicker.addEventListener("change", async () => {

        const file = cloudinaryImagePicker.files[0];

        if (!file || !cloudinaryTargetInput) return;

        // Validate image type
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            showToast("Please select JPG, PNG or WebP.", "error");
            return;
        }

        // Maximum file size: 5 MB
        if (file.size > 5 * 1024 * 1024) {
            showToast("Image must be smaller than 5 MB.", "error");
            return;
        }

        const originalButtonText = cloudinaryUploadButton.textContent;

        cloudinaryUploadButton.disabled = true;
        cloudinaryUploadButton.textContent = "Uploading...";

        try {

            const formData = new FormData();

            formData.append("file", file);

            formData.append(
                "upload_preset",
                CLOUDINARY_UPLOAD_PRESET
            );

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );

            const result = await response.json();

            if (!response.ok || !result.secure_url) {
                throw new Error(
                    result.error?.message || "Cloudinary upload failed."
                );
            }

            // Insert uploaded image URL into the correct field
            cloudinaryTargetInput.value = result.secure_url;

            // Trigger existing image preview listeners
            cloudinaryTargetInput.dispatchEvent(
                new Event("input", { bubbles: true })
            );

            showToast("Image uploaded successfully!", "success");

        }

        catch (error) {

            console.error("Cloudinary upload error:", error);

            showToast(
                error.message || "Unable to upload image.",
                "error"
            );

        }

        finally {

            cloudinaryUploadButton.disabled = false;
            cloudinaryUploadButton.textContent = originalButtonText;

            cloudinaryTargetInput = null;
            cloudinaryUploadButton = null;

        }

    });

}

// ============================================
// HTML ESCAPE
// ============================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return entities[char];
    });
}
