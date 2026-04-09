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

  e.preventDefault();

  const videoId = wrapper.dataset.videoId;
  if (!videoId) return;

  openMediaModal({
    type: "youtube",
    src: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
    title: "Carina Men's Shed Video",
  });
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
  });
});

import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/**
 * Generic function to load PDF links from Firestore
 * @param {string} collectionName - Name of the Firestore collection
 * @param {string} listId - ID of the <ul> element
 * @param {string} statusId - ID of the status message element
 */
async function loadPdfIssues(collectionName, listId, statusId) {
  const listElement = document.getElementById(listId);
  const statusElement = document.getElementById(statusId);

  if (!listElement || !statusElement) return;

  try {
    statusElement.textContent = `Loading ${collectionName.replace(/([A-Z])/g, " $1").toLowerCase()}...`;

    const q = query(
      collection(db, collectionName),
      orderBy("issueNumber", "desc"), // Ensure both collections use this field name
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      statusElement.textContent = "No issues uploaded yet.";
      return;
    }

    listElement.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const issue = docSnap.data();
      const li = document.createElement("li");
      const a = document.createElement("a");

      a.href = issue.fileUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = issue.title;

      li.appendChild(a);
      listElement.appendChild(li);
    });

    statusElement.textContent = "";
  } catch (error) {
    console.error(`Error loading ${collectionName}:`, error);
    statusElement.textContent = "Could not load issues.";
  }
}

// --- Initialize both sections ---
loadPdfIssues("nutsAndBoltsIssues", "nutsBoltsList", "nutsBoltsListStatus");
loadPdfIssues(
  "mondayMeetings",
  "mondayMeetingsList",
  "mondayMeetingsListStatus",
);

