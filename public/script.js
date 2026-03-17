// Run once the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Current year display in footer msg
  const yearEl = document.getElementById("year-now");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Hamburger toggle
  const btn = document.querySelector(".nav-toggle");
  const list = document.querySelector(".nav");

  if (btn && list) {
    btn.addEventListener("click", () => {
      const open = list.classList.toggle("active");
      btn.classList.toggle("active", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Contact Form
  const form = document.getElementById("contact-form");
  const statusMessage = document.getElementById("status-message");

  if (form && statusMessage) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      statusMessage.classList.remove("visible");
      statusMessage.textContent = "Sending...";
      setTimeout(() => statusMessage.classList.add("visible"), 10);

      const data = {
        name: form.name.value,
        email: form.email.value,
        subject: form.subject.value,
        message: form.message.value,
      };

      try {
        const response = await fetch(
          "https://sendcontactemail-auckbmno2q-ts.a.run.app",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );

        if (response.ok) {
          statusMessage.textContent =
            "✅ Message sent! I’ll get back to you shortly.";
          form.reset();
        } else {
          statusMessage.textContent =
            "❌ Failed to send message. Please try again.";
        }
      } catch (error) {
        console.error("Error:", error);
        statusMessage.textContent =
          "❌ An error occurred while sending your message.";
      }

      statusMessage.classList.add("visible");
    });
  }

  // Auto-expand message box + character counter
  const messageBox = document.getElementById("message");
  const charCount = document.getElementById("char-count");

  if (messageBox && charCount) {
    const updateMessageBoxUI = () => {
      messageBox.style.height = "auto";
      messageBox.style.height = messageBox.scrollHeight + "px";

      const length = messageBox.value.length;
      charCount.textContent = `${length} / 500 characters`;

      charCount.classList.remove("warn", "danger");
      if (length >= 450) {
        charCount.classList.add("danger");
      } else if (length >= 400) {
        charCount.classList.add("warn");
      }
    };

    messageBox.addEventListener("input", updateMessageBoxUI);
    updateMessageBoxUI();
  }

  // AOS init (only if loaded)
  if (window.AOS) {
    AOS.init({ duration: 800, once: true });
  }

  // Swiper init (only if Swiper exists and a swiper element is present)
  if (window.Swiper && document.querySelector(".swiper")) {
    new Swiper(".swiper", {
      loop: true,
      spaceBetween: 30,
      centeredSlides: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      },
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      breakpoints: {
        0: { slidesPerView: 1 },
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
    });
  }

  // Back to top button
  const backToTopBtn = document.getElementById("backToTop");
  if (backToTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add("show");
      } else {
        backToTopBtn.classList.remove("show");
      }
    });

    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});

document.addEventListener("click", (e) => {
  const wrapper = e.target.closest(".video-placeholder");
  if (!wrapper) return;

  const videoId = wrapper.dataset.videoId;

  wrapper.innerHTML = `
    <iframe
      src="https://www.youtube.com/embed/${videoId}?autoplay=1"
      title="Carina Men's Shed Video"
      frameborder="0"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>
  `;
});

document.addEventListener("DOMContentLoaded", () => {
  const placeholders = document.querySelectorAll(".video-placeholder");

  placeholders.forEach((wrapper) => {
    const videoId = wrapper.dataset.videoId;
    if (!videoId) return;

    // 1) If you already put an <img> in the HTML, keep it
    let img = wrapper.querySelector("img");

    // 2) Else if data-thumb exists, create an <img> with that
    if (!img && wrapper.dataset.thumb) {
      img = document.createElement("img");
      img.src = wrapper.dataset.thumb;
      img.alt = "Video preview";
      img.loading = "lazy";
      wrapper.insertBefore(img, wrapper.firstChild);
    }

    // 3) Else auto-generate YouTube thumbnail
    if (!img) {
      img = document.createElement("img");
      img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      img.alt = "YouTube video preview";
      img.loading = "lazy";
      wrapper.insertBefore(img, wrapper.firstChild);
    }

    // Click to load iframe
    wrapper.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      iframe.title = "YouTube video player";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;

      wrapper.innerHTML = "";
      wrapper.appendChild(iframe);
    });
  });
});

