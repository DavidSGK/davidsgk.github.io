// let MAX_HEIGHT = window.innerHeight - 80;
// const BASE_MOUNTAIN_HEIGHT = 240;

// function drawMountain(context, x, height, color, snowCap = false) {
//   context.fillStyle = color;
//   context.beginPath();
//   context.moveTo(x, MAX_HEIGHT);
//   context.lineTo(x - height, MAX_HEIGHT);
//   context.lineTo(x, MAX_HEIGHT - height);
//   context.lineTo(x + height, MAX_HEIGHT);
//   context.lineTo(x, MAX_HEIGHT);
//   context.closePath();
//   context.fill();

//   if (snowCap) {
//     context.fillStyle = '#FDFDFD';
//     context.beginPath();
//     context.moveTo(x, MAX_HEIGHT - height);
//     context.lineTo(x - 30, MAX_HEIGHT - height + 30);
//     context.lineTo(x - 20, MAX_HEIGHT - height + 40);
//     context.lineTo(x - 10, MAX_HEIGHT - height + 30);
//     context.lineTo(x, MAX_HEIGHT - height + 40);
//     context.lineTo(x + 10, MAX_HEIGHT - height + 30);
//     context.lineTo(x + 20, MAX_HEIGHT - height + 40);
//     context.lineTo(x + 30, MAX_HEIGHT - height + 30);
//     context.lineTo(x, MAX_HEIGHT - height);
//     context.closePath();
//     context.fill();
//   }
// }


// const bg = document.getElementById('background');
// const ctx = bg.getContext('2d');


// function draw() {
//   ctx.fillStyle = 'rgb(255, 253, 242)';
//   ctx.arc(bg.width / 2, bg.height / 2, 160, 0, Math.PI * 2);
//   ctx.fill();

//   ctx.fillStyle = 'rgba(255, 253, 242, 0.5)';
//   ctx.arc(bg.width / 2, bg.height / 2, 200, 0, Math.PI * 2);
//   ctx.fill();

//   ctx.fillStyle = 'rgba(255, 253, 242, 0.25)';
//   ctx.arc(bg.width / 2, bg.height / 2, 240, 0, Math.PI * 2);
//   ctx.fill();

//   for (let x = 0; x < bg.width + 1; x += bg.width / 6) {
//     if (Math.random() > 0.10) {
//       drawMountain(ctx, x, BASE_MOUNTAIN_HEIGHT * (Math.random() * 0.5 + 1), '#baf7ff', true);
//     }
//   }
//   for (let x = 0; x < bg.width + 1; x += bg.width / 16) {
//     if (Math.random() > 0.25) {
//       drawMountain(ctx, x, BASE_MOUNTAIN_HEIGHT * (Math.random() * 0.5 + 0.5), '#16BAC5');
//     }
//   }
//   drawMountain(ctx, 0, BASE_MOUNTAIN_HEIGHT * 0.5, '#f3ffa0');
//   for (let x = 0; x < bg.width; x += bg.width / 16) {
//     if (Math.random() > 0.25) {
//       drawMountain(ctx, x, BASE_MOUNTAIN_HEIGHT * (Math.random() * 0.25 + 0.4), '#f3ffa0');
//     }
//   }
//   drawMountain(ctx, bg.width, BASE_MOUNTAIN_HEIGHT * 0.5, '#f3ffa0');

//   ctx.fillStyle = '#f3ffa0';
//   ctx.fillRect(0, MAX_HEIGHT, bg.width, 80);

//   ctx.fillStyle = '#c6c6c6';
//   ctx.beginPath();
//   ctx.moveTo(bg.width / 2 - 130, bg.height);
//   ctx.lineTo(bg.width / 2 - 110, bg.height - 50);
//   ctx.lineTo(bg.width / 2 - 90, bg.height - 70);
//   ctx.lineTo(bg.width / 2 + 20, bg.height - 100);
//   ctx.lineTo(bg.width / 2 + 80, bg.height - 80);
//   ctx.lineTo(bg.width / 2 + 110, bg.height - 60);
//   ctx.lineTo(bg.width / 2 + 130, bg.height);
//   ctx.closePath();
//   ctx.fill();
// }

// function onWindowResize() {
//   bg.width = window.innerWidth;
//   bg.height = window.innerHeight;
//   MAX_HEIGHT = window.innerHeight - 80;

//   draw();
// }

// window.addEventListener('resize', onWindowResize);

// onWindowResize();

// function onLoad() {
//   document.querySelector('.landing').classList.remove('loading');
// }

// window.onload = onLoad;

import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(<App />);