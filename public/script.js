    //current year display in footer msg
    document.getElementById('year-now').textContent = new Date().getFullYear();


    //Hamburger toggle
    const btn = document.querySelector('.nav-toggle');
    const list = document.querySelector('.nav');

    btn.addEventListener('click', () => {
        const open = list.classList.toggle('active');
        btn.classList.toggle('active', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });


    //Contact Form
    const form = document.getElementById("contact-form");
    const statusMessage = document.getElementById("status-message");

    form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusMessage.textContent = "Sending...";

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
        const response = await fetch("https://sendcontactemail-auckbmno2q-ts.a.run.app ", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        });

        if (response.ok) {
        statusMessage.textContent = "✅ Message sent! I’ll get back to you shortly.";
        form.reset();
        } else {
        statusMessage.textContent = "❌ Failed to send message. Please try again.";
        }
    } catch (error) {
        console.error("Error:", error);
        statusMessage.textContent = "❌ An error occurred while sending your message.";
    }

        statusMessage.classList.add("visible");
    });

    // Auto-expand message box as user types
    const messageBox = document.getElementById("message");
    const charCount = document.getElementById("char-count");

    messageBox.addEventListener("input", () => {
    messageBox.style.height = "auto"; // reset
    messageBox.style.height = messageBox.scrollHeight + "px";
    
        const length = messageBox.value.length;
    charCount.textContent = `${length} / 500 characters`;

    // Reset styles
    charCount.classList.remove("warn", "danger");

    // Apply color thresholds
    if (length >= 450) {
        charCount.classList.add("danger");
    } else if (length >= 400) {
        charCount.classList.add("warn");
    }
    });

    window.addEventListener("DOMContentLoaded", () => {
    messageBox.style.height = "auto";
    messageBox.style.height = messageBox.scrollHeight + "px";
    });

    messageBox.addEventListener("input", () => {
    messageBox.style.height = "auto";
    messageBox.style.height = messageBox.scrollHeight + "px";

    const currentLength = messageBox.value.length;
    charCount.textContent = `${currentLength} / 500 characters`;
    });

    const toggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'light') {
        document.body.classList.add('light');
        themeIcon.textContent = '🌞';
    }

    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light');
        const isLight = document.body.classList.contains('light');
        themeIcon.textContent = isLight ? '🌞' : '🌙';
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });


    document.addEventListener("DOMContentLoaded", function () {
        AOS.init({ duration: 800, once: true });

        const swiper = new Swiper('.swiper', {
        loop: true,
        spaceBetween: 30,
        centeredSlides: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        breakpoints: {
            768: {
            slidesPerView: 2,
            },
            1024: {
            slidesPerView: 3,
            },
            0: {
            slidesPerView: 1,
            },
        }
        });
    });
    