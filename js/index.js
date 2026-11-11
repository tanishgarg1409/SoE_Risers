/* =========================================================
   SOE BARNALA — HOMEPAGE JAVASCRIPT
   ========================================================= */
   import { db } from "./firebase.js";
   
   import {
       doc,
       getDoc
   } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
   
/* =========================================================
   PRELOADER
   ========================================================= */

window.addEventListener("load", () => {
    const preloader = document.getElementById("preloader");
    setTimeout(() => {
        preloader.classList.add("hide");
    }, 700);
});

/* =========================================================
   NAVBAR
   ========================================================= */

const navbar = document.getElementById("navbar");

window.addEventListener("scroll", () => {

    if (window.scrollY > 50) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
});

/* =========================================================
   MOBILE MENU
   ========================================================= */

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", () => {
    navLinks.classList.toggle("open");
});

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("open");
    });
});

/* =========================================================
   ACTIVE NAVIGATION
   ========================================================= */

const sections = document.querySelectorAll("section[id]");
const navItems = document.querySelectorAll(".nav-link");

window.addEventListener("scroll", () => {
    let current = "home";
    sections.forEach(section => {

        const sectionTop =
            section.offsetTop - 150;

        if (window.scrollY >= sectionTop) {
            current = section.getAttribute("id");
        }
    });

    navItems.forEach(item => {
        item.classList.remove("active");

        if (
            item.getAttribute("href") === `#${current}`
        ) {
            item.classList.add("active");
        }
    });
});

/* =========================================================
   DARK / LIGHT MODE
   ========================================================= */

const themeToggle =
    document.getElementById("themeToggle");

const savedTheme =
    localStorage.getItem("soe-theme");

if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "🌙";

}

themeToggle.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    const isDark =
        document.body.classList.contains("dark");

    themeToggle.textContent =
        isDark ? "🌙" : "☀️";

    localStorage.setItem(
        "soe-theme",
        isDark ? "dark" : "light"
    );
});

/* =========================================================
   REVEAL ON SCROLL
   ========================================================= */

const revealElements =
    document.querySelectorAll(".reveal");

const revealObserver =
    new IntersectionObserver(
        entries => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");

                    revealObserver.unobserve(
                        entry.target
                    );
                }
            });

        },
        {
            threshold: 0.12
        }
    );

revealElements.forEach(element => {
    revealObserver.observe(element);
});

/* =========================================================
   ANIMATED STATISTICS
   ========================================================= */

const statNumbers =
    document.querySelectorAll("[data-target]");

let statsStarted = false;

const statsSection =
    document.querySelector(".stats-section");

const statsObserver =
    new IntersectionObserver(
        entries => {

            if (
                entries[0].isIntersecting &&
                !statsStarted
            ) {
                statsStarted = true;

                statNumbers.forEach(counter => {
                    const target =
                        Number(
                            counter.dataset.target
                        );

                    let current = 0;
                    const duration = 1600;
                    const increment =
                        target / (duration / 16);

                    const updateCounter = () => {

                        current += increment;

                        if (current < target) {
                            counter.textContent =
                                Math.floor(current).toLocaleString();
                            requestAnimationFrame(
                                updateCounter
                            );
                        } else {
                            counter.textContent =
                                target.toLocaleString();

                        }

                    };
                    updateCounter();
                });

            }
        },
        {
            threshold: 0.3
        }
    );
statsObserver.observe(statsSection);

/* =========================================================
   DYNAMIC NOTICES
   ========================================================= */

const notices = [
    {
        day: "28",
        month: "SEP",
        title: "Academic session updates",
        description:
            "Important academic information for students and parents."
    },
    {
        day: "25",
        month: "SEP",
        title: "Upcoming school activities",
        description:
            "Stay updated with upcoming academic and co-curricular activities."
    },
    {
        day: "20",
        month: "SEP",
        title: "Student achievement highlights",
        description:
            "Celebrating the dedication and achievements of our students."
    },
    {
        day: "15",
        month: "SEP",
        title: "Parent information notice",
        description:
            "Important information and updates for parents and guardians."
    }
];

const noticeList =
    document.getElementById("noticeList");

notices.forEach(notice => {

    const article =
        document.createElement("article");

    article.className = "notice-item";
    article.innerHTML = `

        <div class="notice-item-date">
            <strong>${notice.day}</strong>
            <span>${notice.month}</span>
        </div>

        <div>
            <h4>${notice.title}</h4>
            <p>${notice.description}</p>
        </div>

        <span class="notice-arrow">
            →
        </span>
    `;
    noticeList.appendChild(article);

});

/* =========================================================
   ACHIEVEMENT BUTTON
   ========================================================= */

const achievementBtn =
    document.getElementById("achievementBtn");

achievementBtn.addEventListener("click", () => {
    alert(
        "The complete achievement gallery will be available here once the school's official content is added."
    );
});

/* =========================================================
   CONTACT FORM
   ========================================================= */

