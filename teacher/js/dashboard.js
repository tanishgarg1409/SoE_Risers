import {
    auth,
    db,
    studentAuth
} from "../../js/firebase.js";


import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";


import {
    createUserWithEmailAndPassword,
    signOut as signOutStudentAuth
} from
    "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";


import {
    collection,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    query,
    where,
    serverTimestamp
} from
    "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";



/* =========================================================
   TEACHER DASHBOARD
   =========================================================

   Responsibilities:

   1. Verify Firebase teacher authentication.
   2. Verify users/{uid}.
   3. Load teachers/{teacherId}.
   4. Load only assigned classes.
   5. Load assigned subjects.
   6. Allow only class in-charge to add students.
   7. Create Firebase student account.
   8. Link Firebase UID to students/{studentId}.
   9. Allow assigned teachers to view students.

========================================================= */



/* =========================================================
   STATE
========================================================= */

let currentTeacher = null;

let myClasses = [];

let subjects = [];

let students = [];

let selectedClassId = "";

let dashboardInitialized = false;

let studentManagementInitialized = false;



/* =========================================================
   ELEMENTS
========================================================= */

const teacherName =
    document.getElementById("teacherName");


const teacherIdDisplay =
    document.getElementById("teacherIdDisplay");


const teacherWelcome =
    document.getElementById("teacherWelcome");


const classCount =
    document.getElementById("classCount");


const subjectCount =
    document.getElementById("subjectCount");


const studentCount =
    document.getElementById("studentCount");


const myClassesContainer =
    document.getElementById("myClassesContainer");


const classesPageContainer =
    document.getElementById("classesPageContainer");


const logoutButton =
    document.getElementById("logoutButton");


const navItems =
    document.querySelectorAll(".nav-item");


const sections =
    document.querySelectorAll(".dashboard-section");


const studentClassSelect =
    document.getElementById("studentClassSelect");


const addStudentButton =
    document.getElementById("addStudentButton");


const createStudentAccountButton =
    document.getElementById(
        "createStudentAccountButton"
    );


const studentListContainer =
    document.getElementById("studentListContainer");


const studentModal =
    document.getElementById("studentModal");


const studentForm =
    document.getElementById("studentForm");


const studentIdInput =
    document.getElementById("studentId");


const studentNameInput =
    document.getElementById("studentName");


const studentRollNoInput =
    document.getElementById("studentRollNo");


const studentSectionInput =
    document.getElementById("studentSection");


const studentEmailInput =
    document.getElementById("studentEmail");


const studentPasswordInput =
    document.getElementById("studentPassword");


const generateStudentIdButton =
    document.getElementById("generateStudentId");



/* =========================================================
   INITIAL UI STATE
========================================================= */

if (addStudentButton) {

    addStudentButton.disabled =
        true;

}


if (studentCount) {

    studentCount.textContent =
        "0";

}



/* =========================================================
   TEACHER AUTHENTICATION
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "../../login.html";

            return;
        }


        try {

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

                console.error(
                    "Teacher user document does not exist."
                );


                showToast(
                    "Teacher account information was not found.",
                    "error"
                );


                await signOut(auth);


                window.location.href =
                    "../../login.html";

                return;
            }


            const userData =
                userSnap.data();


            if (
                userData.role !== "teacher" ||
                userData.status !== "active"
            ) {

                console.error(
                    "Unauthorized teacher account:",
                    userData
                );


                showToast(
                    "You are not authorized to access the teacher portal.",
                    "error"
                );


                await signOut(auth);


                window.location.href =
                    "../../login.html";

                return;
            }


            if (!userData.teacherId) {

                showToast(
                    "No Teacher ID is linked to this account.",
                    "error"
                );


                await signOut(auth);


                window.location.href =
                    "../../login.html";

                return;
            }


            currentTeacher = {

                ...userData,

                firebaseUid:
                    user.uid

            };


            await loadTeacher();


        } catch (error) {

            console.error(
                "Teacher authentication error:",
                error
            );


            showToast(
                getFriendlyError(error),
                "error"
            );

        }

    }
);



/* =========================================================
   LOAD TEACHER RECORD
========================================================= */

async function loadTeacher() {

    const teacherId =
        currentTeacher.teacherId;


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

        console.error(
            "Teacher record not found:",
            teacherId
        );


        showToast(
            "Your teacher record could not be found.",
            "error"
        );


        await signOut(auth);


        window.location.href =
            "../../login.html";

        return;
    }


    const teacherData =
        teacherSnap.data();


    if (
        teacherData.status &&
        teacherData.status !== "active"
    ) {

        showToast(
            "Your teacher account is currently inactive.",
            "error"
        );


        await signOut(auth);


        window.location.href =
            "../../login.html";

        return;
    }


    if (
        teacherData.firebaseUid &&
        teacherData.firebaseUid !==
            currentTeacher.firebaseUid
    ) {

        console.error(
            "Teacher UID mismatch.",
            {
                authUid:
                    currentTeacher.firebaseUid,

                teacherUid:
                    teacherData.firebaseUid
            }
        );


        showToast(
            "Teacher account verification failed.",
            "error"
        );


        await signOut(auth);


        window.location.href =
            "../../login.html";

        return;
    }


    currentTeacher = {

        ...currentTeacher,

        ...teacherData,

        documentId:
            teacherSnap.id

    };


    if (teacherName) {

        teacherName.textContent =
            teacherData.name ||
            "Teacher";

    }


    if (teacherIdDisplay) {

        teacherIdDisplay.textContent =
            teacherData.teacherId ||
            "";

    }


    if (teacherWelcome) {

        teacherWelcome.textContent =
            `Welcome, ${teacherData.name || "Teacher"}`;

    }


    await loadAssignedClasses();

    await initializeDashboard();

}



/* =========================================================
   INITIALIZE DASHBOARD
========================================================= */

async function initializeDashboard() {

    if (dashboardInitialized) {
        return;
    }

    dashboardInitialized = true;

    setupNavigation();
    setupLogout();
    setupStudentManagement();
    setupTeacherResults();
    setupTeacherFees();
}



/* =========================================================
   LOAD ASSIGNED CLASSES
========================================================= */

async function loadAssignedClasses() {

    myClasses = [];

    const assignedClasses =
        Array.isArray(
            currentTeacher.assignedClasses
        )
            ? currentTeacher.assignedClasses
            : [];

    for (
        const assignment
        of assignedClasses
    ) {

        if (
            !assignment ||
            !assignment.classId
        ) {
            continue;
        }

        try {

            const classRef =
                doc(
                    db,
                    "classes",
                    assignment.classId
                );

            const classSnap =
                await getDoc(
                    classRef
                );


            if (!classSnap.exists()) {

                console.warn(
                    "Assigned class no longer exists:",
                    assignment.classId
                );

                continue;
            }


            const classData =
                classSnap.data();


            const isClassIncharge =
                classData.inchargeTeacherId ===
                currentTeacher.teacherId;


            const assignmentSubjectIds =
                Array.isArray(
                    assignment.subjectIds
                )
                    ? assignment.subjectIds
                    : [];


            myClasses.push({

                classId:
                    assignment.classId,

                className:
                    classData.className ||
                    "Class",

                section:
                    classData.section ||
                    "",

                subjectIds:
                    assignmentSubjectIds,

                incharge:
                    isClassIncharge,

                inchargeTeacherId:
                    classData.inchargeTeacherId ||
                    null,

                teacherIds:
                    Array.isArray(
                        classData.teacherIds
                    )
                        ? classData.teacherIds
                        : [],

                teacherAssignments:
                    Array.isArray(
                        classData.teacherAssignments
                    )
                        ? classData.teacherAssignments
                        : [],

                studentCount:
                    Number(
                        classData.studentCount ||
                        0
                    ),

                ...classData

            });


        } catch (error) {

            console.error(
                "Error loading assigned class:",
                assignment.classId,
                error
            );

        }

    }


    myClasses.sort(
        (a, b) => {

            const first =
                `${a.className} ${a.section}`;


            const second =
                `${b.className} ${b.section}`;


            return first.localeCompare(
                second,
                undefined,
                {
                    numeric: true,
                    sensitivity: "base"
                }
            );

        }
    );


    await loadSubjects();

    renderClasses();

    await loadTeacherStudentCount();

}



