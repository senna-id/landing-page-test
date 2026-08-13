/**
* Template Name: OnePage
* Updated: Aug 07 2024 with Bootstrap v5.3.3
*/

(function() {
  "use strict";

  /**
   * Apply .scrolled class to the body as the page is scrolled down
   */
  function toggleScrolled() {
    const selectBody = document.querySelector('body');
    const selectHeader = document.querySelector('#header');
    if (!selectHeader) return;
    if (!selectHeader.classList.contains('scroll-up-sticky') && !selectHeader.classList.contains('sticky-top') && !selectHeader.classList.contains('fixed-top')) return;
    window.scrollY > 100 ? selectBody.classList.add('scrolled') : selectBody.classList.remove('scrolled');
  }

  document.addEventListener('scroll', toggleScrolled);
  window.addEventListener('load', toggleScrolled);

  /**
   * Mobile nav toggle (Menggunakan Event Delegation agar tetap berfungsi pada komponen dinamis)
   */
  document.addEventListener('click', function(e) {
    const mobileNavToggleBtn = e.target.closest('.mobile-nav-toggle');
    if (mobileNavToggleBtn) {
      document.querySelector('body').classList.toggle('mobile-nav-active');
      mobileNavToggleBtn.classList.toggle('bi-list');
      mobileNavToggleBtn.classList.toggle('bi-x');
    }
  });

  /**
   * Hide mobile nav on same-page/hash links (Menggunakan Event Delegation)
   */
  document.addEventListener('click', function(e) {
    const navLink = e.target.closest('#navmenu a');
    if (navLink && document.querySelector('.mobile-nav-active')) {
      document.querySelector('body').classList.remove('mobile-nav-active');
      const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');
      if (mobileNavToggleBtn) {
        mobileNavToggleBtn.classList.add('bi-list');
        mobileNavToggleBtn.classList.remove('bi-x');
      }
    }
  });

  /**
   * Toggle mobile nav dropdowns (Menggunakan Event Delegation)
   */
  document.addEventListener('click', function(e) {
    const toggleDropdownBtn = e.target.closest('.navmenu .toggle-dropdown');
    if (toggleDropdownBtn) {
      e.preventDefault();
      toggleDropdownBtn.parentNode.classList.toggle('active');
      if (toggleDropdownBtn.parentNode.nextElementSibling) {
        toggleDropdownBtn.parentNode.nextElementSibling.classList.toggle('dropdown-active');
      }
    }
  });

  /**
   * Preloader
   */
  const preloader = document.querySelector('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove();
    });
  }

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector('.scroll-top');
  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100 ? scrollTop.classList.add('active') : scrollTop.classList.remove('active');
    }
  }

  if (scrollTop) {
    scrollTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
    window.addEventListener('load', toggleScrollTop);
    document.addEventListener('scroll', toggleScrollTop);
  }

  /**
   * Animation on scroll function and init
   */
  function aosInit() {
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 600,
        easing: 'ease-in-out',
        once: true,
        mirror: false
      });
    }
  }
  window.addEventListener('load', aosInit);

  /**
   * Initiate Pure Counter
   */
  if (typeof PureCounter !== 'undefined') {
    new PureCounter();
  }

  /**
   * Initiate glightbox
   */
  if (typeof GLightbox !== 'undefined') {
    GLightbox({ selector: '.glightbox' });
  }

  /**
   * Init swiper sliders
   */
  function initSwiper() {
    document.querySelectorAll(".init-swiper").forEach(function(swiperElement) {
      let config = JSON.parse(swiperElement.querySelector(".swiper-config").innerHTML.trim());
      if (typeof Swiper !== 'undefined') {
        new Swiper(swiperElement, config);
      }
    });
  }
  window.addEventListener("load", initSwiper);

})();

// ==========================================
// LOAD FOOTER OTOMATIS (Aman & Mandiri)
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
  const footerContainer = document.getElementById("footer-placeholder");
  if (footerContainer) {
    fetch("footer.html")
      .then(response => {
        if (!response.ok) {
          throw new Error("HTTP Status: " + response.status);
        }
        return response.text();
      })
      .then(data => {
        footerContainer.innerHTML = data;
      })
      .catch(error => {
        console.error("Gagal memuat footer:", error);
      });
  }
});