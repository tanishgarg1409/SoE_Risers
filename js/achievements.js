// ============================================
// SOE RISERS - PUBLIC ACHIEVEMENTS PAGE
// ============================================

import { db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


// ============================================
// ELEMENTS
// ============================================

const achievementsList = document.getElementById(
    "achievementsList"
);

const filtersContainer = document.getElementById(
    "achievementFilters"
);

const emptyState = document.getElementById(
    "achievementEmpty"
);

const achievementCount = document.getElementById(
    "achievementCount"
);

let allAchievements = [];
let activeCategory = "all";


// ============================================
// CATEGORY NORMALIZATION
// ============================================

function normalizeCategory(category) {

    const value = String(category || "")
        .trim()
        .toLowerCase();

    if (
        value.includes("academic") ||
        value.includes("education") ||
        value.includes("scholar")
    ) {
        return "academic";
    }

    if (
        value.includes("sport") ||
        value.includes("athletic")
    ) {
        return "sports";
    }

    if (
        value.includes("cultural") ||
        value.includes("culture")
    ) {
        return "cultural";
    }

    if (
        value.includes("event") ||
        value.includes("function") ||
        value.includes("celebration")
    ) {
        return "events";
    }

    if (
        value.includes("competition") ||
        value.includes("contest") ||
        value.includes("tournament")
    ) {
        return "competitions";
    }

    return "other";
}


// ============================================
// CATEGORY DISPLAY NAME
// ============================================

function categoryLabel(category) {

    const labels = {
        academic: "Academic Achievement",
        sports: "Sports",
        cultural: "Cultural",
        events: "School Events",
        competitions: "Competitions",
        other: "Others"
    };

    return labels[category] || "Others";
}


// ============================================
// CREATE ACHIEVEMENT CARD
// ============================================

function createAchievementCard(item) {

    const category = normalizeCategory(item.category);

    const card = document.createElement("article");

    card.className = "public-achievement-card";


    // IMAGE

    const imageContainer = document.createElement("div");

    imageContainer.className = "achievement-image";


    if (item.imageUrl) {

        try {

            const url = new URL(item.imageUrl);

            if (url.protocol === "https:") {

                const image = document.createElement("img");

                image.src = url.href;

                image.alt = item.title || "School achievement";

                image.loading = "lazy";

                image.referrerPolicy = "no-referrer";

                image.onerror = () => {

                    image.remove();

                    imageContainer.innerHTML = "";

                    const fallback = document.createElement("span");

                    fallback.className = "achievement-image-fallback";

                    fallback.textContent = item.icon || "🏆";

                    imageContainer.appendChild(fallback);

                };

                imageContainer.appendChild(image);

            }

        } catch (error) {

            console.warn("Invalid achievement image URL.");

        }

    }


    if (!imageContainer.children.length) {

        const fallback = document.createElement("span");

        fallback.className = "achievement-image-fallback";

        fallback.textContent = item.icon || "🏆";

        imageContainer.appendChild(fallback);

    }


    // CONTENT

    const content = document.createElement("div");

    content.className = "achievement-content";


    const categoryBadge = document.createElement("span");

    categoryBadge.className = "achievement-category";

    categoryBadge.textContent = categoryLabel(category);


    const icon = document.createElement("span");

    icon.className = "achievement-icon-small";

    icon.textContent = item.icon || "🏆";


    const title = document.createElement("h3");

    title.textContent = item.title || "School Achievement";


    const description = document.createElement("p");

    description.textContent = item.description || "";


    content.append(
        categoryBadge,
        icon,
        title,
        description
    );


    card.append(imageContainer, content);

    return card;

}


// ============================================
// RENDER ACHIEVEMENTS
// ============================================

function renderAchievements() {

    achievementsList.replaceChildren();

    const filteredAchievements = allAchievements.filter(item => {

        if (activeCategory === "all") {
            return true;
        }

        return normalizeCategory(item.category) === activeCategory;

    });


    achievementCount.textContent = filteredAchievements.length;


    if (filteredAchievements.length === 0) {

        emptyState.hidden = false;

        return;

    }

    emptyState.hidden = true;


    filteredAchievements.forEach(item => {

        const card = createAchievementCard(item);

        achievementsList.appendChild(card);

    });

}


// ============================================
// CATEGORY FILTERS
// ============================================

filtersContainer.addEventListener("click", event => {

    const button = event.target.closest(".filter-btn");

    if (!button) return;


    activeCategory = button.dataset.category;


    filtersContainer
        .querySelectorAll(".filter-btn")
        .forEach(btn => {

            btn.classList.remove("active");

        });


    button.classList.add("active");


    renderAchievements();

});


// ============================================
// LOAD FIRESTORE DATA
// ============================================

async function loadAchievements() {

    try {

        const homepageRef = doc(
            db,
            "siteContent",
            "homepage"
        );

        const snapshot = await getDoc(homepageRef);


        if (!snapshot.exists()) {

            achievementsList.textContent =
                "Achievements are currently unavailable.";

            achievementCount.textContent = "0";

            return;

        }


        const homepageData = snapshot.data();

        const data = homepageData.achievements || {};


        // Update heading

        if (data.heading) {

            document.getElementById(
                "pageHeading"
            ).textContent = data.heading;

        }


        // Update description

        if (data.description) {

            document.getElementById(
                "pageDescription"
            ).textContent = data.description;

        }


        // Get achievement cards

        allAchievements = Array.isArray(data.cards)
            ? [...data.cards]
            : [];


        // Sort by order

        allAchievements.sort((a, b) => {

            return Number(a.order || 0) - Number(b.order || 0);

        });


        renderAchievements();


    } catch (error) {

        console.error(
            "Achievements loading error:",
            error
        );

        achievementsList.textContent =
            "Unable to load achievements. Please try again later.";

    }

}


// ============================================
// INITIALIZE
// ============================================

document.getElementById("footerYear").textContent =
    new Date().getFullYear();

loadAchievements();