/* =========================================================
   LOAD SUBJECTS
========================================================= */

async function loadSubjects() {

    subjects = [];


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "subjects"
                )
            );


        snapshot.forEach(
            (docSnap) => {

                const data =
                    docSnap.data();


                if (
                    data.status &&
                    data.status !== "active"
                ) {

                    return;

                }


                subjects.push({

                    id:
                        docSnap.id,

                    ...data

                });

            }
        );


        subjects.sort(
            (a, b) =>
                (a.name || "")
                    .localeCompare(
                        b.name || ""
                    )
        );


    } catch (error) {

        console.error(
            "Error loading subjects:",
            error
        );


        showToast(
            "Some subject information could not be loaded.",
            "error"
        );

    }

}



/* =========================================================
   RENDER CLASSES
========================================================= */

function renderClasses() {

    if (classCount) {

        classCount.textContent =
            String(
                myClasses.length
            );

    }


    const allSubjectIds =
        new Set();


    myClasses.forEach(
        (classData) => {

            (
                classData.subjectIds || []
            ).forEach(
                (subjectId) => {

                    allSubjectIds.add(
                        subjectId
                    );

                }
            );

        }
    );


    if (subjectCount) {

        subjectCount.textContent =
            String(
                allSubjectIds.size
            );

    }


    if (myClasses.length === 0) {

        const emptyHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    📚
                </div>

                <h3>
                    No classes assigned
                </h3>

                <p>
                    The administrator has not assigned
                    any classes to you yet.
                </p>

            </div>

        `;


        if (myClassesContainer) {

            myClassesContainer.innerHTML =
                emptyHTML;

        }


        if (classesPageContainer) {

            classesPageContainer.innerHTML =
                emptyHTML;

        }


        return;
    }


    const html =
        myClasses
            .map(
                createClassCard
            )
            .join("");


    if (myClassesContainer) {

        myClassesContainer.innerHTML =
            html;

    }


    if (classesPageContainer) {

        classesPageContainer.innerHTML =
            html;

    }

}



/* =========================================================
   CREATE CLASS CARD
========================================================= */

function createClassCard(classData) {

    const subjectIds =
        Array.isArray(
            classData.subjectIds
        )
            ? classData.subjectIds
            : [];


    const subjectNames =
        subjectIds.map(
            (subjectId) => {

                const subject =
                    subjects.find(
                        (item) =>
                            item.id ===
                            subjectId
                    );


                return subject
                    ? subject.name
                    : subjectId;

            }
        );


    const subjectsHTML =
        subjectNames.length

            ? subjectNames
                .map(
                    (name) => `

                        <span class="subject-chip">

                            ${escapeHTML(name)}

                        </span>

                    `
                )
                .join("")

            : `

                <span class="class-code">

                    No subjects assigned

                </span>

            `;


    const inchargeHTML =
        classData.incharge

            ? `

                <span class="incharge-badge">

                    CLASS IN-CHARGE

                </span>

            `

            : `

                <span class="class-code">

                    Subject Teacher

                </span>

            `;


    return `

        <div
            class="class-card"
            data-class-id="${escapeHTML(
                classData.classId
            )}"
        >

            <div class="class-card-header">

                <div>

                    <h3>

                        ${escapeHTML(
                            classData.className ||
                            "Class"
                        )}

                    </h3>


                    <div class="class-code">

                        Section:
                        ${escapeHTML(
                            classData.section ||
                            "-"
                        )}

                    </div>

                </div>


                ${inchargeHTML}

            </div>


            <div>

                <p
                    class="class-code"
                    style="margin-bottom: 8px;"
                >
                    Subjects
                </p>


                <div class="subject-list">

                    ${subjectsHTML}

                </div>

            </div>

        </div>

    `;

}



/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    navItems.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const sectionId =
                        button.dataset.section;


                    navItems.forEach(
                        (item) =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    sections.forEach(
                        (section) =>
                            section.classList.remove(
                                "active"
                            )
                    );


                    button.classList.add(
                        "active"
                    );


                    const section =
                        document.getElementById(
                            sectionId
                        );


                    if (section) {

                        section.classList.add(
                            "active"
                        );

                    }

                }
            );

        }
    );

}



/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {

    if (!logoutButton) {

        return;

    }


    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                logoutButton.disabled =
                    true;


                await signOut(auth);


                window.location.href =
                    "../../login.html";


            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );


                logoutButton.disabled =
                    false;


                showToast(
                    "Logout failed. Please try again.",
                    "error"
                );

            }

        }
    );

}



/* =========================================================
   STUDENT MANAGEMENT SETUP
========================================================= */

function setupStudentManagement() {

    if (
        studentManagementInitialized
    ) {

        return;

    }


    studentManagementInitialized =
        true;


    if (!studentClassSelect) {

        return;

    }


    populateStudentClasses();


    studentClassSelect.addEventListener(
        "change",
        async () => {

            selectedClassId =
                studentClassSelect.value;


            updateStudentManagementPermissions();


            if (!selectedClassId) {

                students = [];


                if (studentListContainer) {

                    studentListContainer.innerHTML = `

                        <div class="empty-state">

                            <div class="empty-icon">
                                👨‍🎓
                            </div>

                            <h3>
                                Select a class
                            </h3>

                            <p>
                                Select one of your assigned
                                classes to view its students.
                            </p>

                        </div>

                    `;

                }


                if (studentCount) {

                    studentCount.textContent =
                        String(
                            await getTotalAssignedStudentCount()
                        );

                }


                return;

            }


            await loadStudents();

        }
    );


    if (addStudentButton) {

        addStudentButton.addEventListener(
            "click",
            () => {

                if (!selectedClassId) {

                    showToast(
                        "Please select a class first.",
                        "error"
                    );

                    return;

                }


                const selectedClass =
                    getSelectedClass();


                if (
                    !selectedClass ||
                    !selectedClass.incharge
                ) {

                    showToast(
                        "Only the class in-charge teacher can add students.",
                        "error"
                    );

                    return;

                }


                if (studentForm) {

                    studentForm.reset();

                }


                if (studentIdInput) {

                    studentIdInput.value =
                        "";

                }


                if (studentSectionInput) {

                    studentSectionInput.value =
                        selectedClass.section ||
                        "";

                }


                openStudentModal();

            }
        );

    }


    if (generateStudentIdButton) {

        generateStudentIdButton.addEventListener(
            "click",
            async () => {

                generateStudentIdButton.disabled =
                    true;


                try {

                    const id =
                        await generateUniqueStudentId();


                    if (studentIdInput) {

                        studentIdInput.value =
                            id;

                    }

                } catch (error) {

                    console.error(
                        "Student ID generation error:",
                        error
                    );


                    showToast(
                        "Could not generate Student ID.",
                        "error"
                    );

                } finally {

                    generateStudentIdButton.disabled =
                        false;

                }

            }
        );

    }


    document
        .querySelectorAll(
            "[data-close-student-modal]"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    closeStudentModal
                );

            }
        );


    if (studentModal) {

        studentModal.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    studentModal
                ) {

                    closeStudentModal();

                }

            }
        );

    }


    if (studentForm) {

        studentForm.addEventListener(
            "submit",
            addStudent
        );

    }


    updateStudentManagementPermissions();

}



/* =========================================================
   POPULATE STUDENT CLASS DROPDOWN
========================================================= */

function populateStudentClasses() {

    if (!studentClassSelect) {

        return;

    }


    studentClassSelect.innerHTML = `

        <option value="">
            Select a class
        </option>

    `;


    myClasses.forEach(
        (classData) => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                classData.classId;


            option.textContent =
                `${classData.className} - Section ${classData.section}`;


            studentClassSelect.appendChild(
                option
            );

        }
    );

}



/* =========================================================
   UPDATE STUDENT MANAGEMENT PERMISSIONS
========================================================= */

function updateStudentManagementPermissions() {

    const selectedClass =
        getSelectedClass();


    const canAddStudents =
        Boolean(
            selectedClass &&
            selectedClass.incharge
        );


    if (addStudentButton) {

        addStudentButton.disabled =
            !canAddStudents;


        addStudentButton.title =
            canAddStudents
                ? "Add a student to this class"
                : "Only the class in-charge can add students";

    }


    if (
        selectedClass &&
        studentSectionInput
    ) {

        studentSectionInput.value =
            selectedClass.section ||
            "";

    }

}



/* =========================================================
   GET SELECTED CLASS
========================================================= */

function getSelectedClass() {

    if (!selectedClassId) {

        return null;

    }


    return (
        myClasses.find(
            (classData) =>
                classData.classId ===
                selectedClassId
        ) || null
    );

}



/* =========================================================
   LOAD STUDENTS
========================================================= */

async function loadStudents() {

    if (!selectedClassId) {

        return;

    }


    if (studentListContainer) {

        studentListContainer.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ⏳
                </div>

                <p>
                    Loading students...
                </p>

            </div>

        `;

    }


    try {

        const studentsQuery =
            query(
                collection(
                    db,
                    "students"
                ),

                where(
                    "classId",
                    "==",
                    selectedClassId
                )
            );


        const snapshot =
            await getDocs(
                studentsQuery
            );


        students = [];


        snapshot.forEach(
            (studentDoc) => {

                students.push({

                    id:
                        studentDoc.id,

                    ...studentDoc.data()

                });

            }
        );


        students.sort(
            (a, b) => {

                const rollA =
                    String(
                        a.rollNo || ""
                    );


                const rollB =
                    String(
                        b.rollNo || ""
                    );


                if (
                    rollA &&
                    rollB
                ) {

                    const numericA =
                        Number(
                            rollA
                        );


                    const numericB =
                        Number(
                            rollB
                        );


                    if (
                        !Number.isNaN(
                            numericA
                        ) &&
                        !Number.isNaN(
                            numericB
                        )
                    ) {

                        return (
                            numericA -
                            numericB
                        );

                    }

                }


                return (
                    String(
                        a.name || ""
                    )
                        .localeCompare(
                            String(
                                b.name || ""
                            ),
                            undefined,
                            {
                                sensitivity:
                                    "base"
                            }
                        )
                );

            }
        );


        renderStudents();


    } catch (error) {

        console.error(
            "Error loading students:",
            error
        );


        students = [];


        if (studentListContainer) {

            studentListContainer.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        ⚠️
                    </div>

                    <h3>
                        Unable to load students
                    </h3>

                    <p>
                        Please try again.
                    </p>

                </div>

            `;

        }


        showToast(
            getFriendlyError(error),
            "error"
        );

    }

}



/* =========================================================
   RENDER STUDENTS
========================================================= */

function renderStudents() {

    if (!studentListContainer) {

        return;

    }


    if (students.length === 0) {

        studentListContainer.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    👨‍🎓
                </div>

                <h3>
                    No students yet
                </h3>

                <p>
                    ${
                        getSelectedClass()?.incharge
                            ? "You can add the first student to this class."
                            : "The class in-charge has not added any students yet."
                    }
                </p>

            </div>

        `;


        if (studentCount) {

            studentCount.textContent =
                String(
                    students.length
                );

        }


        return;

    }


    const rows =
        students
            .map(
                (student) => {

                    const status =
                        student.status ||
                        "pending";


                    const statusClass =
                        status
                            .toLowerCase()
                            .replace(
                                /[^a-z0-9_-]/g,
                                "-"
                            );


                    return `

                        <tr>

                            <td>

                                <span class="student-id">

                                    ${escapeHTML(
                                        student.studentId ||
                                        "-"
                                    )}

                                </span>

                            </td>


                            <td>

                                ${escapeHTML(
                                    student.name ||
                                    "-"
                                )}

                            </td>


                            <td>

                                ${escapeHTML(
                                    student.rollNo ||
                                    "-"
                                )}

                            </td>


                            <td>

                                ${escapeHTML(
                                    student.section ||
                                    "-"
                                )}

                            </td>


                            <td>

                                ${escapeHTML(
                                    student.email ||
                                    "-"
                                )}

                            </td>


                            <td>

                                <span
                                    class="student-status ${escapeHTML(
                                        statusClass
                                    )}"
                                >

                                    ${escapeHTML(
                                        status
                                    )}

                                </span>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    studentListContainer.innerHTML = `

        <table class="student-table">

            <thead>

                <tr>

                    <th>
                        Student ID
                    </th>

                    <th>
                        Name
                    </th>

                    <th>
                        Roll No.
                    </th>

                    <th>
                        Section
                    </th>

                    <th>
                        Email
                    </th>

                    <th>
                        Status
                    </th>

                </tr>

            </thead>


            <tbody>

                ${rows}

            </tbody>

        </table>

    `;


    if (studentCount) {

        studentCount.textContent =
            String(
                students.length
            );

    }

}



/* =========================================================
   STUDENT COUNT
========================================================= */

async function loadTeacherStudentCount() {

    try {

        const total =
            await getTotalAssignedStudentCount();


        if (studentCount) {

            studentCount.textContent =
                String(total);

        }

    } catch (error) {

        console.error(
            "Student count error:",
            error
        );


        if (studentCount) {

            studentCount.textContent =
                "0";

        }

    }

}



/* =========================================================
   GET TOTAL STUDENTS FROM ASSIGNED CLASSES
========================================================= */

async function getTotalAssignedStudentCount() {

    if (myClasses.length === 0) {

        return 0;

    }


    let total = 0;


    for (
        const classData
        of myClasses
    ) {

        try {

            const studentsQuery =
                query(
                    collection(
                        db,
                        "students"
                    ),

                    where(
                        "classId",
                        "==",
                        classData.classId
                    )
                );


            const snapshot =
                await getDocs(
                    studentsQuery
                );


            total +=
                snapshot.size;


        } catch (error) {

            console.error(
                "Could not count students for:",
                classData.classId,
                error
            );

        }

    }


    return total;

}



/* =========================================================
   ADD STUDENT
========================================================= */

async function addStudent(event) {

    event.preventDefault();


    if (!selectedClassId) {

        showToast(
            "Please select a class.",
            "error"
        );

        return;

    }


    const selectedClass =
        getSelectedClass();


    if (!selectedClass) {

        showToast(
            "Selected class could not be found.",
            "error"
        );

        return;

    }


    if (!selectedClass.incharge) {

        showToast(
            "Only the class in-charge teacher can add students.",
            "error"
        );

        return;

    }


    const studentId =
        studentIdInput
            ?.value
            .trim()
            .toUpperCase();


    const name =
        studentNameInput
            ?.value
            .trim();


    const rollNo =
        studentRollNoInput
            ?.value
            .trim();


    const section =
        selectedClass.section ||
        "";


    const email =
        studentEmailInput
            ?.value
            .trim()
            .toLowerCase();


    const password =
        studentPasswordInput
            ?.value || "";


    if (
        !studentId ||
        !name ||
        !section ||
        !email ||
        !password
    ) {

        showToast(
            "Please fill all required student fields.",
            "error"
        );

        return;

    }


    if (password.length < 6) {

        showToast(
            "Student password must contain at least 6 characters.",
            "error"
        );

        return;

    }


    if (
        !/^[A-Z0-9][A-Z0-9-]{2,30}$/i.test(
            studentId
        )
    ) {

        showToast(
            "Please enter a valid Student ID.",
            "error"
        );

        return;

    }


    try {

        if (addStudentButton) {

            addStudentButton.disabled =
                true;

        }


        if (createStudentAccountButton) {

            createStudentAccountButton.disabled =
                true;

            createStudentAccountButton.textContent =
                "Creating Account...";

        }


        /*
         * Verify class ownership again immediately
         * before creating anything.
         */

        const freshClassRef =
            doc(
                db,
                "classes",
                selectedClassId
            );


        const freshClassSnap =
            await getDoc(
                freshClassRef
            );


        if (!freshClassSnap.exists()) {

            showToast(
                "This class no longer exists.",
                "error"
            );

            return;

        }


        const freshClass =
            freshClassSnap.data();


        if (
            freshClass.inchargeTeacherId !==
            currentTeacher.teacherId
        ) {

            showToast(
                "Only the current class in-charge can add students.",
                "error"
            );


            await loadAssignedClasses();

            populateStudentClasses();

            return;

        }


        /*
         * Student ID is the canonical Firestore
         * document ID.
         */

        const studentRef =
            doc(
                db,
                "students",
                studentId
            );

        /*
         * Create the Firebase Authentication account
         * using the SECONDARY studentAuth instance.
         *
         * This does NOT log the teacher out.
         */

        showToast(
            "Creating student Firebase account...",
            "info"
        );


        const authResult =
            await createUserWithEmailAndPassword(
                studentAuth,
                email,
                password
            );


        const studentUser =
            authResult.user;


        /*
         * Create the canonical student Firestore
         * document with the Firebase UID.
         *
         * Password is NEVER written here.
         */

        await setDoc(
            studentRef,
            {

                studentId,

                name,

                rollNo:
                    rollNo || "",

                section,

                email,

                classId:
                    selectedClassId,

                firebaseUid:
                    studentUser.uid,

                status:
                    "active",

                createdByTeacherId:
                    currentTeacher.teacherId,

                createdAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp(),

                linkedAt:
                    serverTimestamp()

            }
        );


        /*
         * Sign out the secondary student Auth instance.
         *
         * The teacher's main Auth session remains untouched.
         */

        try {

            await signOutStudentAuth(
                studentAuth
            );

        } catch (signOutError) {

            console.warn(
                "Student secondary Auth sign-out warning:",
                signOutError
            );

        }


        closeStudentModal();


        if (studentForm) {

            studentForm.reset();

        }


        if (studentSectionInput) {

            studentSectionInput.value =
                selectedClass.section ||
                "";

        }


        showToast(
            `${name} account created successfully.`,
            "success"
        );


        await loadStudents();

        await loadTeacherStudentCount();


    } catch (error) {

        console.error(
            "Add student error:",
            error
        );


        /*
         * If the Firebase Auth account was created
         * but Firestore failed, the account may exist
         * without a linked student document.
         *
         * We intentionally do not delete the account
         * from the client here because deletion of
         * another Auth account requires privileged
         * Admin SDK access.
         */

        showToast(
            getFriendlyError(error),
            "error"
        );


    } finally {

        if (createStudentAccountButton) {

            createStudentAccountButton.disabled =
                false;

            createStudentAccountButton.textContent =
                "Create Student Account";

        }


        updateStudentManagementPermissions();

    }

}



/* =========================================================
   GENERATE UNIQUE STUDENT ID
========================================================= */

async function generateUniqueStudentId() {

    const year =
        new Date().getFullYear();


    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    const randomValues =
        new Uint32Array(8);


    crypto.getRandomValues(
        randomValues
    );


    let randomPart =
        "";


    for (
        let i = 0;
        i < randomValues.length;
        i++
    ) {

        randomPart +=
            characters[
                randomValues[i] %
                characters.length
            ];

    }


    const candidate =
        `STU-${year}-${randomPart}`;


    /*
     * Verify globally that the generated
     * Student ID does not already exist.
     */

    const studentRef =
        doc(
            db,
            "students",
            candidate
        );


    const studentSnap =
        await getDoc(
            studentRef
        );


    if (studentSnap.exists()) {

        return generateUniqueStudentId();

    }


    return candidate;

}



/* =========================================================
   MODAL
========================================================= */

function openStudentModal() {

    if (!studentModal) {

        return;

    }


    studentModal.classList.add(
        "active"
    );

}



function closeStudentModal() {

    if (!studentModal) {

        return;

    }


    studentModal.classList.remove(
        "active"
    );

}



/* =========================================================
   TOAST
========================================================= */

function showToast(
    message,
    type = "info"
) {

    const container =
        document.getElementById(
            "toastContainer"
        );


    if (!container) {

        console.log(
            `[${type}] ${message}`
        );

        return;

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast ${type}`;


    toast.textContent =
        message;


    container.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.remove();

        },
        3500
    );

}



