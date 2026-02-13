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