const contactForm =
    document.getElementById("contactForm");

const formMessage =
    document.getElementById("formMessage");

contactForm.addEventListener("submit", event => {
    event.preventDefault();

    const name =
        document.getElementById("name").value.trim();

    if (!name) {
        formMessage.textContent =
            "Please enter your name.";
        return;
    }

    formMessage.textContent =
        `Thank you, ${name}! Your enquiry has been recorded for the demo.`;
    formMessage.style.color =
        "#22c55e";
    contactForm.reset();
});

/* =========================================================
   SCROLL TO TOP
   ========================================================= */

const scrollTop =
    document.getElementById("scrollTop");

window.addEventListener("scroll", () => {

    if (window.scrollY > 500) {
        scrollTop.classList.add("show");

    } else {
        scrollTop.classList.remove("show");
    }
});

scrollTop.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

/* =========================================================
   CURRENT YEAR
   ========================================================= */

document.getElementById("currentYear").textContent =
    new Date().getFullYear();

/* =========================================================
   SMALL HERO PARALLAX EFFECT
   ========================================================= */

const heroVisual =
    document.querySelector(".hero-visual");

document.addEventListener("mousemove", event => {

    if (window.innerWidth < 900) return;

    const x =
        (window.innerWidth / 2 - event.clientX) / 60;

    const y =
        (window.innerHeight / 2 - event.clientY) / 60;

    heroVisual.style.transform =
        `translate(${x}px, ${y}px)`;
});

document.addEventListener("mouseleave", () => {
    heroVisual.style.transform =
        "translate(0, 0)";
});

function renderPublicFaculty(members) {
    const container = document.querySelector(".faculty-grid");

    if (!container) return;

    container.replaceChildren();

    if (!Array.isArray(members) || members.length === 0) {
        return;
    }

    const sortedMembers = [...members].sort(
        (a, b) => Number(a.order) - Number(b.order)
    );

    sortedMembers.forEach(member => {
        const card = document.createElement("div");

        // IMPORTANT: No "reveal" class.
        card.className = "faculty-card";

        const photo = document.createElement("div");
        photo.className = "faculty-photo";

        if (member.imageUrl) {
            const image = document.createElement("img");

            image.src = member.imageUrl;
            image.alt = member.name || "Faculty member";
            image.loading = "lazy";

            image.onerror = () => {
                image.remove();
                photo.textContent = "👩‍🏫";
            };

            photo.appendChild(image);
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

async function loadHomepageImages() {
    try {
        const homepageRef = doc(db, "siteContent", "homepage");
        const homepageSnap = await getDoc(homepageRef);

        if (!homepageSnap.exists()) {
            console.log("Homepage content not found.");
            return;
        }

        const data = homepageSnap.data();
        // LOAD FACULTY MEMBERS
        renderPublicFaculty(data.faculty?.members || []);

        // HERO IMAGE
        if (data.hero?.imageUrl) {
            const hero = document.querySelector(".hero-visual");

            hero.style.backgroundImage =
                `url("${data.hero.imageUrl}")`;

            hero.style.backgroundSize = "cover";
            hero.style.backgroundPosition = "center";
        }

        // ABOUT IMAGE
        if (data.about?.imageUrl) {
            const aboutImage =
                document.querySelector(".about-image");

            aboutImage.innerHTML = `
                <img
                    src="${data.about.imageUrl}"
                    alt="School campus"
                    style="width:100%; height:100%; object-fit:cover; border-radius:inherit;"
                >
            `;
        }
        
        console.log("Homepage images loaded successfully.");

    } catch (error) {
        console.error("Error loading homepage images:", error);
    }
}

loadHomepageImages();

// =========================================
// PRINCIPAL WELCOME POPUP
// =========================================

const welcomePopup = document.getElementById(
    "soeWelcomePopup"
);

const welcomeClose = document.getElementById(
    "soeWelcomeClose"
);

const welcomeEnter = document.getElementById(
    "soeWelcomeEnter"
);

function closeWelcomePopup() {

    welcomePopup.classList.remove("active");

    document.body.style.overflow = "";

    setTimeout(() => {
        welcomePopup.hidden = true;
    }, 350);

    sessionStorage.setItem(
        "soeWelcomeShown",
        "true"
    );
}


if (welcomePopup && !sessionStorage.getItem("soeWelcomeShown")) {

    welcomePopup.hidden = false;

    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
        welcomePopup.classList.add("active");
    });

}


welcomeClose?.addEventListener(
    "click",
    closeWelcomePopup
);

welcomeEnter?.addEventListener(
    "click",
    closeWelcomePopup
);


// Close when clicking outside the card

welcomePopup?.addEventListener("click", event => {

    if (event.target === welcomePopup) {
        closeWelcomePopup();
    }

});


// Close with Escape key

document.addEventListener("keydown", event => {

    if (
        event.key === "Escape" &&
        welcomePopup &&
        !welcomePopup.hidden
    ) {
        closeWelcomePopup();
    }

});