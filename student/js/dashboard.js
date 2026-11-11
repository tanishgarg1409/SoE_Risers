// =========================================
// SoE RISERS - STUDENT DASHBOARD
// =========================================

import {
    onAuthStateChanged,
    signOut
} from
    "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where
} from
    "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    auth,
    db
} from "../../js/firebase.js";


// =========================================
// STATE
// =========================================

let currentUser = null;
let currentStudent = null;
let currentStudentId = null;


// =========================================
// DOM
// =========================================

const loadingScreen =
    document.getElementById("loadingScreen");

const logoutButton =
    document.getElementById("logoutButton");


// =========================================
// UTILITY
// =========================================

function hideLoading() {

    loadingScreen.classList.add("hidden");

}


function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================================
// NAVIGATION
// =========================================

function setupNavigation() {

    const navItems =
        document.querySelectorAll(".nav-item");


    const sections = {

        overview:
            document.getElementById(
                "overviewSection"
            ),

        attendance:
            document.getElementById(
                "attendanceSection"
            ),

        results:
            document.getElementById(
                "resultsSection"
            ),

        fees:
            document.getElementById(
                "feesSection"
            ),

        notices:
            document.getElementById(
                "noticesSection"
            )

    };


    function openSection(name) {

        Object.values(sections)
            .forEach((section) => {

                section.classList.remove("active");

            });


        if (sections[name]) {

            sections[name]
                .classList.add("active");

        }


        navItems.forEach((item) => {

            item.classList.toggle(
                "active",
                item.dataset.section === name
            );

        });

    }


    navItems.forEach((item) => {

        item.addEventListener(
            "click",
            () => {

                openSection(
                    item.dataset.section
                );

            }
        );

    });


    document
        .querySelectorAll(
            "[data-section-target]"
        )
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    openSection(
                        button.dataset.sectionTarget
                    );

                }
            );

        });

}


// =========================================
// LOAD STUDENT ACCOUNT
// =========================================

async function loadStudentAccount(user) {

    const userRef =
        doc(
            db,
            "users",
            user.uid
        );


    const userSnap =
        await getDoc(userRef);


    if (!userSnap.exists()) {

        throw new Error(
            "Your school account could not be found."
        );

    }


    const userData =
        userSnap.data();


    // -----------------------------------------
    // ROLE
    // -----------------------------------------

    if (
        userData.role !==
        "student"
    ) {

        throw new Error(
            "This account is not registered as a student."
        );

    }


    // -----------------------------------------
    // STATUS
    // -----------------------------------------

    if (
        userData.status !==
        "active"
    ) {

        throw new Error(
            "Your student account is not active."
        );

    }


    // -----------------------------------------
    // STUDENT ID
    // -----------------------------------------

    if (
        !userData.studentId
    ) {

        throw new Error(
            "Your account is not linked to a Student ID."
        );

    }


    currentStudentId =
        userData.studentId;


    // -----------------------------------------
    // STUDENT RECORD
    // -----------------------------------------

    const studentRef =
        doc(
            db,
            "students",
            currentStudentId
        );


    const studentSnap =
        await getDoc(studentRef);


    if (!studentSnap.exists()) {

        throw new Error(
            "Your student record could not be found."
        );

    }


    const student =
        studentSnap.data();


    // -----------------------------------------
    // UID SECURITY CHECK
    // -----------------------------------------

    if (
        student.firebaseUid !==
        user.uid
    ) {

        throw new Error(
            "Your account is not correctly linked to this student record."
        );

    }


    if (
        student.status !==
        "active"
    ) {

        throw new Error(
            "Your student account is not active."
        );

    }


    // -----------------------------------------
    // EMAIL SECURITY CHECK
    // -----------------------------------------

    if (
        student.email &&
        user.email &&
        student.email
            .toLowerCase() !==
        user.email
            .toLowerCase()
    ) {

        throw new Error(
            "Your account email does not match the school record."
        );

    }


    currentStudent =
        student;


    return student;

}

// =========================================
// RENDER STUDENT PROFILE
// =========================================