// GALLERY
const galleryData = {
  glass: {
    title: "Glass",
    section: "workshop",
    videos: ["EuhqlP_mKe8", "txHxaSR8_70", "1IaHOBiMOXQ", "Afmv6AaLB3w"],
    images: [
      { src: "assets/IMG_4593.jpeg", alt: "Glass workshop project display" },
    ],
  },

  leather: {
    title: "Leather",
    section: "workshop",
    videos: ["RrxTlizKFF0"],
    images: [
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
    images: [],
  },

  photography: {
    title: "Photography",
    section: "groups",
    videos: [],
    photoSections: [
      {
        heading: "Summer",
        images: [
          {
            src: "assets/Bruce T Summer Holidays at Currimundi.jpeg",
            alt: "Photography summer display",
          },
        ],
      },
      {
        heading: "Close Ups",
        images: [
          {
            src: "assets/Andrew Clarkson image1.jpeg",
            alt: "Photography close up image",
          },
          {
            src: "assets/Bruce Tranter Friendly Freddo.jpeg",
            alt: "Photography close up image",
          },
        ],
      },
      {
        heading: "Bridges",
        images: [
          {
            src: "assets/Darryl Neville Bonner 3.jpeg",
            alt: "Photography bridges display",
          },
        ],
      },
      {
        heading: "Community",
        images: [
          {
            src: "assets/PE Park Run 2.jpeg",
            alt: "Photography community display",
          },
        ],
      },
    ],
  },

  art: {
    title: "Art",
    section: "groups",
    videos: [],
    images: [{ src: "assets/IMG_4597.jpeg", alt: "Art group display" }],
  },

  games: {
    title: "Games and Cards",
    section: "groups",
    videos: [],
    images: [
      { src: "assets/boardGames.jpg", alt: "Board games and card playing" },
    ],
  },

  gardening: {
    title: "Gardening",
    section: "groups",
    videos: [],
    images: [],
  },

  kitchen: {
    title: "Kitchen",
    section: "groups",
    videos: [],
    images: [],
  },

  music: {
    title: "Music",
    section: "groups",
    videos: [],
    images: [],
  },

  exercise: {
    title: "Gym",
    section: "groups",
    videos: [],
    images: [],
  },

  pool: {
    title: "Pool",
    section: "groups",
    videos: [],
    images: [],
  },

  trips: {
    title: "Trips and Travel",
    section: "community",
    videos: [],
    images: [],
  },

  market: {
    title: "Market Stalls",
    section: "community",
    videos: [],
    images: [],
  },

  community: {
    title: "Charity",
    section: "community",
    videos: ["DXzKplARB5Q"],
    images: [
      { src: "assets/IMG_4592.jpeg", alt: "Restored porcelain horse" },
      { src: "assets/Community-Projects-copy2.jpg", alt: "Community projects" },
    ],
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".activity-card");
  let activeCard = null;
  let activePanel = null;

  function createVideoEmbed(videoId) {
    return `
    <div class="gallery-video-card">
      <div class="video-placeholder" data-video-id="${videoId}">
        <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" />
        <div class="play-button"></div>
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
    const videosHTML = item.videos?.map(createVideoEmbed).join("") || "";

    if (item.photoSections) {
      const photoSectionsHTML = item.photoSections
        .map(
          (section) => `
          <div class="photo-section-column">
            <h4 class="photo-section-heading">${section.heading}</h4>
            <div class="photo-section-images">
              ${section.images.map(createImageCard).join("")}
            </div>
          </div>
        `,
        )
        .join("");

      return `
      <div class="activity-gallery-content">
        <div class="activity-gallery-header">
        </div>

        ${videosHTML ? `<div class="activity-gallery-grid">${videosHTML}</div>` : ""}

        <div class="photo-sections-grid">
          ${photoSectionsHTML}
        </div>
      </div>
    `;
    }

    const imagesHTML = item.images?.map(createImageCard).join("") || "";

    return `
    <div class="activity-gallery-content">
      <div class="activity-gallery-header">
      </div>
      <div class="activity-gallery-grid">
        ${videosHTML}
        ${imagesHTML}
      </div>
    </div>
  `;
  }

  function closeGallery() {
    if (activePanel) {
      activePanel.remove();
      activePanel = null;
    }

    if (activeCard) {
      activeCard.setAttribute("aria-expanded", "false");
      activeCard = null;
    }
  }

  function getCardsInSameGrid(card) {
    return Array.from(card.parentElement.children).filter((el) =>
      el.classList.contains("activity-card"),
    );
  }

  function getColumnCount(grid) {
    const styles = window.getComputedStyle(grid);
    const columns = styles.gridTemplateColumns.split(" ").length;
    return columns;
  }

  function openGallery(card) {
    const key = card.dataset.gallery;
    const item = galleryData[key];
    if (!item) return;

    const grid = card.parentElement;
    const cardsInGrid = getCardsInSameGrid(card);
    const columnCount = getColumnCount(grid);
    const cardIndex = cardsInGrid.indexOf(card);

    closeGallery();

    const panel = document.createElement("div");
    panel.className = "activity-gallery-row";
    panel.innerHTML = buildGalleryHTML(item);

    const rowEndIndex =
      Math.floor(cardIndex / columnCount) * columnCount + (columnCount - 1);

    const insertAfterCard =
      cardsInGrid[Math.min(rowEndIndex, cardsInGrid.length - 1)];

    insertAfterCard.insertAdjacentElement("afterend", panel);

    requestAnimationFrame(() => {
      panel.classList.add("is-open");
    });

    card.setAttribute("aria-expanded", "true");
    activeCard = card;
    activePanel = panel;
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      if (activeCard === card) {
        closeGallery();
      } else {
        openGallery(card);
      }
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();

        if (activeCard === card) {
          closeGallery();
        } else {
          openGallery(card);
        }
      }
    });
  });
});

/* ===== Media Modal ===== */
/* ===== MEDIA MODAL ===== */
const mediaModal = document.getElementById("mediaModal");
const mediaModalContent = document.getElementById("mediaModalContent");
const mediaModalClose = document.getElementById("mediaModalClose");
const mediaModalPrev = document.getElementById("mediaModalPrev");
const mediaModalNext = document.getElementById("mediaModalNext");

let lastFocusedElement = null;
let currentGalleryItems = [];
let currentGalleryIndex = 0;
let currentMediaType = null;

function showModalNav(show) {
  if (!mediaModalPrev || !mediaModalNext) return;

  mediaModalPrev.hidden = !show;
  mediaModalNext.hidden = !show;
}

function buildImageForModal(img) {
  const modalImg = document.createElement("img");
  modalImg.src = img.currentSrc || img.src;
  modalImg.alt = img.alt || "Expanded image";
  return modalImg;
}

function buildVideoForModal(video) {
  const modalVideo = document.createElement("video");
  modalVideo.controls = true;
  modalVideo.autoplay = true;
  modalVideo.playsInline = true;

  if (video.poster) {
    modalVideo.poster = video.poster;
  }

  if (video.currentSrc) {
    modalVideo.src = video.currentSrc;
  } else {
    const sources = video.querySelectorAll("source");
    sources.forEach((source) => {
      const newSource = document.createElement("source");
      newSource.src = source.src;
      newSource.type = source.type || "";
      modalVideo.appendChild(newSource);
    });
  }

  return modalVideo;
}

function buildIframeForModal(iframe) {
  const modalIframe = document.createElement("iframe");
  modalIframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  modalIframe.allowFullscreen = true;

  const src = iframe.getAttribute("src") || "";

  if (src.includes("youtube.com/embed/")) {
    modalIframe.src = src.includes("?")
      ? `${src}&autoplay=1`
      : `${src}?autoplay=1`;
  } else {
    modalIframe.src = src;
  }

  modalIframe.title = iframe.title || "Expanded video";
  return modalIframe;
}

function renderCurrentModalItem() {
  if (!mediaModalContent) return;

  mediaModalContent.innerHTML = "";

  if (currentMediaType === "image") {
    const currentImg = currentGalleryItems[currentGalleryIndex];
    if (!currentImg) return;

    mediaModalContent.appendChild(buildImageForModal(currentImg));
    showModalNav(currentGalleryItems.length > 1);
    return;
  }

  if (currentMediaType === "video") {
    const currentVideo = currentGalleryItems[currentGalleryIndex];
    if (!currentVideo) return;

    mediaModalContent.appendChild(buildVideoForModal(currentVideo));
    showModalNav(false);
    return;
  }

  if (currentMediaType === "iframe") {
    const currentIframe = currentGalleryItems[currentGalleryIndex];
    if (!currentIframe) return;

    mediaModalContent.appendChild(buildIframeForModal(currentIframe));
    showModalNav(false);
  }
}

function openImageGallery(clickedImg) {
  const galleryRoot =
    clickedImg.closest(
      ".activity-inline-gallery, .activity-gallery-content, .activity-card",
    ) || document;

  currentGalleryItems = Array.from(
    galleryRoot.querySelectorAll(".shopGallery img"),
  );

  currentGalleryIndex = currentGalleryItems.indexOf(clickedImg);
  currentMediaType = "image";

  if (currentGalleryIndex < 0) {
    currentGalleryItems = [clickedImg];
    currentGalleryIndex = 0;
  }

  lastFocusedElement = document.activeElement;
  mediaModal.hidden = false;
  document.body.style.overflow = "hidden";
  renderCurrentModalItem();

  if (mediaModalClose) {
    mediaModalClose.focus();
  }
}

function openSingleVideo(videoEl) {
  currentGalleryItems = [videoEl];
  currentGalleryIndex = 0;
  currentMediaType = "video";

  lastFocusedElement = document.activeElement;
  mediaModal.hidden = false;
  document.body.style.overflow = "hidden";
  renderCurrentModalItem();

  if (mediaModalClose) {
    mediaModalClose.focus();
  }
}

function openMediaModal(item) {
  const modal = document.getElementById("mediaModal");
  const modalContent = document.getElementById("mediaModalContent");

  modalContent.innerHTML = "";

  if (item.type === "youtube") {
    const iframe = document.createElement("iframe");
    iframe.src = item.src;
    iframe.title = item.title || "YouTube video player";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    modalContent.appendChild(iframe);
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeMediaModal() {
  if (!mediaModal || !mediaModalContent) return;

  const iframe = mediaModalContent.querySelector("iframe");
  const video = mediaModalContent.querySelector("video");

  if (iframe) {
    iframe.src = "";
  }

  if (video) {
    video.pause();
    video.currentTime = 0;
  }

  mediaModalContent.innerHTML = "";
  mediaModal.hidden = true;
  document.body.style.overflow = "";

  currentGalleryItems = [];
  currentGalleryIndex = 0;
  currentMediaType = null;
  showModalNav(false);

  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
}

function showNextImage() {
  if (currentMediaType !== "image" || currentGalleryItems.length < 2) return;

  currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryItems.length;
  renderCurrentModalItem();
}

function showPrevImage() {
  if (currentMediaType !== "image" || currentGalleryItems.length < 2) return;

  currentGalleryIndex =
    (currentGalleryIndex - 1 + currentGalleryItems.length) %
    currentGalleryItems.length;
  renderCurrentModalItem();
}

function getClickableMediaTarget(target) {
  return target.closest(
    ".activity-gallery-content .shopGallery img, " +
      ".activity-gallery-content video, " +
      ".activity-gallery-content .video-responsive iframe, " +
      ".photo-section-images .shopGallery img",
  );
}

document.addEventListener("click", (event) => {
  const closeTrigger = event.target.closest("[data-close-modal]");
  if (closeTrigger) {
    closeMediaModal();
    return;
  }

  const mediaTarget = getClickableMediaTarget(event.target);
  if (!mediaTarget) return;

  event.preventDefault();
  event.stopPropagation();

  if (mediaTarget.tagName === "IMG") {
    openImageGallery(mediaTarget);
    return;
  }

  if (mediaTarget.tagName === "VIDEO") {
    openSingleVideo(mediaTarget);
    return;
  }

  if (mediaTarget.tagName === "IFRAME") {
    const src = mediaTarget.getAttribute("src");

    openMediaModal({
      type: "youtube",
      src: src.includes("?") ? `${src}&autoplay=1` : `${src}?autoplay=1`,
      title: mediaTarget.title || "YouTube video",
    });

    return;
  }
});

document.addEventListener("keydown", (event) => {
  if (mediaModal?.hidden) return;

  if (event.key === "Escape") {
    closeMediaModal();
    return;
  }

  if (event.key === "ArrowRight") {
    showNextImage();
    return;
  }

  if (event.key === "ArrowLeft") {
    showPrevImage();
  }
});

if (mediaModalClose) {
  mediaModalClose.addEventListener("click", closeMediaModal);
}

if (mediaModalNext) {
  mediaModalNext.addEventListener("click", showNextImage);
}

if (mediaModalPrev) {
  mediaModalPrev.addEventListener("click", showPrevImage);
}

document.addEventListener("DOMContentLoaded", () => {
  showModalNav(false);
});
