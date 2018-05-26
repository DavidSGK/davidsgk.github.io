// Main toggle
const toggle = document.getElementById('main-toggle');
const left = document.querySelector('#main.left');
const right = document.querySelector('#main.right');
let open = false;

toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    left.classList.toggle('hidden');
    right.classList.toggle('hidden');
})