function playSkeletonBuildUpAnimation() {
    const tl = gsap.timeline();

    tl.from(".skeleton-sidebar", { duration: 0.8, x: -100, opacity: 0, ease: "power3.out" })
      .from(".skeleton-logo", { duration: 0.5, y: -20, opacity: 0, ease: "power2.out" }, "-=0.4")
      .from(".skeleton-profile", { duration: 0.5, y: -20, opacity: 0, ease: "power2.out" }, "-=0.3")
      .from(".skeleton-menu-section", { duration: 0.6, y: -20, opacity: 0, stagger: 0.1, ease: "power2.out" }, "-=0.2")
      .from(".skeleton-main-content", { duration: 0.8, x: 100, opacity: 0, ease: "power3.out" }, "<")
      .from(".skeleton-header", { duration: 0.6, y: -30, opacity: 0, ease: "power2.out" }, "-=0.4")
      .from(".skeleton-stats-overview .skeleton-stat-card", { duration: 0.5, y: -20, opacity: 0, stagger: 0.1, ease: "power2.out" }, "-=0.3")
      .from(".skeleton-table-section", { duration: 0.7, y: 30, opacity: 0, ease: "power2.out" }, "-=0.3")
      .from(".skeleton-table-filter-controls", { duration: 0.5, y: -20, opacity: 0, ease: "power2.out" }, "-=0.4")
      .from(".skeleton-table-row", { duration: 0.4, opacity: 0, stagger: 0.05, ease: "power1.out" }, "-=0.3")
      .from(".skeleton-pagination", { duration: 0.5, y: 20, opacity: 0, ease: "power2.out" }, "-=0.2");
}

function playDashboardEntranceAnimation() {
    const tl = gsap.timeline({ defaults: { duration: 0.6, ease: "back.out(1.2)" } });

    gsap.set("#main-content", { autoAlpha: 1 });
    gsap.set(".sidebar", { x: "-100%", opacity: 0 });
    gsap.set(".header .header-left, .header .header-right", { y: -40, opacity: 0 });
    gsap.set(".stat-card", { y: 30, scale: 0.95, opacity: 0 });
    gsap.set([".table-section", ".sales-summary-section", "#monthlyMonitoringSection"], { y: 40, opacity: 0 });

    tl.to(".sidebar", { x: "0%", opacity: 1, duration: 0.8, ease: "power3.out" })
      .to(".header .header-left, .header .header-right", {
          y: 0,
          opacity: 1,
          stagger: 0.1
      }, "-=0.6")
      .to(".stat-card", {
          y: 0,
          scale: 1,
          opacity: 1,
          stagger: 0.1,
          duration: 0.5
      }, "-=0.4")
      .to([".table-section", ".sales-summary-section", "#monthlyMonitoringSection"], {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          duration: 0.7,
          ease: "power2.out"
      }, "-=0.3");
}