// ============================================
// SoE RISERS - PUBLIC HOMEPAGE CONTENT
// ============================================

import { db } from "./firebase.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


// ============================================
// HELPER: UPDATE TEXT SAFELY
// ============================================

function updateText(elementId, value) {

    const element = document.getElementById(elementId);

    if (!element || typeof value !== "string" || !value.trim()) {
        return;
    }

    element.textContent = value;
}


// ============================================
// HELPER: UPDATE IMAGE SAFELY
// ============================================

function updateImage(elementId, imageUrl, fallbackContent = null) {

    const container = document.getElementById(elementId);

    if (!container || typeof imageUrl !== "string" || !imageUrl.trim()) {
        return;
    }

    try {

        const url = new URL(imageUrl);

        if (url.protocol !== "https:") {
            return;
        }

        const image = document.createElement("img");

        image.src = url.href;
        image.alt = "School of Eminence, Barnala";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";

        image.onerror = () => {

            image.remove();

            if (fallbackContent) {
                container.innerHTML = fallbackContent;
            }

        };

        container.replaceChildren(image);

    } catch (error) {

        console.error("Invalid homepage image URL:", error);

    }

}


// ============================================
// RENDER PUBLIC FACULTY
// ============================================

function renderPublicFaculty(members = []) {

    const container = document.getElementById("publicFacultyGrid");

    if (!container || !Array.isArray(members)) return;

    container.replaceChildren();

    const sortedMembers = [...members].sort(
        (a, b) => Number(a.order) - Number(b.order)
    );

    sortedMembers.forEach(member => {

        const card = document.createElement("div");
        card.className = "faculty-card";

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


// ============================================
// RENDER PUBLIC ACHIEVEMENTS
// ============================================

function renderPublicAchievements(data = {}) {

    const container = document.getElementById(
        "publicAchievementCards"
    );

    if (!container) return;

    updateText(
        "publicAchievementsHeading",
        data.heading
    );

    updateText(
        "publicAchievementsDescription",
        data.description
    );

    const cards = Array.isArray(data.cards)
        ? [...data.cards]
        : [];

    cards.sort(
        (a, b) => Number(a.order) - Number(b.order)
    );

    container.replaceChildren();

    cards.forEach(item => {

        const card = document.createElement("div");
        card.className = "achievement-card";

        const icon = document.createElement("span");
        icon.className = "achievement-icon";
        icon.textContent = item.icon || "🏆";

        const title = document.createElement("strong");
        title.textContent = item.title || "";

        const paragraph = document.createElement("p");
        paragraph.textContent = item.description || "";

        card.append(icon, title, paragraph);

        if (item.imageUrl) {

            try {

                const url = new URL(item.imageUrl);

                if (url.protocol === "https:") {

                    const image = document.createElement("img");

                    image.src = url.href;
                    image.alt = item.title || "School achievement";
                    image.loading = "lazy";
                    image.referrerPolicy = "no-referrer";

                    image.onerror = () => image.remove();

                    card.appendChild(image);

                }

            } catch (error) {

                console.warn("Invalid achievement image URL.");

            }

        }

        container.appendChild(card);

    });

}

// ============================================
// PUBLIC HOMEPAGE NOTICES
// ============================================

function formatNoticeDate(notice) {
    const timestamp = notice.publishedAt || notice.createdAt;

    if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    return notice.date || "School announcement";
}


function renderPublicNotices(notices = []) {

    const latestContainer = document.getElementById("publicLatestNotice");
    const listContainer = document.getElementById("noticeList");

    if (!latestContainer || !listContainer) {
        return;
    }

    // Only publicly visible notices
    const publicNotices = notices.filter(notice =>
        notice.status === "published" &&
        notice.audience === "everyone"
    );

    // Newest first
    publicNotices.sort((a, b) => {
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

    latestContainer.replaceChildren();
    listContainer.replaceChildren();

    if (publicNotices.length === 0) {

        const message = document.createElement("p");
        message.textContent = "No public announcements available right now.";

        latestContainer.appendChild(message);
        return;
    }

    // Latest featured notice
    const latest = publicNotices[0];

    const label = document.createElement("span");
    label.className = "notice-label";
    label.textContent = "LATEST";

    const date = document.createElement("div");
    date.className = "notice-date";

    const dateText = formatNoticeDate(latest);
    const parsedDate = new Date(dateText);

    const dateStrong = document.createElement("strong");
    const dateSmall = document.createElement("span");

    if (latest.publishedAt?.toDate || latest.createdAt?.toDate) {
        const actualDate = (latest.publishedAt || latest.createdAt).toDate();

        dateStrong.textContent = String(actualDate.getDate()).padStart(2, "0");

        dateSmall.textContent = actualDate.toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric"
        }).toUpperCase();
    } else {
        dateStrong.textContent = "NEW";
        dateSmall.textContent = "NOTICE";
    }

    date.append(dateStrong, dateSmall);

    const heading = document.createElement("h3");
    heading.textContent = latest.title || "School Announcement";

    const description = document.createElement("p");
    description.textContent = latest.message || latest.description || "";

    latestContainer.append(label, date, heading, description);

    // Remaining notices
    publicNotices.slice(1, 5).forEach(notice => {

        const card = document.createElement("div");
        card.className = "notice-item";

        const title = document.createElement("h4");
        title.textContent = notice.title || "School Announcement";

        const message = document.createElement("p");
        message.textContent = notice.message || notice.description || "";

        const meta = document.createElement("span");
        meta.textContent =
            `${notice.category || "General"} • ${formatNoticeDate(notice)}`;

        card.append(title, message, meta);
        listContainer.appendChild(card);
    });
}


async function loadPublicNotices() {
    try {
        const publicNoticesQuery = query(
            collection(db, "notices"),
            where("status", "==", "published"),
            where("audience", "==", "everyone")
        );

        const snapshot = await getDocs(publicNoticesQuery);

        const notices = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        renderPublicNotices(notices);

    } catch (error) {
        console.error("Public notices loading error:", error);

        const latest = document.getElementById("publicLatestNotice");

        if (latest) {
            latest.textContent =
                "Announcements are temporarily unavailable.";
        }
    }
}

// ============================================
// PUBLIC ACADEMICS RENDERER
// ============================================

function renderPublicAcademics(data = {}) {

    const heading = document.getElementById("publicAcademicsHeading");
    const description = document.getElementById("publicAcademicsDescription");
    const grid = document.getElementById("publicAcademicsGrid");

    if (heading && data.heading) {
        heading.textContent = data.heading;
    }

    if (description && data.description) {
        description.textContent = data.description;
    }

    if (!grid || !Array.isArray(data.cards) || data.cards.length === 0) {
        return;
    }

    grid.replaceChildren();

    data.cards.slice(0, 4).forEach((item, index) => {

        const card = document.createElement("article");
        card.className = "academic-card reveal";

        const icon = document.createElement("div");
        icon.className = "academic-icon";
        icon.textContent = item.icon || "📘";

        const number = document.createElement("span");
        number.className = "academic-number";
        number.textContent = String(index + 1).padStart(2, "0");

        const title = document.createElement("h3");
        title.textContent = item.title || "Academic Programme";

        const text = document.createElement("p");
        text.textContent = item.description || "";

        const exploreButton = document.createElement("button");
        exploreButton.type = "button";
        exploreButton.className = "academic-explore-btn";
        exploreButton.textContent = "Explore →";

        exploreButton.addEventListener("click", () => {
            openAcademicModal(item.title);
        });

        card.append(icon, number, title, text, exploreButton);
        grid.appendChild(card);
    });
}

function renderPublicStats(data = {}) {

    // Hero statistics
    const heroStats = Array.isArray(data.heroStats)
        ? data.heroStats
        : [];

    heroStats.slice(0, 3).forEach((item, index) => {

        const number = index + 1;

        const value = document.getElementById(
            `heroStat${number}Value`
        );

        const label = document.getElementById(
            `heroStat${number}Label`
        );

        if (value && item.value) {
            value.textContent = item.value;
        }

        if (label && item.label) {
            label.textContent = item.label;
        }

    });


    // Main statistics cards
    const cards = Array.isArray(data.cards)
        ? data.cards
        : [];

    cards.slice(0, 4).forEach((item, index) => {

        const number = index + 1;

        const value = document.getElementById(
            `publicStat${number}Value`
        );

        const label = document.getElementById(
            `publicStat${number}Label`
        );

        if (value && item.value !== undefined) {

            value.textContent = item.value;

            // Keep the existing counter target synchronized.
            const numericValue = Number(
                String(item.value).replace(/[^0-9.-]/g, "")
            );

            if (Number.isFinite(numericValue)) {
                value.dataset.target = numericValue;
            }

        }

        if (label && item.label) {
            label.textContent = item.label;
        }

    });

}

// ============================================
// LOAD PUBLIC HOMEPAGE CONTENT
// ============================================

async function loadHomepageContent() {

    try {

        const homepageRef = doc(
            db,
            "siteContent",
            "homepage"
        );

        const snapshot = await getDoc(homepageRef);

        if (!snapshot.exists()) {
            console.info("No homepage content has been configured yet.");
            return;
        }

        const data = snapshot.data();
        renderPublicAcademics(data.academics || {});
        renderPublicStats(data.stats || {});

        // ------------------------------------
        // HERO SECTION
        // ------------------------------------

        const hero = data.hero || {};

        updateText("heroBadge", hero.badge);
        updateText("heroHeading", hero.heading);
        updateText("heroDescription", hero.description);

        updateImage(
            "heroImageContainer",
            hero.imageUrl
        );


        // ------------------------------------
        // ABOUT SECTION
        // ------------------------------------

        const about = data.about || {};

        updateText("aboutHeading", about.heading);
        updateText("aboutDescription", about.description);

        updateImage(
            "aboutImageContainer",
            about.imageUrl
        );


        // ------------------------------------
        // FACULTY SECTION
        // ------------------------------------

        renderPublicFaculty(
            data.faculty?.members || []
        );


        // ------------------------------------
        // ACHIEVEMENTS SECTION
        // ------------------------------------

        renderPublicAchievements(
            data.achievements || {}
        );

    }

    catch (error) {

        console.error(
            "Public homepage content loading error:",
            error
        );

        // Keep the existing static homepage content
        // if Firestore is unavailable.

    }

}


// ============================================
// INITIALIZE
// ============================================

loadHomepageContent();
loadPublicNotices();

// ============================================
// ACADEMIC DETAILS POPUP
// ============================================

const academicDetails = {
    "Science & Innovation": {
        icon: "🔬",
        description: "Encouraging scientific curiosity through practical learning and experimentation.",
        topics: [
            "Scientific experiments and demonstrations",
            "Practical and laboratory learning",
            "Critical thinking and problem-solving",
            "Innovation and scientific curiosity"
        ]
    },

    "Mathematics": {
        icon: "📐",
        description: "Developing logical reasoning, analytical thinking and quantitative skills.",
        topics: [
            "Mathematical reasoning",
            "Problem-solving techniques",
            "Numerical and analytical skills",
            "Real-world applications of mathematics"
        ]
    },

    "Humanities": {
        icon: "🌍",
        description: "Understanding society, history, culture and the world around us.",
        topics: [
            "History and cultural awareness",
            "Geography and environment",
            "Social understanding",
            "Communication and critical thinking"
        ]
    },

    "Technology": {
        icon: "💻",
        description: "Preparing students for an increasingly digital and technology-driven world.",
        topics: [
            "Digital literacy",
            "Computer fundamentals",
            "Technology awareness",
            "Digital creativity and innovation"
        ]
    }
};


// Create popup
function createAcademicModal() {

    if (document.getElementById("academicModal")) return;

    const modal = document.createElement("div");

    modal.id = "academicModal";
    modal.className = "academic-modal";

    modal.innerHTML = `
        <div class="academic-modal-content">

            <button class="academic-modal-close"
                aria-label="Close popup">&times;</button>

            <div id="academicModalIcon"></div>

            <h2 id="academicModalTitle"></h2>

            <p id="academicModalDescription"></p>

            <h3>What students explore</h3>

            <ul id="academicModalTopics"></ul>

        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", event => {
        if (
            event.target === modal ||
            event.target.closest(".academic-modal-close")
        ) {
            closeAcademicModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeAcademicModal();
        }
    });
}


function openAcademicModal(title) {

    const details = academicDetails[title];

    if (!details) {
        console.warn("No academic details configured for:", title);
        return;
    }

    createAcademicModal();

    document.getElementById("academicModalIcon").textContent =
        details.icon;

    document.getElementById("academicModalTitle").textContent =
        title;

    document.getElementById("academicModalDescription").textContent =
        details.description;

    const topics = document.getElementById("academicModalTopics");

    topics.replaceChildren();

    details.topics.forEach(topic => {
        const li = document.createElement("li");
        li.textContent = topic;
        topics.appendChild(li);
    });

    document.getElementById("academicModal").classList.add("active");

    document.body.style.overflow = "hidden";
}


function closeAcademicModal() {

    const modal = document.getElementById("academicModal");

    if (modal) {
        modal.classList.remove("active");
    }

    document.body.style.overflow = "";
}

// ============================================
// FIX ACADEMIC EXPLORE CLICK
// ============================================

document.addEventListener("click", function(event) {

    const explore = event.target.closest(
        ".academic-card a, .academic-card button"
    );

    if (!explore) return;

    event.preventDefault();
    event.stopPropagation();

    const card = explore.closest(".academic-card");

    const title = card
        ?.querySelector("h3")
        ?.textContent.trim();

    if (title) {
        openAcademicModal(title);
    }

});