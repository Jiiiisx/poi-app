document.addEventListener('DOMContentLoaded', () => {
    gsap.set(".main-content", { opacity: 0, y: 10 });

    document.addEventListener('page-rendered', () => {
        gsap.to(".main-content", {
            duration: 0.5,
            opacity: 1,
            y: 0,
            ease: "power1.out"
        });
    });
});