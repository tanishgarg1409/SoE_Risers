import { db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


const eventsGrid = document.getElementById("eventsGrid");
const eventCount = document.getElementById("eventCount");
const emptyState = document.getElementById("emptyState");

const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");

const applyDateFilter = document.getElementById("applyDateFilter");
const clearFilters = document.getElementById("clearFilters");
const categoryFilters = document.getElementById("categoryFilters");

document.getElementById("footerYear").textContent =
    new Date().getFullYear();


let allEvents = [];
let selectedCategory = "all";
let selectedStartDate = "";
let selectedEndDate = "";


/* SAFE TEXT HELPER */

function createTextElement(tag, className, value) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    element.textContent = value || "";

    return element;
}


/* FORMAT DATE */

function formatEventDate(dateValue) {
    if (!dateValue) return "Date unavailable";

    const parts = dateValue.split("-");

    if (parts.length !== 3) return dateValue;

    const date = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}


/* CREATE EVENT CARD */

function createEventCard(event) {

    const card = document.createElement("article");
    card.className = "event-card";

    const imageContainer = document.createElement("div");
    imageContainer.className = "event-image";

    if (
        typeof event.imageUrl === "string" &&
        event.imageUrl.startsWith("https://")
    ) {
        const image = document.createElement("img");

        image.src = event.imageUrl;
        image.alt = event.title || "School event";
        image.loading = "lazy";

        image.onerror = () => {
            image.remove();

            imageContainer.appendChild(
                createTextElement("span", "no-image", "📸")
            );
        };

        imageContainer.appendChild(image);

    } else {
        imageContainer.appendChild(
            createTextElement("span", "no-image", "📸")
        );
    }

    const content = document.createElement("div");
    content.className = "event-content";

    const meta = document.createElement("div");
    meta.className = "event-meta";

    meta.appendChild(
        createTextElement(
            "span",
            "event-category",
            event.category || "Other"
        )
    );

    meta.appendChild(
        createTextElement(
            "span",
            "event-date",
            formatEventDate(event.date)
        )
    );

    content.appendChild(meta);

    content.appendChild(
        createTextElement("h3", "", event.title)
    );

    content.appendChild(
        createTextElement("p", "", event.description)
    );

    card.appendChild(imageContainer);
    card.appendChild(content);

    return card;
}


/* FILTER EVENTS */

function getFilteredEvents() {

    return allEvents.filter(event => {

        const matchesCategory =
            selectedCategory === "all" ||
            event.category === selectedCategory;

        const matchesStartDate =
            !selectedStartDate ||
            event.date >= selectedStartDate;

        const matchesEndDate =
            !selectedEndDate ||
            event.date <= selectedEndDate;

        return (
            matchesCategory &&
            matchesStartDate &&
            matchesEndDate
        );

    });
}


/* RENDER EVENTS */

function renderEvents() {

    const filteredEvents = getFilteredEvents();

    eventsGrid.replaceChildren();

    eventCount.textContent = filteredEvents.length;

    if (filteredEvents.length === 0) {
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;

    filteredEvents.forEach(event => {
        eventsGrid.appendChild(createEventCard(event));
    });
}


/* LOAD EVENTS FROM FIRESTORE */

async function loadEvents() {

    try {

        eventsGrid.innerHTML =
            '<div class="loading-message">Loading school memories...</div>';

        const eventsRef = doc(db, "siteContent", "events");

        const snapshot = await getDoc(eventsRef);

        if (!snapshot.exists()) {
            allEvents = [];
            renderEvents();
            return;
        }

        const data = snapshot.data();

        allEvents = Array.isArray(data.items)
            ? data.items.filter(event =>
                event &&
                typeof event.title === "string" &&
                typeof event.date === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(event.date)
            )
            : [];

        allEvents.sort((a, b) =>
            b.date.localeCompare(a.date)
        );

        renderEvents();

    } catch (error) {

        console.error("Error loading events:", error);

        eventsGrid.replaceChildren(
            createTextElement(
                "p",
                "loading-message",
                "Unable to load events. Please try again later."
            )
        );

        eventCount.textContent = "0";
    }
}


/* CATEGORY FILTER BUTTONS */

categoryFilters.addEventListener("click", event => {

    const button = event.target.closest(".category-btn");

    if (!button) return;

    selectedCategory = button.dataset.category;

    categoryFilters
        .querySelectorAll(".category-btn")
        .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");

    renderEvents();
});


/* DATE SEARCH */

applyDateFilter.addEventListener("click", () => {

    const start = startDateInput.value;
    const end = endDateInput.value;

    if (start && end && start > end) {
        alert("The From Date cannot be later than the To Date.");
        return;
    }

    selectedStartDate = start;
    selectedEndDate = end;

    renderEvents();
});


/* CLEAR FILTERS */

clearFilters.addEventListener("click", () => {

    startDateInput.value = "";
    endDateInput.value = "";

    selectedStartDate = "";
    selectedEndDate = "";

    selectedCategory = "all";

    categoryFilters
        .querySelectorAll(".category-btn")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.category === "all"
            );
        });

    renderEvents();
});


/* INITIALIZE */

loadEvents();