document.addEventListener('DOMContentLoaded', () => {
    gsap.from(".main-content", {
        duration: 0.5,
        opacity: 0,
        y: 10,
        ease: "power1.out"
    });
});
