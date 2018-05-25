//-- Three js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


//-- Objects
const pivot = new THREE.Object3D();

const ico = new THREE.IcosahedronBufferGeometry(240);
const icoMaterial = new THREE.MeshLambertMaterial({ color: 0xfdfdfd });

pivot.add(new THREE.Mesh(ico, icoMaterial));


const triangleCount = 1000;

// Size of sphere
const n = 600, n2 = n / 2;

// Size of triangle
const d = 50, d2 = d / 2;

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
        const x = (Math.random() * 2 - 1) * Math.sqrt(n2 * n2 - y * y);
        const z = (Math.random() > 0.5 ? -1 : 1) * Math.sqrt(n2 * n2 - y * y - x * x);

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


scene.add(pivot);


//-- Lights
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 0.5, 1);
scene.add(dirLight);

const ambLight = new THREE.AmbientLight(0x404040);
scene.add(ambLight);


//-- Camera
camera.position.z = 800;


//-- Methods
function animate() {
    window.requestAnimationFrame(animate);

    pivot.rotation.x -= 0.01;
    pivot.rotation.y -= 0.01;

    ringPivots.forEach(
        (ring, i) => {
            ring.rotation.y += (i % 2 ? -1 : 1) * 0.01;
        }
    );

    renderer.render(scene, camera);
}

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
}


//-- Event listeners
window.addEventListener('resize', onWindowResize);

window.addEventListener('mousedown', () => {
    ringPivots.forEach(
        ring => ring.scale.multiplyScalar(1.2)
    );
});

window.addEventListener('mouseup', () => {
    ringPivots.forEach(
        ring => ring.scale.divideScalar(1.2)
    );
});

//-- Run
animate();