import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const nutsBoltsList = document.getElementById("nutsBoltsList");
const nutsBoltsListStatus = document.getElementById("nutsBoltsListStatus");

async function loadNutsAndBoltsIssues() {
  if (!nutsBoltsList || !nutsBoltsListStatus) return;

  try {
    nutsBoltsListStatus.textContent = "Loading issues...";

    const q = query(
      collection(db, "nutsAndBoltsIssues"),
      orderBy("issueNumber", "desc"),
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      nutsBoltsListStatus.textContent = "No issues uploaded yet.";
      return;
    }

    nutsBoltsList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const issue = docSnap.data();

      const li = document.createElement("li");

      const a = document.createElement("a");
      a.href = issue.fileUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = issue.title;

      li.appendChild(a);
      nutsBoltsList.appendChild(li);
    });

    nutsBoltsListStatus.textContent = "";
  } catch (error) {
    console.error(error);
    nutsBoltsListStatus.textContent = "Could not load issues.";
  }
}

loadNutsAndBoltsIssues();

const galleryData = {
  glass: {
    title: "Glass",
    section: "workshop",
    videos: ["EuhqlP_mKe8", "txHxaSR8_70", "1IaHOBiMOXQ"],
    images: [
      { src: "assets/Glasswork-copy2-300x300.jpg", alt: "Glass workshop" },
      { src: "assets/IMG_4593.jpeg", alt: "Glass workshop project display" },
    ],
  },

  leather: {
    title: "Leather",
    section: "workshop",
    videos: ["RrxTlizKFF0"],
    images: [
      { src: "assets/leatherwork.jpg", alt: "Leather workshop" },
      { src: "assets/IMG_4589.jpeg", alt: "Leather workshop project display" },
    ],
  },

  wood: {
    title: "Wood",
    section: "workshop",
    videos: ["wjizZHFv8U4"],
    images: [
      {
        src: "assets/Woodwork-lathe-IMG_E0033cr-e1642731617388-300x300.jpg",
        alt: "Wood workshop",
      },
      {
        src: "assets/DSC2756-scaled-e1642731579677-300x300.jpg",
        alt: "Woodwork display",
      },
      { src: "assets/IMG_4588.jpeg", alt: "Community wood projects" },
      { src: "assets/IMG_4590.jpeg", alt: "Community wood projects" },
      { src: "assets/IMG_4594.jpeg", alt: "Community wood projects" },
      { src: "assets/IMG_4596.jpeg", alt: "Community wood projects" },
      { src: "assets/IMG_4598.jpeg", alt: "Community wood projects" },
    ],
  },

  metal: {
    title: "Metal",
    section: "workshop",
    videos: [],
    images: [{ src: "assets/metalwork.jpg", alt: "Metal workshop" }],
  },

  photography: {
    title: "Photography",
    section: "groups",
    videos: [],
    images: [
      {
        src: "assets/Bruce T Summer Holidays at Currimundi.jpeg",
        alt: "Photography summer display",
      },
      {
        src: "assets/Andrew Clarkson image1.jpeg",
        alt: "Photography close up image",
      },
      {
        src: "assets/Bruce Tranter Friendly Freddo.jpeg",
        alt: "Photography close up image",
      },
      {
        src: "assets/Darryl Neville Bonner 3.jpeg",
        alt: "Photography bridges display",
      },
      {
        src: "assets/PE Park Run 2.jpeg",
        alt: "Photography community display",
      },
    ],
  },

  art: {
    title: "Art",
    section: "groups",
    videos: [],
    images: [
      { src: "assets/art.jpg", alt: "Art group" },
      { src: "assets/IMG_4597.jpeg", alt: "Art group display" },
    ],
  },

  games: {
    title: "Games and Cards",
    section: "groups",
    videos: [],
    images: [
      { src: "assets/IMG_4543.jpeg", alt: "Games and cards" },
      { src: "assets/boardGames.jpg", alt: "Board games and card playing" },
    ],
  },

  gardening: {
    title: "Gardening",
    section: "groups",
    videos: [],
    images: [{ src: "assets/IMG_4540.jpeg", alt: "Gardening group" }],
  },

  kitchen: {
    title: "Kitchen",
    section: "groups",
    videos: [],
    images: [{ src: "assets/IMG_4538.jpeg", alt: "Kitchen group" }],
  },

  music: {
    title: "Music",
    section: "groups",
    videos: [],
    images: [{ src: "assets/band.jpg", alt: "Music group" }],
  },

  exercise: {
    title: "Gym",
    section: "groups",
    videos: [],
    images: [{ src: "assets/Exercise-Classes2.jpg", alt: "Exercise classes" }],
  },

  pool: {
    title: "Pool",
    section: "groups",
    videos: [],
    images: [
      {
        src: "assets/aqua-aerobics-rotated-e1642731910542.jpeg",
        alt: "Pool exercise classes",
      },
    ],
  },

  trips: {
    title: "Trips and Travel",
    section: "community",
    videos: [],
    images: [{ src: "assets/outing.jpg", alt: "Trips and travel" }],
  },

  market: {
    title: "Market Stalls",
    section: "community",
    videos: [],
    images: [{ src: "assets/Market-Stalls2.jpg", alt: "Market stalls" }],
  },

  community: {
    title: "Charity",
    section: "community",
    videos: [],
    images: [
      {
        src: "assets/mealsOnWheels.jpg",
        alt: "Shed members giving toolboxes to Meals on Wheels",
      },
      { src: "assets/IMG_4592.jpeg", alt: "Restored porcelain horse" },
      { src: "assets/Community-Projects-copy2.jpg", alt: "Community projects" },
    ],
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const panels = {
    workshop: document.querySelector(
      "#workshopGalleryPanel .activity-gallery-inner",
    ),
    groups: document.querySelector(
      "#groupsGalleryPanel .activity-gallery-inner",
    ),
    community: document.querySelector(
      "#communityGalleryPanel .activity-gallery-inner",
    ),
  };

  const panelWrappers = {
    workshop: document.getElementById("workshopGalleryPanel"),
    groups: document.getElementById("groupsGalleryPanel"),
    community: document.getElementById("communityGalleryPanel"),
  };

  const cards = document.querySelectorAll(".activity-card");
  let activeGallery = null;

  function createVideoEmbed(videoId) {
    return `
      <div class="gallery-video-card">
        <div class="video-responsive">
          <iframe
            src="https://www.youtube.com/embed/${videoId}"
            title="YouTube video player"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    `;
  }

  function createImageCard(image) {
    return `
      <div class="shopGallery">
        <img src="${image.src}" alt="${image.alt}" loading="lazy" />
      </div>
    `;
  }

  function buildGalleryHTML(item) {
    const videosHTML = item.videos.map(createVideoEmbed).join("");
    const imagesHTML = item.images.map(createImageCard).join("");

    return `
      <div class="activity-gallery-content">
        <div class="activity-gallery-header">
          <h3 class="heading-wood">${item.title}</h3>
        </div>
        <div class="activity-gallery-grid">
          ${videosHTML}
          ${imagesHTML}
        </div>
      </div>
    `;
  }

  function resetCards() {
    cards.forEach((card) => card.setAttribute("aria-expanded", "false"));
  }

  function hideAllPanels() {
    Object.values(panelWrappers).forEach((panel) => {
      panel.hidden = true;
      panel.classList.remove("is-open");
    });
  }

  function openGallery(key, clickedCard) {
    const item = galleryData[key];
    if (!item) return;

    const panel = panels[item.section];
    const panelWrapper = panelWrappers[item.section];
    if (!panel || !panelWrapper) return;

    Object.entries(panels).forEach(([sectionName, sectionPanel]) => {
      sectionPanel.innerHTML = "";
    });

    hideAllPanels();
    resetCards();

    panel.innerHTML = buildGalleryHTML(item);
    panelWrapper.hidden = false;

    requestAnimationFrame(() => {
      panelWrapper.classList.add("is-open");
    });

    clickedCard.setAttribute("aria-expanded", "true");
    activeGallery = key;

    setTimeout(() => {
      panelWrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  function closeGallery() {
    hideAllPanels();
    resetCards();
    activeGallery = null;
  }

  cards.forEach((card) => {
    const key = card.dataset.gallery;

    card.addEventListener("click", () => {
      if (activeGallery === key) {
        closeGallery();
      } else {
        openGallery(key, card);
      }
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (activeGallery === key) {
          closeGallery();
        } else {
          openGallery(key, card);
        }
      }
    });
  });
});