/* =========================================================
   FRIENDLY FIREBASE ERROR
========================================================= */

function getFriendlyError(error) {

    if (!error) {

        return (
            "Something went wrong. Please try again."
        );

    }


    const code =
        error.code || "";


    switch (code) {

        case "permission-denied":

            return (
                "You do not have permission to perform this action."
            );


        case "failed-precondition":

            return (
                "This operation could not be completed because a required Firestore condition is missing."
            );


        case "unavailable":

            return (
                "Firebase is temporarily unavailable. Please check your internet connection and try again."
            );


        case "deadline-exceeded":

            return (
                "The request took too long. Please try again."
            );


        case "unauthenticated":

            return (
                "Your session has expired. Please log in again."
            );


        case "auth/email-already-in-use":

            return (
                "A Firebase account already exists with this email address."
            );


        case "auth/invalid-email":

            return (
                "Please enter a valid student email address."
            );


        case "auth/weak-password":

            return (
                "The student password is too weak. Please use at least 6 characters."
            );


        case "auth/network-request-failed":

            return (
                "Network error. Please check your internet connection."
            );


        case "auth/operation-not-allowed":

            return (
                "Email/password authentication is not enabled in Firebase Authentication."
            );


        default:

            return (
                error.message ||
                "Something went wrong. Please try again."
            );

    }

}

