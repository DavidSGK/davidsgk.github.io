//-- Context
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

//-- Objects

// Spaceship
const spaceship = {
    x: 100,
    y: 100,
    color: 'white',
    draw: function() {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + 16, this.y + 32);
        ctx.lineTo(this.x, this.y + 24);
        ctx.lineTo(this.x - 16, this.y + 32);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = this.color;
        ctx.stroke();
    }
};

const randomDelta = () => Math.random() * 0.5 + 0.75;

const asteroidGen = (x, y) => {
    const baseSize = 50;
    ctx.strokeStyle = 'white';
    const scale = 0.5 + Math.random();
    ctx.scale = scale;

    ctx.translate(x - 50, y - 50);
    ctx.rotate(Math.random());

    let prevX = 0;
    let prevY = 0;

    ctx.moveTo(prevX, prevY);

    prevX = prevX + 50 * randomDelta();
    ctx.lineTo(prevX, prevY);

    prevX = prevX + 50 / Math.sqrt(2) * randomDelta();
    prevY = prevY + 50 / Math.sqrt(2) * randomDelta();
    ctx.lineTo(prevX, prevY);

    prevY = prevY + 50 * randomDelta();
    ctx.lineTo(prevX, prevY);

    prevX = prevX - 50 / Math.sqrt(2) * randomDelta();
    prevY = prevY + 50 / Math.sqrt(2) * randomDelta();
    ctx.lineTo(prevX, prevY);

    prevX = prevX - 50 * randomDelta();
    ctx.lineTo(prevX, prevY);

    prevX = prevX - 50 / Math.sqrt(2) * randomDelta();
    prevY = prevY - 50 / Math.sqrt(2) * randomDelta();
    ctx.lineTo(prevX, prevY);

    prevY = prevY - 50 * randomDelta();
    ctx.lineTo(prevX, prevY);

    ctx.lineTo(0, 0);

    ctx.stroke();

    // Reset
    ctx.scale = 1;
    ctx.rotate(0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
};


//-- Render
const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    spaceship.draw();
};

const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
};

const init = () => {
    window.addEventListener('resize', resize);
    draw();
    resize();
};

//-- Main
init();

canvas.addEventListener('click', e => {
    //spaceship.x = e.clientX;
    //spaceship.y = e.clientY;
    asteroidGen(e.clientX, e.clientY);
    //window.requestAnimationFrame(draw);
})