document.addEventListener('DOMContentLoaded', () => {

    // Pastikan GSAP dan ScrollTrigger tersedia
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        // Fallback jika GSAP tidak dimuat, setidaknya tampilkan gambar
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
        });
        console.error('GSAP or ScrollTrigger is not loaded.');
        return;
    }

    // --- 1. Daftarkan Plugin GSAP ---
    gsap.registerPlugin(ScrollTrigger);


    // --- 2. Animasi Spotlight Parallax Scroll ---
    const gallerySection = document.querySelector('.horizontal-gallery-section');
    const galleryTrack = document.querySelector('.gallery-track');
    const galleryItems = gsap.utils.toArray('.gallery-item');
    
    if (gallerySection && galleryTrack && galleryItems.length) {
        
        const amountToScroll = galleryTrack.offsetWidth - window.innerWidth;

        const tween = gsap.to(galleryTrack, {
            x: -amountToScroll,
            ease: "none", // Gerakan harus linear untuk kalkulasi yang akurat
        });

        ScrollTrigger.create({
            trigger: gallerySection,
            start: "top top",
            end: () => "+=" + amountToScroll,
            pin: true,
            animation: tween,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: self => {
                const progress = self.progress;
                const viewportCenter = window.innerWidth / 2;

                galleryItems.forEach(item => {
                    // Kalkulasi posisi tengah setiap item relatif terhadap viewport
                    const itemCenter = item.offsetLeft - (progress * amountToScroll) + (item.offsetWidth / 2);
                    const distanceFromCenter = Math.abs(viewportCenter - itemCenter);
                    
                    // Map (memetakan) jarak dari tengah ke nilai skala dan opasitas
                    // Semakin dekat ke tengah (jarak=0), skala dan opasitas mendekati 1
                    // Semakin jauh, skala dan opasitas mengecil
                    const scale = gsap.utils.mapRange(0, viewportCenter, 1, 0.85, distanceFromCenter);
                    const opacity = gsap.utils.mapRange(0, viewportCenter, 1, 0.7, distanceFromCenter);

                    // Terapkan transformasi menggunakan GSAP.set untuk performa
                    gsap.set(item, { 
                        scale: scale, 
                        opacity: opacity,
                        // Bonus: sedikit rotasi 3D untuk efek yang lebih dalam
                        rotationY: -10 * ( (itemCenter - viewportCenter) / viewportCenter ) 
                    });
                });
            }
        });
    }


    // --- 3. Animasi Bagian Layanan (Parallax Scroll with GSAP) ---
    const servicesSection = document.querySelector('.services-section');
    const serviceTabs = gsap.utils.toArray('.service-tab');
    const serviceImages = gsap.utils.toArray('.service-image');

    if (servicesSection && serviceTabs.length > 0 && serviceImages.length > 0) {
        // Make sure the first tab is active by default
        gsap.set(serviceTabs[0], { className: "service-tab active" });
        gsap.set(serviceImages[0], { opacity: 1 });

        // Create a master timeline that is controlled by the scroll position
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: servicesSection,
                start: "top top",
                end: () => "+=" + (serviceTabs.length * window.innerHeight / 2),
                pin: true,
                scrub: true,
                anticipatePin: 1
            }
        });

        // Loop through each tab (starting from the second one)
        serviceTabs.forEach((tab, i) => {
            // Skip the first one since it's already active
            if (i === 0) return;

            const image = document.getElementById(tab.dataset.target);
            const prevTab = serviceTabs[i - 1];
            const prevImage = serviceImages[i - 1];

            // Add an animation step to the timeline for each tab
            tl.addLabel(`step-${i}`)
              // Add active class to the current tab
              .to(tab, {
                  className: "service-tab active",
                  duration: 0.1,
                  onStart: () => {
                    // Also remove active class from the previous tab
                    prevTab.classList.remove('active');
                  }
              }, `step-${i}`)
              // Fade in the corresponding image
              .to(image, { opacity: 1, duration: 0.5 }, `step-${i}`)
              // Fade out the previous image at the same time
              .to(prevImage, { opacity: 0, duration: 0.5 }, `step-${i}`);
        });
    }

});