async function renderProfile(student) {

    const name = student.name || "Student";

    // Header profile
    document.getElementById("welcomeText").textContent =
        `Welcome, ${name}`;

    document.getElementById("profileName").textContent =
        name;

    document.getElementById("profileId").textContent =
        student.studentId || currentStudentId || "—";

    document.getElementById("profileInitial").textContent =
        name.charAt(0).toUpperCase();

    // Student details
    document.getElementById("studentName").textContent =
        name;

    document.getElementById("studentIdDisplay").textContent =
        student.studentId || currentStudentId || "—";

    document.getElementById("studentRollNo").textContent =
        student.rollNo || "—";

    document.getElementById("studentSection").textContent =
        student.section || "—";

    document.getElementById("studentStatus").textContent =
        student.status || "Active";

    // Default class label
    let classLabel = student.classId || "—";

    // Resolve the internal class ID into a readable class name.
    // If the class document cannot be loaded, keep the original ID.
    if (student.classId) {

        try {

            const classRef = doc(
                db,
                "classes",
                student.classId
            );

            const classSnap = await getDoc(classRef);

            if (classSnap.exists()) {

                const classData = classSnap.data();

                const className =
                    classData.className || student.classId;

                const section =
                    classData.section || student.section || "";

                classLabel = section
                    ? `Class ${className}-${section}`
                    : `Class ${className}`;

            }

        } catch (error) {

            console.warn(
                "Could not load class details; using class ID instead.",
                error
            );

        }

    }

    document.getElementById("studentClass").textContent =
        classLabel;

}


// =========================================
// LOAD ATTENDANCE
// =========================================

async function loadAttendance() {

    const container =
        document.getElementById(
            "attendanceContainer"
        );


    try {

        const attendanceQuery =
            query(
                collection(
                    db,
                    "attendance"
                ),
                where(
                    "studentId",
                    "==",
                    currentStudentId
                )
            );


        const snapshot =
            await getDocs(
                attendanceQuery
            );


        if (snapshot.empty) {

            container.innerHTML = `
                <p class="empty-state">
                    No attendance records available yet.
                </p>
            `;

            document.getElementById(
                "attendancePercentage"
            ).textContent = "—";

            return;
        }


        let present = 0;
        let total = 0;


        let html = "";


        snapshot.forEach((docSnap) => {

            const data =
                docSnap.data();


            total++;


            const status =
                String(
                    data.status || ""
                ).toLowerCase();


            if (
                status === "present" ||
                status === "p"
            ) {

                present++;

            }


            html += `

                <div class="record-card">

                    <h3>
                        ${escapeHtml(
                            data.subject || "Attendance"
                        )}
                    </h3>

                    <p>
                        ${escapeHtml(
                            data.date || "Date not available"
                        )}
                    </p>

                    <div class="record-meta">

                        <span>
                            Status:
                            ${escapeHtml(
                                data.status || "—"
                            )}
                        </span>

                    </div>

                </div>

            `;

        });


        container.innerHTML =
            html;


        const percentage =
            total > 0
                ? Math.round(
                    (present / total) * 100
                )
                : 0;


        document.getElementById(
            "attendancePercentage"
        ).textContent =
            `${percentage}%`;

    }

    catch (error) {

        console.error(
            "Attendance loading error:",
            error
        );

        container.innerHTML = `
            <p class="empty-state">
                Attendance could not be loaded.
            </p>
        `;

    }

}

// =========================================
// LOAD PUBLISHED STUDENT RESULTS
// =========================================