/* =========================================================
   RESULTS & EXAMINATION MANAGEMENT
========================================================= */

let resultsStudents = [];
let resultsSubjects = [];
let resultsSelectedClass = null;

function setupTeacherResults() {
    const classSelect = document.getElementById("resultsClassSelect");
    const setupForm = document.getElementById("resultsSetupForm");
    const draftButton = document.getElementById("saveResultsDraftButton");
    const submitButton = document.getElementById("submitResultsButton");

    if (!classSelect || !setupForm || !draftButton || !submitButton) {
        console.error("Results section HTML elements are missing.");
        return;
    }

    // Only class in-charges can enter consolidated class results.
    const eligibleClasses = myClasses.filter(
        item => item.incharge === true
    );

    classSelect.innerHTML =
        '<option value="">Select class</option>' +
        eligibleClasses.map(item => `
            <option value="${escapeHTML(item.classId)}">
                ${escapeHTML(item.className)}
                ${escapeHTML(item.section || "")}
            </option>
        `).join("");

    setupForm.addEventListener("submit", async event => {
        event.preventDefault();

        const selected = eligibleClasses.find(
            item => item.classId === classSelect.value
        );

        if (!selected) {
            showResultsMessage("Select a class for which you are the class in-charge.");
            return;
        }

        const examName = document.getElementById("resultsExamName").value.trim();
        const academicYear = document.getElementById("resultsAcademicYear").value.trim();
        const term = document.getElementById("resultsTerm").value.trim();

        if (!examName || !academicYear) {
            showResultsMessage("Enter the examination name and academic year.");
            return;
        }

        resultsSelectedClass = {
            ...selected,
            examName,
            academicYear,
            term
        };

        await loadResultsEntry();
    });

    draftButton.addEventListener("click", () => saveResults("draft"));
    submitButton.addEventListener("click", () => saveResults("submitted"));
}

