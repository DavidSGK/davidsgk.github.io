//-- Three js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

document.getElementById('visual').appendChild(renderer.domElement);


//-- Objects
const pivot = new THREE.Object3D();

const ico = new THREE.IcosahedronBufferGeometry(240);
const icoMaterial = new THREE.MeshLambertMaterial({ color: 0xfdfdfd });

pivot.add(new THREE.Mesh(ico, icoMaterial));


const triangleCount = 1000;

// Size of sphere
const n = 600, n2 = n / 2;

// Size of triangle
const d = 32, d2 = d / 2;

// Array of pivot points for rings
const ringPivots = [];
const ringCount = 9;

const dustMaterial = new THREE.MeshLambertMaterial({ 
    color: 0xffffff,
    vertexColors: THREE.VertexColors
});

for (let i = 0; i < ringCount; i++) {

    ringPivots.push(new THREE.Object3D());

    const dust = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const colors = [];
    const color = new THREE.Color();

    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const pC = new THREE.Vector3();
    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();

    const ringHeight = n / ringCount / 6;

    // Allocate more triangles to larger rings
    for (let j = 0; j < triangleCount / ringCount * (ringCount / 2 - Math.abs((ringCount / 2 - i))); j++) {

        // Sphere surface positions
        const y = Math.random() * ringHeight - n2 + i * n / ringCount;

        // Simple to distribute points (somewhat) equally
        let x, z;
        if (Math.random() > 0.5) {
            x = (Math.random() * 2 - 1) * Math.sqrt(n2 * n2 - y * y);
            z = (Math.random() > 0.5 ? -1 : 1) * Math.sqrt(n2 * n2 - y * y - x * x);
        } else {
            z = (Math.random() * 2 - 1) * Math.sqrt(n2 * n2 - y * y);
            x = (Math.random() > 0.5 ? -1 : 1) * Math.sqrt(n2 * n2 - y * y - z * z);
        }

        // Triangle point A
        const ax = x + Math.random() * d - d2;
        const ay = y + Math.random() * d - d2;
        const az = z + Math.random() * d - d2;

        // Triangle point B
        const bx = x + Math.random() * d - d2;
        const by = y + Math.random() * d - d2;
        const bz = z + Math.random() * d - d2;

        // Triangle point C
        const cx = x + Math.random() * d - d2;
        const cy = y + Math.random() * d - d2;
        const cz = z + Math.random() * d - d2;

        positions.push( ax, ay, az );
        positions.push( bx, by, bz );
        positions.push( cx, cy, cz );

        // Normals
        pA.set( ax, ay, az );
        pB.set( bx, by, bz );
        pC.set( cx, cy, cz );
        cb.subVectors( pC, pB );
        ab.subVectors( pA, pB );
        cb.cross( ab );
        cb.normalize();
        const nx = cb.x;
        const ny = cb.y;
        const nz = cb.z;
        normals.push( nx, ny, nz );
        normals.push( nx, ny, nz );
        normals.push( nx, ny, nz );

        // Colors
        const vx = ( x / n ) + 0.5;
        const vy = ( y / n ) + 0.5;
        const vz = ( z / n ) + 0.5;
        color.setRGB( vx, vy, vz );
        colors.push( color.r, color.g, color.b );
        colors.push( color.r, color.g, color.b );
        colors.push( color.r, color.g, color.b );
    }

    // Update geometry
    dust.addAttribute( 'position', new THREE.Float32BufferAttribute(positions, 3).onUpload( disposeArray ));
    dust.addAttribute( 'normal', new THREE.Float32BufferAttribute(normals, 3).onUpload( disposeArray ));
    dust.addAttribute( 'color', new THREE.Float32BufferAttribute(colors, 3).onUpload( disposeArray ));
    // dust.computeBoundingSphere();

    ringPivots[i].add(new THREE.Mesh(dust, dustMaterial));

    scene.add(ringPivots[i]);
}

function disposeArray() {
    this.array = null;
}


// Tweening
const tweenFrom = { scale: 1 };
const tweenTo = { scale: 1.2 };

const tweens = {
    grow: new TWEEN
        .Tween(tweenFrom)
        .to(tweenTo, 450)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(tweenOnUpdate)
        .onStop(tweenOnComplete)
        .onComplete(tweenOnComplete),
    shrink: new TWEEN
        .Tween(tweenTo)
        .to(tweenFrom, 450)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(tweenOnUpdate)
        .onStop(tweenOnComplete)
        .onComplete(tweenOnComplete)
};


function tweenOnUpdate(attr) {
    ringPivots.forEach(
        ring => {
            ring.scale.set(attr.scale, attr.scale, attr.scale)
        }
    );
    pivot.scale.set(1 / attr.scale, 1 / attr.scale, 1 / attr.scale);
}

function tweenOnComplete() {
    tweenFrom.scale = 1;
    tweenTo.scale = 1.2;
}


scene.add(pivot);


//-- Lights
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 0.5, 1);
scene.add(dirLight);


//-- Camera
camera.position.z = 800;


//-- Methods
function animate() {
    window.requestAnimationFrame(animate);

    // Rotate ico
    pivot.rotation.x -= 0.005;
    pivot.rotation.y -= 0.005;

    // Rotate rings
    ringPivots.forEach(
        (ring, i) => {
            ring.rotation.y += (i % 2 ? -1 : 1) * 0.005;
        }
    );

    renderer.render(scene, camera);

    TWEEN.update();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function clickAnimation(grow) {
    if (grow) {
        tweens.shrink.stop();
        tweens.grow.start();
    } else {
        tweens.grow.stop();
        tweens.shrink.start();
    }
}

// Rotating effect based on cursor position
function moveCamera(x, y) {
    camera.position.set(
        window.innerWidth / 2 - x,
        y - window.innerHeight / 2,
        camera.position.z
    );
    camera.lookAt(scene.position);
}


//-- Event listeners
window.addEventListener('resize', onWindowResize);

window.addEventListener('mousedown', () => clickAnimation(true));
window.addEventListener('touchstart', () => clickAnimation(true));

window.addEventListener('mouseup', () => clickAnimation(false));
window.addEventListener('touchend', () => clickAnimation(false));

window.addEventListener('mousemove', e => moveCamera(e.clientX, e.clientY));
window.addEventListener('touchmove', e => moveCamera(e.touches[0].clientX, e.touches[0].clientY));

//-- Run
animate();
