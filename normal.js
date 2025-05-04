// JavaScript for mobile toggle
document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.querySelector('.header__menu-btn');
    const closeBtn = document.querySelector('.header__close-btn');
    const nav = document.querySelector('.header__nav');
  
    menuBtn.addEventListener('click', () => {
      nav.classList.add('active');
    });
  
    closeBtn.addEventListener('click', () => {
      nav.classList.remove('active');
    });
  
    // Close menu when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !menuBtn.contains(e.target)) {
        nav.classList.remove('active');
      }
    });
  
    // Close menu when clicking links
    document.querySelectorAll('.header__link').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('active');
      });
    });
  });