// =====================================================
// TEACHER FEE MANAGEMENT
// =====================================================

let teacherFeeStudentsCache = [];
let teacherFeeRecordsCache = [];
let teacherFeesInitialized = false;


// -----------------------------------------------------
// INITIALIZE FEE MANAGEMENT
// -----------------------------------------------------

function setupTeacherFees() {
    const section = document.getElementById("fees");

    if (!section) {
        console.error(
            "Fee Management section was not found in the HTML."
        );
        return;
    }

    const classFilter = document.getElementById(
        "teacherFeeClassFilter"
    );

    const searchInput = document.getElementById(
        "teacherFeeStudentSearch"
    );

    const refreshButton = document.getElementById(
        "refreshTeacherFeesButton"
    );

    // Student search is unnecessary.
    // Hide its containing form group if it exists.
    if (searchInput) {
        const searchGroup = searchInput.closest(".form-group");

        if (searchGroup) {
            searchGroup.style.display = "none";
        }
    }

    if (!teacherFeesInitialized) {
        teacherFeesInitialized = true;

        if (classFilter) {
            classFilter.addEventListener("change", () => {
                renderTeacherFees();
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener("click", async () => {
                await loadTeacherFees();
            });
        }
    }

    populateFeeClassDropdown();
    loadTeacherFees();
}


// -----------------------------------------------------
// POPULATE ASSIGNED CLASSES
// -----------------------------------------------------

function populateTeacherFeeClassFilter() {
    const classFilter = document.getElementById(
        "teacherFeeClassFilter"
    );

    if (!classFilter) {
        console.error(
            "Fee class dropdown not found in HTML."
        );
        return;
    }

    // Use the loaded classes first.
    // Fall back to the teacher's saved assignments.
    const availableClasses = [
        ...(Array.isArray(myClasses) ? myClasses : []),
        ...(Array.isArray(currentTeacher?.assignedClasses)
            ? currentTeacher.assignedClasses
            : [])
    ];

    const uniqueClasses = new Map();

    availableClasses.forEach(item => {
        if (!item || typeof item !== "object") {
            return;
        }

        const classId = item.classId || item.id;

        if (!classId) {
            return;
        }

        const existing = uniqueClasses.get(classId);

        uniqueClasses.set(classId, {
            ...existing,
            ...item,
            classId
        });
    });

    const classes = Array.from(uniqueClasses.values());

    const previousClassId = classFilter.value;

    classFilter.innerHTML = `
        <option value="">Select a class</option>

        ${classes.map(item => `
            <option value="${escapeHTML(item.classId)}">
                ${escapeHTML(
                    `${item.className || item.name || "Class"} ${
                        item.section || ""
                    }`.trim()
                )}
            </option>
        `).join("")}
    `;

    if (
        previousClassId &&
        classes.some(item => item.classId === previousClassId)
    ) {
        classFilter.value = previousClassId;
    }

    console.log(
        "Classes available in fee dropdown:",
        classes
    );
}

// -----------------------------------------------------
// LOAD STUDENTS AND FEE RECORDS
// -----------------------------------------------------

async function loadTeacherFees() {
    const container = document.getElementById("teacherFeesContainer");
    if (!container) return;

    container.innerHTML = `<p>Loading fee records...</p>`;

    try {
        const assignedClassIds = [
            ...new Set(myClasses.map(item => item.classId))
        ];

        if (!assignedClassIds.length) {
            container.innerHTML = `
                <div class="fee-empty-state">
                    <h3>No assigned classes</h3>
                    <p>Ask the administrator to assign a class to you.</p>
                </div>
            `;
            return;
        }

        // 1. Fetch students from assigned classes
        const studentSnapshots = await Promise.all(
            assignedClassIds.map(classId =>
                getDocs(query(
                    collection(db, "students"),
                    where("classId", "==", classId)
                ))
            )
        );

        const students = [
            ...new Map(
                studentSnapshots
                    .flatMap(snapshot => snapshot.docs)
                    .map(doc => [
                        doc.id,
                        { id: doc.id, ...doc.data() }
                    ])
            ).values()
        ];

        // 2. Fetch fee records from assigned classes
        const feeSnapshots = await Promise.all(
            assignedClassIds.map(classId =>
                getDocs(query(
                    collection(db, "fees"),
                    where("classId", "==", classId)
                ))
            )
        );

        const fees = [
            ...new Map(
                feeSnapshots
                    .flatMap(snapshot => snapshot.docs)
                    .map(doc => [
                        doc.id,
                        { id: doc.id, ...doc.data() }
                    ])
            ).values()
        ];

        // 3. Calculate real summary values
        const totalFees = fees.reduce(
            (sum, fee) => sum + Number(fee.amount || 0), 0
        );

        const totalPaid = fees.reduce(
            (sum, fee) => sum + Number(fee.paidAmount || 0), 0
        );

        const totalBalance = Math.max(0, totalFees - totalPaid);

        // 4. Update summary cards
        document.getElementById("teacherFeeStudentCount").textContent =
            students.length;

        document.getElementById("teacherFeeTotalAmount").textContent =
            `₹${totalFees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

        document.getElementById("teacherFeePaidAmount").textContent =
            `₹${totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

        document.getElementById("teacherFeeBalanceAmount").textContent =
            `₹${totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

        // 5. Group fee records by student
        const feeByStudent = new Map();

        fees.forEach(fee => {
            if (!feeByStudent.has(fee.studentId)) {
                feeByStudent.set(fee.studentId, []);
            }

            feeByStudent.get(fee.studentId).push(fee);
        });

        // 6. Render fee management interface
        container.innerHTML = `
            <div class="fee-management-card">

                <div class="fee-management-header">
                    <div>
                        <h3>Student Fee Records</h3>
                        <p>Manage student fees and track payments.</p>
                    </div>

                    <button
                        id="refreshTeacherFees"
                        class="fee-refresh-btn"
                        type="button">
                        ↻ Refresh
                    </button>
                </div>

                <div class="fee-filter-row">
                    <div>
                        <label for="teacherFeeClassFilter">Select Class</label>

                        <select id="teacherFeeClassFilter">
                            <option value="all">All Assigned Classes</option>

                            ${myClasses.map(cls => `
                                <option value="${escapeHTML(cls.classId)}">
                                    ${escapeHTML(cls.className)}
                                    ${escapeHTML(cls.section || "")}
                                </option>
                            `).join("")}
                        </select>
                    </div>

                    <span id="feeStudentCount">
                        ${students.length} students
                    </span>
                </div>

                <div class="fee-table-wrapper">
                    <table class="fee-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Student ID</th>
                                <th>Class</th>
                                <th>Total Fee</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody id="teacherFeeTableBody"></tbody>
                    </table>
                </div>

                <div id="teacherFeeFormContainer"></div>
            </div>
        `;

        const tableBody = document.getElementById("teacherFeeTableBody");
        const classFilter = document.getElementById("teacherFeeClassFilter");
        const searchInput = document.getElementById("teacherFeeStudentSearch");
        const countDisplay = document.getElementById("feeStudentCount");

        // 7. Render and filter students
        function renderFeeStudents() {
            const selectedClass = classFilter.value;
            const searchText = searchInput?.value.trim().toLowerCase() || "";

            const filteredStudents = students.filter(student => {
                const matchesClass =
                    selectedClass === "all" ||
                    student.classId === selectedClass;

                const matchesSearch =
                    (student.name || "").toLowerCase().includes(searchText) ||
                    (student.studentId || "").toLowerCase().includes(searchText);

                return matchesClass && matchesSearch;
            });

            countDisplay.textContent =
                `${filteredStudents.length} students`;

            if (!filteredStudents.length) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="fee-no-records">
                            No students found.
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = filteredStudents.map(student => {
                const studentFees = feeByStudent.get(student.id) || [];

                const total = studentFees.reduce(
                    (sum, fee) => sum + Number(fee.amount || 0), 0
                );

                const paid = studentFees.reduce(
                    (sum, fee) => sum + Number(fee.paidAmount || 0), 0
                );

                const balance = Math.max(0, total - paid);

                const classInfo = myClasses.find(
                    item => item.classId === student.classId
                );

                const formatAmount = amount =>
                    `₹${amount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2
                    })}`;

                return `
                    <tr>
                        <td>
                            <strong>${escapeHTML(student.name || "Unnamed")}</strong>
                        </td>

                        <td>${escapeHTML(student.studentId || student.id)}</td>

                        <td>
                            ${escapeHTML(classInfo?.className || "")}
                            ${escapeHTML(classInfo?.section || "")}
                        </td>

                        <td>${formatAmount(total)}</td>
                        <td class="fee-paid">${formatAmount(paid)}</td>
                        <td class="fee-balance">${formatAmount(balance)}</td>

                        <td>
                            <button
                                class="fee-manage-btn"
                                data-student-id="${escapeHTML(student.id)}"
                                type="button">
                                Manage Fee
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");
        }

        // 8. Connect filters
        classFilter.addEventListener("change", renderFeeStudents);

        searchInput?.addEventListener("input", renderFeeStudents);

        // 9. Connect Manage Fee buttons
        tableBody.addEventListener("click", event => {
            const button = event.target.closest("[data-student-id]");

            if (button) {
                window.openTeacherFeeForm(button.dataset.studentId);
            }
        });

        // 10. Connect inner Refresh button
        document.getElementById("refreshTeacherFees")
            .addEventListener("click", loadTeacherFees);

        renderFeeStudents();

    } catch (error) {
        console.error("Teacher fee loading failed:", error);

        container.innerHTML = `
            <p>Unable to load fee records. Please check the console.</p>
        `;
    }
}