async function loadResults() {
    const container = document.getElementById("resultsContainer");
    const recent = document.getElementById("recentResults");
    const resultCount = document.getElementById("resultCount");

    if (!container || !recent || !resultCount) {
        console.error("One or more student results elements are missing.");
        return;
    }

    container.innerHTML = `
        <p class="empty-state">Loading results...</p>
    `;

    try {
        if (!currentStudentId) {
            throw new Error("Student ID is unavailable.");
        }

        // Retrieve only this student's published results.
        const resultsQuery = query(
            collection(db, "results"),
            where("studentId", "==", currentStudentId),
            where("status", "==", "published")
        );

        const snapshot = await getDocs(resultsQuery);

        const results = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
        }));

        // Newest results first when timestamps are available.
        results.sort((a, b) => {
            const aTime =
                a.publishedAt?.toMillis?.() ||
                a.submittedAt?.toMillis?.() ||
                a.updatedAt?.toMillis?.() ||
                0;

            const bTime =
                b.publishedAt?.toMillis?.() ||
                b.submittedAt?.toMillis?.() ||
                b.updatedAt?.toMillis?.() ||
                0;

            return bTime - aTime;
        });

        resultCount.textContent = results.length;

        if (results.length === 0) {
            const empty = `
                <p class="empty-state">
                    No published results are available yet.
                </p>
            `;

            container.innerHTML = empty;
            recent.innerHTML = empty;
            return;
        }

        // Safely format and render a complete result.
        const renderResult = (result) => {
            const examName =
                result.examName ||
                result.exam ||
                "Examination";

            const academicYear =
                result.academicYear || "—";

            const classLabel = [
                result.className
                    ? `Class ${result.className}`
                    : "",
                result.section
                    ? `Section ${result.section}`
                    : ""
            ].filter(Boolean).join(" · ") || "—";

            const subjects = Array.isArray(result.subjects)
                ? result.subjects
                : [];

            const subjectRows = subjects.length
                ? subjects.map((subject) => `
                    <div class="record-meta">
                        <span>
                            ${escapeHtml(subject.subjectName || "Subject")}
                        </span>
                        <span>
                            ${escapeHtml(subject.marks ?? "—")}
                            /
                            ${escapeHtml(subject.maxMarks ?? "—")}
                        </span>
                    </div>
                `).join("")
                : `
                    <p>No subject-wise marks are available.</p>
                `;

            const totalMarks = result.totalMarks ?? "—";
            const maximumMarks = result.maximumMarks ?? "—";

            const percentage =
                typeof result.percentage === "number"
                    ? `${result.percentage}%`
                    : "—";

            return `
                <div class="record-card">
                    <h3>${escapeHtml(examName)}</h3>

                    <p>
                        Academic Year:
                        ${escapeHtml(academicYear)}
                    </p>

                    <p>
                        ${escapeHtml(classLabel)}
                        ${result.term
                            ? ` · ${escapeHtml(result.term)}`
                            : ""}
                    </p>

                    <div class="result-subjects">
                        ${subjectRows}
                    </div>

                    <div class="record-meta">
                        <strong>Total Marks</strong>
                        <strong>
                            ${escapeHtml(totalMarks)}
                            /
                            ${escapeHtml(maximumMarks)}
                        </strong>
                    </div>

                    <div class="record-meta">
                        <strong>Percentage</strong>
                        <strong>${escapeHtml(percentage)}</strong>
                    </div>
                </div>
            `;
        };

        container.innerHTML = results
            .map(renderResult)
            .join("");

        recent.innerHTML = results
            .slice(0, 3)
            .map(renderResult)
            .join("");

    } catch (error) {
        console.error("Results loading error:", error);

        container.innerHTML = `
            <p class="empty-state">
                Results could not be loaded. Please try again later.
            </p>
        `;

        recent.innerHTML = `
            <p class="empty-state">
                Results could not be loaded.
            </p>
        `;

        resultCount.textContent = "—";
    }
}

// =====================================================
// STUDENT FEE DISPLAY
// =====================================================

async function loadFees() {
    const container = document.getElementById("feesContainer");

    if (!container) return;

    container.innerHTML = "<p>Loading fees...</p>";

    try {
        const feesQuery = query(
            collection(db, "fees"),
            where("studentId", "==", currentStudentId)
        );

        const snapshot = await getDocs(feesQuery);

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

        const feeCount = document.getElementById("feeCount");

        if (feeCount) {
            feeCount.textContent = fees.length;
        }

        if (snapshot.empty) {
            container.innerHTML = `
                <p class="empty-state">
                    No fee records are available yet.
                </p>
            `;
            return;
        }

        container.innerHTML = `
            <div class="content-card">
                <h3>My Fee Summary</h3>

                <div class="record-meta">
                    <span>Total fee: ₹${total.toFixed(2)}</span>
                    <span>Paid: ₹${paid.toFixed(2)}</span>
                    <span>Remaining: ₹${balance.toFixed(2)}</span>
                </div>
            </div>

            ${fees.map(fee => {
                const payments = Array.isArray(fee.payments)
                    ? fee.payments
                    : [];

                return `
                    <div class="record-card">
                        <h3>${escapeHtml(
                            fee.title || "Fee Record"
                        )}</h3>

                        <p>
                            Status:
                            ${escapeHtml(fee.status || "pending")}
                        </p>

                        <div class="record-meta">
                            <span>
                                Total: ₹${Number(
                                    fee.amount || 0
                                ).toFixed(2)}
                            </span>

                            <span>
                                Paid: ₹${Number(
                                    fee.paidAmount || 0
                                ).toFixed(2)}
                            </span>

                            <span>
                                Balance: ₹${Number(
                                    fee.balance ??
                                    Math.max(
                                        0,
                                        Number(fee.amount || 0) -
                                        Number(fee.paidAmount || 0)
                                    )
                                ).toFixed(2)}
                            </span>

                            <span>
                                Due date:
                                ${escapeHtml(fee.dueDate || "Not specified")}
                            </span>
                        </div>

                        <h4>Payment History</h4>

                        ${
                            payments.length
                                ? `
                                    <ul>
                                        ${payments.map(payment => `
                                            <li>
                                                ₹${Number(
                                                    payment.amount || 0
                                                ).toFixed(2)}
                                                — ${escapeHtml(
                                                    payment.note || "Payment received"
                                                )}
                                                — ${escapeHtml(
                                                    payment.receivedAt
                                                        ? new Date(
                                                            payment.receivedAt
                                                        ).toLocaleDateString()
                                                        : "Date unavailable"
                                                )}
                                            </li>
                                        `).join("")}
                                    </ul>
                                `
                                : "<p>No payments recorded.</p>"
                        }
                    </div>
                `;
            }).join("")}
        `;
    } catch (error) {
        console.error("Student fee loading failed:", error);

        container.innerHTML = `
            <p class="empty-state">
                Fee records could not be loaded.
            </p>
        `;
    }
}


// =========================================
// LOAD NOTICES
// =========================================

async function loadNotices() {

    const container =
        document.getElementById("noticesContainer");

    const recent =
        document.getElementById("recentNotices");

    if (!container || !recent) {
        console.error(
            "Notices containers were not found in the student dashboard."
        );
        return;
    }

    try {

        const snapshot = await getDocs(
            collection(db, "notices")
        );

        const notices = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        // Show published notices and older notices
        // that do not yet have a status field.
        const visibleNotices = notices.filter(item =>
            !item.status ||
            item.status === "published"
        );

        // Newest notices first
        visibleNotices.sort((a, b) => {

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

        document.getElementById(
            "noticeCount"
        ).textContent = visibleNotices.length;


        if (visibleNotices.length === 0) {

            const empty = `
                <p class="empty-state">
                    No notices available.
                </p>
            `;

            container.innerHTML = empty;
            recent.innerHTML = empty;

            return;

        }


        // Safely display a notice
        const renderNotice = data => {

            let displayDate =
                data.date || "School announcement";

            const timestamp =
                data.publishedAt || data.createdAt;

            if (timestamp?.toDate) {

                displayDate =
                    timestamp.toDate().toLocaleDateString();

            }

            return `
                <div class="record-card">

                    <h3>
                        ${escapeHtml(
                            data.title || "School Notice"
                        )}
                    </h3>

                    <p>
                        ${escapeHtml(
                            data.message ||
                            data.description ||
                            "No notice details."
                        )}
                    </p>

                    <div class="record-meta">

                        <span>
                            ${escapeHtml(
                                data.category || "General"
                            )}
                        </span>

                        <span>
                            ${escapeHtml(displayDate)}
                        </span>

                    </div>

                </div>
            `;

        };


        // All notices in the Notices section
        container.innerHTML =
            visibleNotices.map(renderNotice).join("");


        // Only the three newest notices on Overview
        recent.innerHTML =
            visibleNotices
                .slice(0, 3)
                .map(renderNotice)
                .join("");


    } catch (error) {

        console.error(
            "Notices loading error:",
            error
        );

        container.innerHTML = `
            <p class="empty-state">
                Notices could not be loaded.
            </p>
        `;

        recent.innerHTML = `
            <p class="empty-state">
                Notices could not be loaded.
            </p>
        `;

    }

}


// =========================================
// LOGOUT
// =========================================

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(auth);

            window.location.href =
                "../login.html";

        }

        catch (error) {

            console.error(
                "Logout error:",
                error
            );

            showToast(
                "Unable to logout. Please try again."
            );

        }

    }
);


// =========================================
// AUTH STATE
// =========================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "../login.html";

            return;

        }


        currentUser =
            user;


        try {

            setupNavigation();


            const student =
                await loadStudentAccount(
                    user
                );


            await renderProfile(student);

            await Promise.all([
                loadAttendance(),
                loadResults(),
                loadFees(),
                loadNotices()
            ]);


            hideLoading();

        }

        catch (error) {

            console.error(
                "Student dashboard error:",
                error
            );


            alert(
                error.message ||
                "Unable to load your student account."
            );


            await signOut(auth);


            window.location.href =
                "../login.html";

        }

    }
);