function populateFeeClassDropdown() {
    const select = document.getElementById("feeClassSelect");

    if (!select) {
        console.error("Fee class dropdown not found. Check its HTML id.");
        return;
    }

    select.innerHTML = `
        <option value="">All Assigned Classes</option>
        ${myClasses.map(cls => `
            <option value="${escapeHTML(cls.classId)}">
                ${escapeHTML(cls.className)} ${escapeHTML(cls.section)}
            </option>
        `).join("")}
    `;
}

// -----------------------------------------------------
// DISPLAY STUDENTS FOR THE SELECTED CLASS
// -----------------------------------------------------

function renderTeacherFees() {
    const container = document.getElementById(
        "teacherFeesContainer"
    );

    const classFilter = document.getElementById(
        "teacherFeeClassFilter"
    );

    if (!container || !classFilter) {
        return;
    }

    const selectedClassId = classFilter.value;

    // Do not show a mixed list before the teacher chooses a class.
    if (!selectedClassId) {
        container.innerHTML = `
            <div class="content-card">
                <h3>Select a Class</h3>
                <p>
                    Choose one of your assigned classes above.
                    All students belonging to that class will appear here.
                </p>
            </div>
        `;

        updateTeacherFeeSummary([]);
        return;
    }

    // Validate that the teacher really has this class assigned.
    const classInfo = myClasses.find(
        item => item.classId === selectedClassId
    );

    if (!classInfo) {
        container.innerHTML = `
            <div class="content-card">
                <p>You are not assigned to this class.</p>
            </div>
        `;

        updateTeacherFeeSummary([]);
        return;
    }

    // Display all students belonging to the selected class.
    const students = teacherFeeStudentsCache.filter(
        student => student.classId === selectedClassId
    );

    updateTeacherFeeSummary(students);

    if (students.length === 0) {
        container.innerHTML = `
            <div class="content-card">
                <h3>
                    ${escapeHTML(
                        `${classInfo.className || "Class"} ${
                            classInfo.section || ""
                        }`.trim()
                    )}
                </h3>

                <p>
                    No students were returned for this class.
                </p>

                <p>
                    If students already exist, check the browser
                    console for a Firestore permission error or verify
                    that their classId matches this class's document ID.
                </p>
            </div>
        `;

        return;
    }

    const feeByStudent = new Map();

    teacherFeeRecordsCache.forEach(fee => {
        if (!feeByStudent.has(fee.studentId)) {
            feeByStudent.set(fee.studentId, []);
        }

        feeByStudent.get(fee.studentId).push(fee);
    });

    container.innerHTML = `
        <div class="content-card">
            <h3>
                Students —
                ${escapeHTML(
                    `${classInfo.className || "Class"} ${
                        classInfo.section || ""
                    }`.trim()
                )}
            </h3>

            <p>
                Select a student to create a fee record or manage
                their existing fee.
            </p>

            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Roll No.</th>
                            <th>Student Name</th>
                            <th>Student ID</th>
                            <th>Total Fee</th>
                            <th>Paid</th>
                            <th>Balance</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${students.map(student => {
                            const studentFees =
                                feeByStudent.get(student.id) || [];

                            const total = studentFees.reduce(
                                (sum, fee) =>
                                    sum + Number(fee.amount || 0),
                                0
                            );

                            const paid = studentFees.reduce(
                                (sum, fee) =>
                                    sum + Number(fee.paidAmount || 0),
                                0
                            );

                            const balance = Math.max(
                                0,
                                total - paid
                            );

                            return `
                                <tr>
                                    <td>
                                        ${escapeHTML(
                                            student.rollNo || "—"
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            student.name || "Unnamed student"
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            student.studentId || student.id
                                        )}
                                    </td>

                                    <td>
                                        ₹${total.toFixed(2)}
                                    </td>

                                    <td>
                                        ₹${paid.toFixed(2)}
                                    </td>

                                    <td>
                                        ₹${balance.toFixed(2)}
                                    </td>

                                    <td>
                                        <button
                                            type="button"
                                            class="primary-button"
                                            data-fee-student-id="${escapeHTML(
                                                student.id
                                            )}"
                                        >
                                            ${studentFees.length > 0
                                                ? "Manage Fee"
                                                : "Create Fee"
                                            }
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        </div>

        <div id="teacherFeeFormContainer"></div>
    `;

    // Attach click handlers after rendering the student list.
    container.querySelectorAll(
        "[data-fee-student-id]"
    ).forEach(button => {
        button.addEventListener("click", async () => {
            const studentDocumentId =
                button.dataset.feeStudentId;

            button.disabled = true;

            try {
                await window.openTeacherFeeForm(
                    studentDocumentId
                );
            } catch (error) {
                console.error(
                    "Could not open the student fee form:",
                    error
                );

                alert(
                    "Could not open this student's fee form. " +
                    "Check the browser console for details."
                );
            } finally {
                button.disabled = false;
            }
        });
    });
}


// -----------------------------------------------------
// UPDATE FEE SUMMARY
// -----------------------------------------------------

function updateTeacherFeeSummary(
    visibleStudents = teacherFeeStudentsCache
) {
    const studentCount = document.getElementById(
        "teacherFeeStudentCount"
    );

    const totalAmount = document.getElementById(
        "teacherFeeTotalAmount"
    );

    const paidAmount = document.getElementById(
        "teacherFeePaidAmount"
    );

    const balanceAmount = document.getElementById(
        "teacherFeeBalanceAmount"
    );

    const studentIds = new Set(
        visibleStudents.map(student => student.id)
    );

    const visibleFees = teacherFeeRecordsCache.filter(
        fee => studentIds.has(fee.studentId)
    );

    const total = visibleFees.reduce(
        (sum, fee) => sum + Number(fee.amount || 0),
        0
    );

    const paid = visibleFees.reduce(
        (sum, fee) => sum + Number(fee.paidAmount || 0),
        0
    );

    if (studentCount) {
        studentCount.textContent = String(
            visibleStudents.length
        );
    }

    if (totalAmount) {
        totalAmount.textContent =
            `₹${total.toFixed(2)}`;
    }

    if (paidAmount) {
        paidAmount.textContent =
            `₹${paid.toFixed(2)}`;
    }

    if (balanceAmount) {
        balanceAmount.textContent =
            `₹${Math.max(0, total - paid).toFixed(2)}`;
    }
}

window.openTeacherFeeForm = async function(studentDocumentId) {
    const container = document.getElementById(
        "teacherFeeFormContainer"
    );

    if (!container) return;

    const studentSnap = await getDoc(
        doc(db, "students", studentDocumentId)
    );

    if (!studentSnap.exists()) {
        alert("Student record not found.");
        return;
    }

    const student = studentSnap.data();

    const assignedClass = myClasses.find(
        item => item.classId === student.classId
    );

    if (!assignedClass) {
        alert("You are not assigned to this student's class.");
        return;
    }

    container.innerHTML = `
        <div class="content-card">
            <h3>Manage Fee — ${escapeHTML(
                student.name || "Student"
            )}</h3>

            <form id="teacherFeeForm">
                <input
                    type="hidden"
                    id="feeStudentDocumentId"
                    value="${escapeHTML(studentDocumentId)}"
                >

                <label for="feeTitle">Fee description</label>
                <input
                    id="feeTitle"
                    required
                    maxlength="100"
                    placeholder="e.g. Annual Fee"
                >

                <label for="feeAmount">Total fee amount (₹)</label>
                <input
                    id="feeAmount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                >

                <label for="feeDueDate">Due date</label>
                <input
                    id="feeDueDate"
                    type="date"
                    required
                >

                <label for="feePaymentAmount">
                    Amount received now (₹)
                </label>

                <input
                    id="feePaymentAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value="0"
                    required
                >

                <label for="feePaymentNote">
                    Payment note / receipt reference
                </label>

                <input
                    id="feePaymentNote"
                    maxlength="150"
                    placeholder="Optional"
                >

                <button class="primary-button" type="submit">
                    Save Fee / Record Payment
                </button>
            </form>
        </div>
    `;

    document.getElementById("teacherFeeForm")
        .addEventListener("submit", async event => {
            event.preventDefault();

            const amount = Number(
                document.getElementById("feeAmount").value
            );

            const received = Number(
                document.getElementById("feePaymentAmount").value
            );

            if (
                !Number.isFinite(amount) ||
                amount <= 0 ||
                !Number.isFinite(received) ||
                received < 0 ||
                received > amount
            ) {
                alert(
                    "Enter a valid total fee and payment amount."
                );
                return;
            }

            try {
                const feeId = [
                    studentDocumentId,
                    document.getElementById("feeTitle")
                        .value.trim().toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                ].join("__");

                const feeRef = doc(db, "fees", feeId);

                // Query only this student's fees in this assigned class.
                // This avoids directly reading a potentially nonexistent document.
                const existingSnapshot = await getDocs(
                    query(
                        collection(db, "fees"),
                        where("studentId", "==", studentDocumentId),
                        where("classId", "==", student.classId)
                    )
                );

                const existing = existingSnapshot.docs.find(
                    item => item.id === feeId
                );

                const oldData = existing ? existing.data() : null;

                const oldPaid = Number(
                    oldData?.paidAmount || 0
                );

                if (oldPaid + received > amount) {
                    alert(
                        "The recorded payments cannot exceed the total fee."
                    );
                    return;
                }

                const payments = Array.isArray(
                    oldData?.payments
                )
                    ? [...oldData.payments]
                    : [];

                if (received > 0) {
                    payments.push({
                        amount: received,
                        note: document.getElementById(
                            "feePaymentNote"
                        ).value.trim(),
                        receivedByTeacherId:
                            currentTeacher.teacherId,
                        receivedAt: new Date().toISOString()
                    });
                }

                const paidAmount = oldPaid + received;

                console.log("FEE WRITE STARTING");
                await setDoc(feeRef, {
                    studentId: studentDocumentId,
                    studentDisplayId:
                        student.studentId || studentDocumentId,
                    studentName: student.name || "",
                    classId: student.classId,
                    className: assignedClass.className || "",
                    section: assignedClass.section || "",
                    title: document.getElementById(
                        "feeTitle"
                    ).value.trim(),
                    amount,
                    paidAmount,
                    balance: amount - paidAmount,
                    dueDate: document.getElementById(
                        "feeDueDate"
                    ).value,
                    status: paidAmount >= amount
                        ? "paid"
                        : paidAmount > 0
                            ? "partial"
                            : "pending",
                    payments,
                    createdByTeacherId:
                        oldData?.createdByTeacherId ||
                        currentTeacher.teacherId,
                    updatedAt: serverTimestamp()
                }, { merge: true });

                alert("Fee record saved successfully.");
                await loadTeacherFees();
                } catch (error) {
                    console.error("Saving fee failed:", {
                        code: error.code,
                        message: error.message,
                        error: error
                    });

                    alert(
                        `Could not save the fee.\n` +
                        `Error: ${error.code || "unknown"}\n` +
                        `${error.message || "Check the browser console."}`
                    );
                }
        });
};

function showResultsMessage(message) {
    const element = document.getElementById("resultsEntryMessage");

    if (element) {
        element.textContent = message;
    }
}


async function loadResultsEntry() {
    const card = document.getElementById("resultsEntryCard");
    const head = document.getElementById("resultsTableHead");
    const body = document.getElementById("resultsTableBody");

    card.hidden = false;
    head.innerHTML = "";
    body.innerHTML = "";
    resultsStudents = [];
    resultsSubjects = [];

    showResultsMessage("Loading students and subjects...");

    try {
        const classInfo = resultsSelectedClass;

        // Load students in the selected class.
        const studentQuery = query(
            collection(db, "students"),
            where("classId", "==", classInfo.classId)
        );

        const studentSnapshot = await getDocs(studentQuery);

        resultsStudents = studentSnapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        resultsStudents.sort((a, b) =>
            String(a.rollNo || "").localeCompare(
                String(b.rollNo || ""),
                undefined,
                { numeric: true }
            )
        );

        // Resolve the subjects assigned to this class.
        const subjectIds = Array.isArray(classInfo.subjectIds)
            ? classInfo.subjectIds
            : [];

        resultsSubjects = subjectIds
            .map(subjectId => subjects.find(item => item.id === subjectId))
            .filter(Boolean);

        if (!resultsStudents.length) {
            showResultsMessage("No students were found in this class.");
            return;
        }

        if (!resultsSubjects.length) {
            showResultsMessage("No subjects are assigned to this class. Ask the administrator to check the class assignments.");
            return;
        }

        head.innerHTML = `
            <tr>
                <th>Roll No.</th>
                <th>Student</th>
                ${resultsSubjects.map(subject => `
                    <th>${escapeHTML(subject.name)}<br>
                        <small>Marks / Maximum</small>
                    </th>
                `).join("")}
            </tr>
        `;

        body.innerHTML = resultsStudents.map(student => `
            <tr data-student-id="${escapeHTML(student.id)}">
                <td>${escapeHTML(student.rollNo || "—")}</td>
                <td>${escapeHTML(student.name || "Unnamed student")}</td>

                ${resultsSubjects.map(subject => `
                    <td>
                        <input
                            type="number"
                            class="result-marks"
                            data-subject-id="${escapeHTML(subject.id)}"
                            aria-label="${escapeHTML(subject.name)} marks"
                            min="0"
                            step="0.01"
                            placeholder="Marks"
                            style="width:90px"
                        >

                        <input
                            type="number"
                            class="result-max-marks"
                            data-subject-id="${escapeHTML(subject.id)}"
                            aria-label="${escapeHTML(subject.name)} maximum marks"
                            min="0.01"
                            step="0.01"
                            placeholder="Max"
                            style="width:75px"
                        >
                    </td>
                `).join("")}
            </tr>
        `).join("");

        // Load any existing drafts for this teacher and examination.
        await loadExistingResultDrafts();

        showResultsMessage(
            `${resultsStudents.length} students loaded. Enter marks and maximum marks for each subject.`
        );

    } catch (error) {
        console.error("Results entry loading failed:", error);

        showResultsMessage(
            "Could not load the students or subjects. Check the browser console and Firestore permissions."
        );
    }
}


function getResultDocumentId(studentId) {
    const info = resultsSelectedClass;

    return [
        info.classId,
        info.academicYear,
        info.examName,
        studentId
    ].map(value => encodeURIComponent(String(value))).join("__");
}


async function loadExistingResultDrafts() {
    const info = resultsSelectedClass;

    for (const student of resultsStudents) {
        const resultRef = doc(
            db,
            "results",
            getResultDocumentId(student.id)
        );

        try {
            const snapshot = await getDoc(resultRef);

            if (!snapshot.exists()) {
                continue;
            }

            const data = snapshot.data();

            if (
                data.submittedByTeacherId !== currentTeacher.teacherId ||
                data.classId !== info.classId ||
                data.studentId !== student.id ||
                data.examName !== info.examName ||
                data.academicYear !== info.academicYear
            ) {
                continue;
            }

            // Submitted results are read-only for the teacher.
            if (data.status !== "draft") {
                continue;
            }

            for (const subjectResult of (data.subjects || [])) {
                const marksInput = document.querySelector(
                    `tr[data-student-id="${CSS.escape(student.id)}"] .result-marks[data-subject-id="${CSS.escape(subjectResult.subjectId)}"]`
                );

                const maxInput = document.querySelector(
                    `tr[data-student-id="${CSS.escape(student.id)}"] .result-max-marks[data-subject-id="${CSS.escape(subjectResult.subjectId)}"]`
                );

                if (marksInput && subjectResult.marks !== null && subjectResult.marks !== undefined) {
                    marksInput.value = subjectResult.marks;
                }

                if (maxInput && subjectResult.maxMarks !== null && subjectResult.maxMarks !== undefined) {
                    maxInput.value = subjectResult.maxMarks;
                }
            }
        } catch (error) {
            console.warn("Could not load existing result draft:", error);
        }
    }
}


async function saveResults(targetStatus) {
    if (
        !resultsSelectedClass ||
        !resultsStudents.length ||
        !resultsSubjects.length
    ) {
        showResultsMessage("Load a class before saving results.");
        return;
    }

    if (!["draft", "submitted"].includes(targetStatus)) {
        return;
    }

    const draftButton = document.getElementById("saveResultsDraftButton");
    const submitButton = document.getElementById("submitResultsButton");

    if (!draftButton || !submitButton) {
        showResultsMessage("Results form buttons could not be found.");
        return;
    }

    draftButton.disabled = true;
    submitButton.disabled = true;

    try {
        const info = resultsSelectedClass;

        for (const student of resultsStudents) {
            const row = document.querySelector(
                `tr[data-student-id="${CSS.escape(student.id)}"]`
            );

            if (!row) {
                continue;
            }

            const subjectMarks = [];

            let totalMarks = 0;
            let totalMaximum = 0;
            let complete = true;

            for (const subject of resultsSubjects) {
                const marksInput = row.querySelector(
                    `.result-marks[data-subject-id="${CSS.escape(subject.id)}"]`
                );

                const maxInput = row.querySelector(
                    `.result-max-marks[data-subject-id="${CSS.escape(subject.id)}"]`
                );

                if (!marksInput || !maxInput) {
                    throw new Error(
                        `Marks inputs are missing for ${subject.name}.`
                    );
                }

                const marksText = marksInput.value.trim();
                const maxText = maxInput.value.trim();

                if (!marksText || !maxText) {
                    complete = false;

                    subjectMarks.push({
                        subjectId: subject.id,
                        subjectName: subject.name,
                        marks: null,
                        maxMarks: maxText ? Number(maxText) : null
                    });

                    continue;
                }

                const marks = Number(marksText);
                const maxMarks = Number(maxText);

                if (
                    !Number.isFinite(marks) ||
                    !Number.isFinite(maxMarks) ||
                    marks < 0 ||
                    maxMarks <= 0 ||
                    marks > maxMarks
                ) {
                    throw new Error(
                        `Invalid marks for ${student.name || student.id}, subject ${subject.name}. Marks must be between 0 and the maximum marks.`
                    );
                }

                totalMarks += marks;
                totalMaximum += maxMarks;

                subjectMarks.push({
                    subjectId: subject.id,
                    subjectName: subject.name,
                    marks,
                    maxMarks
                });
            }

            if (targetStatus === "submitted" && !complete) {
                throw new Error(
                    `Complete every subject's marks and maximum marks for ${student.name || student.id} before submitting.`
                );
            }

            const resultRef = doc(
                db,
                "results",
                getResultDocumentId(student.id)
            );

            const resultData = {
                classId: info.classId,
                className: info.className || "",
                section: info.section || "",
                studentId: student.id,
                studentName: student.name || "",
                rollNo: student.rollNo || "",
                examName: info.examName,
                exam: info.examName,
                academicYear: info.academicYear,
                term: info.term || "",
                subjects: subjectMarks,
                totalMarks,
                maximumMarks: totalMaximum,
                percentage: totalMaximum > 0
                    ? Number(((totalMarks / totalMaximum) * 100).toFixed(2))
                    : null,
                submittedByTeacherId: currentTeacher.teacherId,
                submittedByName: currentTeacher.name || "",
                updatedAt: serverTimestamp()
            };

            /*
             * Create a draft.
             *
             * Do not use getDoc() here: the current teacher read rule
             * cannot authorize reading a nonexistent result document.
             */
            if (targetStatus === "draft") {
                await setDoc(
                    resultRef,
                    {
                        ...resultData,
                        status: "draft",
                        createdAt: serverTimestamp()
                    },
                    { merge: true }
                );
            } else {
                /*
                 * New submissions must first be created as drafts,
                 * because the current Firestore rules only allow
                 * teacher-created documents with status "draft".
                 */
                await setDoc(
                    resultRef,
                    {
                        ...resultData,
                        status: "draft",
                        createdAt: serverTimestamp()
                    },
                    { merge: true }
                );

                await updateDoc(resultRef, {
                    status: "submitted",
                    submittedAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
        }

        showResultsMessage(
            targetStatus === "draft"
                ? "Drafts saved successfully."
                : "Results submitted to the administrator for review."
        );

        if (targetStatus === "submitted") {
            const entryCard = document.getElementById("resultsEntryCard");

            if (entryCard) {
                entryCard.hidden = true;
            }
        }

    } catch (error) {
        console.error("Saving results failed:", {
            code: error.code,
            message: error.message,
            classId: resultsSelectedClass?.classId,
            teacherId: currentTeacher?.teacherId
        });

        showResultsMessage(
            error.message || "Could not save results."
        );
    } finally {
        draftButton.disabled = false;
        submitButton.disabled = false;
    }
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}