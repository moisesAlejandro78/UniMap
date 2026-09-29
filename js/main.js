import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// =====================================================
// DATOS DE OFICINAS (ejemplo – edita según tu edificio)
// =====================================================
const OFFICES = [
    // Piso 1
    { id: 1,  name: 'Recepción',           floor: 1,  person: 'Ana López',      dept: 'Atención',     desc: 'Punto de ingreso principal del edificio. Atención a visitantes y registro.', pos: [2, 1.2, 3] },
    { id: 2,  name: 'Sala de espera',      floor: 1,  person: '—',               dept: 'Común',        desc: 'Área de espera cómoda para visitantes y proveedores.', pos: [-2, 1.2, 2] },
    { id: 3,  name: 'Seguridad',           floor: 1,  person: 'Carlos Ruiz',     dept: 'Seguridad',    desc: 'Centro de monitoreo y control de accesos 24/7.', pos: [0, 1.2, -3] },

    // Piso 2
    { id: 4,  name: 'Recursos Humanos',    floor: 2,  person: 'María Gómez',     dept: 'RRHH',         desc: 'Gestión de personal, contrataciones y bienestar laboral.', pos: [3, 4.5, 1] },
    { id: 5,  name: 'Sala de entrevistas', floor: 2,  person: '—',               dept: 'RRHH',         desc: 'Espacio reservado para entrevistas y reuniones confidenciales.', pos: [-1, 4.5, 2] },

    // Piso 3
    { id: 6,  name: 'Marketing',           floor: 3,  person: 'Laura Pérez',     dept: 'Marketing',    desc: 'Equipo de marketing digital, branding y comunicación.', pos: [2, 8, 0] },
    { id: 7,  name: 'Diseño',              floor: 3,  person: 'Diego Torres',    dept: 'Creativo',     desc: 'Estudio de diseño gráfico y UX/UI.', pos: [-3, 8, 1] },

    // Piso 4
    { id: 8,  name: 'Desarrollo',          floor: 4,  person: 'Andrés Soto',     dept: 'TI',           desc: 'Equipo de desarrollo de software y aplicaciones.', pos: [1, 11.5, -1] },
    { id: 9,  name: 'QA / Testing',        floor: 4,  person: 'Sofía Ramírez',   dept: 'TI',           desc: 'Control de calidad y pruebas de software.', pos: [-2, 11.5, 2] },

    // Piso 5
    { id: 10, name: 'Finanzas',            floor: 5,  person: 'Roberto Díaz',    dept: 'Finanzas',     desc: 'Contabilidad, presupuestos y control financiero.', pos: [0, 15, 1] },
    { id: 11, name: 'Legal',               floor: 5,  person: 'Elena Vargas',    dept: 'Legal',        desc: 'Asesoría jurídica y cumplimiento normativo.', pos: [3, 15, -2] },

    // Piso 6-13 (ejemplos)
    { id: 12, name: 'Sala de juntas A',    floor: 6,  person: '—',               dept: 'Común',        desc: 'Sala de reuniones para hasta 12 personas.', pos: [1, 18.5, 0] },
    { id: 13, name: 'Dirección General',   floor: 7,  person: 'Javier Mendoza',  dept: 'Dirección',    desc: 'Oficina del Director General.', pos: [0, 22, 0] },
    { id: 14, name: 'Innovación',          floor: 8,  person: 'Camila Ríos',     dept: 'Innovación',   desc: 'Laboratorio de innovación y nuevos productos.', pos: [2, 25.5, 1] },
    { id: 15, name: 'Soporte IT',          floor: 9,  person: 'Pedro Castro',    dept: 'TI',           desc: 'Mesa de ayuda técnica y soporte a usuarios.', pos: [-1, 29, -1] },
    { id: 16, name: 'Comedor',             floor: 10, person: '—',               dept: 'Común',        desc: 'Área de comedor y descanso para colaboradores.', pos: [0, 32.5, 2] },
    { id: 17, name: 'Capacitación',        floor: 11, person: 'Lucía Herrera',   dept: 'RRHH',         desc: 'Aula de formación y talleres internos.', pos: [2, 36, 0] },
    { id: 18, name: 'Archivo',             floor: 12, person: '—',               dept: 'Admin',        desc: 'Almacenamiento de documentos físicos.', pos: [-2, 39.5, 1] },
    { id: 19, name: 'Terraza / Eventos',   floor: 13, person: '—',               dept: 'Común',        desc: 'Terraza con vista y espacio para eventos corporativos.', pos: [0, 43, 0] },
];

// Altura aproximada por piso (ajusta según tu modelo real)
const FLOOR_HEIGHT = 3.5;

// =====================================================
// AUTH
// =====================================================
const STORAGE_KEY = 'unimap_users';
const SESSION_KEY = 'unimap_session';

function getUsers() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}
function saveUsers(users) { localStorage.setItem(STORAGE_KEY, JSON.stringify(users)); }
function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
}
function setSession(user) { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

// =====================================================
// UI REFS
// =====================================================
const authScreen = document.getElementById('auth-screen');
const app = document.getElementById('app');
const authOptions = document.getElementById('auth-options');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const userInfo = document.getElementById('user-info');
const floorList = document.getElementById('floor-list');
const currentFloorLabel = document.getElementById('current-floor-label');
const loadingEl = document.getElementById('loading');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const btnClearSearch = document.getElementById('btn-clear-search');
const infoPanel = document.getElementById('info-panel');

// =====================================================
// AUTH FLOW
// =====================================================
function showAuthOptions() {
    authOptions.classList.remove('hidden');
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
}
function showLogin() {
    authOptions.classList.add('hidden');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
}
function showRegister() {
    authOptions.classList.add('hidden');
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
}

function enterApp(user) {
    authScreen.classList.add('hidden');
    app.classList.remove('hidden');
    userInfo.textContent = user.type === 'guest' ? 'Invitado' : (user.name || user.email);
    initViewer();
    generateFloorButtons();
    setupSearch();
    setupMobileMenu();
    setupInfoPanel();
}

document.getElementById('btn-login').addEventListener('click', showLogin);
document.getElementById('btn-register').addEventListener('click', showRegister);
document.getElementById('btn-guest').addEventListener('click', () => {
    const guest = { type: 'guest', name: 'Invitado' };
    setSession(guest);
    enterApp(guest);
});

document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', showAuthOptions);
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const user = getUsers().find(u => u.email === email && u.password === password);
    if (!user) {
        errorEl.textContent = 'Correo o contraseña incorrectos';
        errorEl.classList.remove('hidden');
        return;
    }
    errorEl.classList.add('hidden');
    setSession({ type: 'user', email: user.email, name: user.name });
    enterApp({ type: 'user', email: user.email, name: user.name });
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    const errorEl = document.getElementById('register-error');

    if (password !== confirm) {
        errorEl.textContent = 'Las contraseñas no coinciden';
        errorEl.classList.remove('hidden');
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
        errorEl.classList.remove('hidden');
        return;
    }
    const users = getUsers();
    if (users.some(u => u.email === email)) {
        errorEl.textContent = 'Ya existe una cuenta con este correo';
        errorEl.classList.remove('hidden');
        return;
    }
    users.push({ name, email, password });
    saveUsers(users);
    errorEl.classList.add('hidden');
    setSession({ type: 'user', email, name });
    enterApp({ type: 'user', email, name });
});

document.getElementById('btn-logout').addEventListener('click', () => {
    clearSession();
    location.reload();
});

const existingSession = getSession();
if (existingSession) enterApp(existingSession);

// =====================================================
// MENÚ MÓVIL
// =====================================================
function setupMobileMenu() {
    const btnMenu = document.getElementById('btn-menu');
    const btnClose = document.getElementById('btn-close-sidebar');

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('visible');
        document.body.style.overflow = '';
    }

    btnMenu.addEventListener('click', openSidebar);
    btnClose.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // Cerrar al elegir piso en móvil
    floorList.addEventListener('click', (e) => {
        if (window.innerWidth < 900 && e.target.closest('.floor-btn')) {
            closeSidebar();
        }
    });
}

// =====================================================
// PISOS
// =====================================================
const TOTAL_FLOORS = 13;
let currentFloor = 1;
let floorButtons = [];

function generateFloorButtons() {
    floorList.innerHTML = '';
    floorButtons = [];

    for (let i = 1; i <= TOTAL_FLOORS; i++) {
        const count = OFFICES.filter(o => o.floor === i).length;
        const btn = document.createElement('button');
        btn.className = 'floor-btn' + (i === 1 ? ' active' : '');
        btn.innerHTML = `
            <span class="floor-number">${i}</span>
            <span>Piso ${i}</span>
            ${count ? `<span class="floor-count">${count}</span>` : ''}
        `;
        btn.addEventListener('click', () => selectFloor(i));
        floorList.appendChild(btn);
        floorButtons.push(btn);
    }
}

function selectFloor(floor, officeId = null) {
    currentFloor = floor;
    currentFloorLabel.textContent = `Piso ${floor}`;

    floorButtons.forEach((btn, idx) => {
        btn.classList.toggle('active', idx + 1 === floor);
    });

    updateHotspotsVisibility(floor);

    if (window.viewerControls && window.viewerCamera) {
        const targetY = (floor - 1) * FLOOR_HEIGHT + 1.5;
        const camY = targetY + 5;
        window.viewerCamera.position.set(10, camY, 12);
        window.viewerControls.target.set(0, targetY, 0);
        window.viewerControls.update();
    }

    if (officeId) {
        const office = OFFICES.find(o => o.id === officeId);
        if (office) showInfoPanel(office);
    }
}

// =====================================================
// BÚSQUEDA
// =====================================================
function setupSearch() {
    searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        btnClearSearch.classList.toggle('hidden', !q);

        if (!q) {
            searchResults.classList.add('hidden');
            searchResults.innerHTML = '';
            return;
        }

        const results = OFFICES.filter(o =>
            o.name.toLowerCase().includes(q) ||
            o.person.toLowerCase().includes(q) ||
            o.dept.toLowerCase().includes(q) ||
            o.desc.toLowerCase().includes(q)
        );

        searchResults.classList.remove('hidden');

        if (results.length === 0) {
            searchResults.innerHTML = `<div class="search-empty">No se encontraron resultados</div>`;
            return;
        }

        searchResults.innerHTML = results.map(o => `
            <div class="search-result-item" data-id="${o.id}">
                <span class="result-name">${o.name}</span>
                <span class="result-meta">Piso ${o.floor} · ${o.dept}${o.person !== '—' ? ' · ' + o.person : ''}</span>
            </div>
        `).join('');

        searchResults.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = parseInt(el.dataset.id, 10);
                const office = OFFICES.find(o => o.id === id);
                if (office) {
                    selectFloor(office.floor, office.id);
                    searchInput.value = '';
                    btnClearSearch.classList.add('hidden');
                    searchResults.classList.add('hidden');
                    if (window.innerWidth < 900) {
                        sidebar.classList.remove('open');
                        sidebarOverlay.classList.remove('visible');
                        document.body.style.overflow = '';
                    }
                }
            });
        });
    });

    btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        btnClearSearch.classList.add('hidden');
        searchResults.classList.add('hidden');
        searchResults.innerHTML = '';
        searchInput.focus();
    });
}

// =====================================================
// INFO PANEL
// =====================================================
let selectedOffice = null;

function setupInfoPanel() {
    document.getElementById('btn-close-info').addEventListener('click', hideInfoPanel);
    document.getElementById('btn-focus-office').addEventListener('click', () => {
        if (selectedOffice && window.viewerCamera && window.viewerControls) {
            const [x, y, z] = selectedOffice.pos;
            window.viewerCamera.position.set(x + 6, y + 4, z + 8);
            window.viewerControls.target.set(x, y, z);
            window.viewerControls.update();
            hideInfoPanel();
        }
    });
}

function showInfoPanel(office) {
    selectedOffice = office;
    document.getElementById('info-floor').textContent = `Piso ${office.floor}`;
    document.getElementById('info-title').textContent = office.name;
    document.getElementById('info-desc').textContent = office.desc;

    const meta = document.getElementById('info-meta');
    meta.innerHTML = '';
    if (office.dept) meta.innerHTML += `<span>${office.dept}</span>`;
    if (office.person && office.person !== '—') meta.innerHTML += `<span>${office.person}</span>`;

    infoPanel.classList.remove('hidden');
    // Pequeño delay para animación
    requestAnimationFrame(() => infoPanel.classList.add('open'));
}

function hideInfoPanel() {
    infoPanel.classList.remove('open');
    setTimeout(() => infoPanel.classList.add('hidden'), 300);
    selectedOffice = null;
}

// =====================================================
// VISOR 3D + HOTSPOTS
// =====================================================
let hotspotGroup = null;
let labelRenderer = null;
let raycaster = null;
let mouse = null;
let hotspotMeshes = [];

function initViewer() {
    const canvas = document.getElementById('viewer');
    const container = canvas.parentElement;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(10, 8, 14);
    window.viewerCamera = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // CSS2D para etiquetas de hotspots
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 4;
    controls.maxDistance = 100;
    controls.target.set(0, 4, 0);
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    window.viewerControls = controls;

    // Luces
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.6));
    const dir = new THREE.DirectionalLight(0xffffff, 2.2);
    dir.position.set(10, 18, 10);
    dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.7);
    fill.position.set(-8, 5, -8);
    scene.add(fill);

    scene.add(new THREE.GridHelper(80, 40, 0x1e2530, 0x151a22));

    // Grupo de hotspots
    hotspotGroup = new THREE.Group();
    scene.add(hotspotGroup);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Cargar modelo
    const loader = new GLTFLoader();
    loader.load(
        './models/oficinas.glb',
        (gltf) => {
            const model = gltf.scene;
            scene.add(model);

            model.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) model.scale.setScalar(25 / maxDim);

            const boxF = new THREE.Box3().setFromObject(model);
            const center = boxF.getCenter(new THREE.Vector3());
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= boxF.min.y;

            createHotspots();
            updateHotspotsVisibility(1);
            loadingEl.classList.add('hidden');
        },
        (xhr) => {
            if (xhr.total) {
                loadingEl.querySelector('span').textContent =
                    `Cargando modelo 3D... ${((xhr.loaded / xhr.total) * 100).toFixed(0)}%`;
            }
        },
        (err) => {
            console.error(err);
            loadingEl.querySelector('span').textContent =
                'No se pudo cargar el modelo. Verifica ./models/oficinas.glb';
            // Aun sin modelo, crear hotspots de ejemplo
            createHotspots();
            updateHotspotsVisibility(1);
            loadingEl.classList.add('hidden');
        }
    );

    // Click / touch en hotspots
    function onPointer(event) {
        const rect = canvas.getBoundingClientRect();
        const clientX = event.clientX ?? event.changedTouches?.[0]?.clientX;
        const clientY = event.clientY ?? event.changedTouches?.[0]?.clientY;
        if (clientX == null) return;

        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(hotspotMeshes, true);

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            const office = obj.userData.office;
            if (office) showInfoPanel(office);
        }
    }

    canvas.addEventListener('click', onPointer);
    canvas.addEventListener('touchend', onPointer, { passive: true });

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
        if (labelRenderer) labelRenderer.render(scene, camera);
    }
    animate();

    function onResize() {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        if (labelRenderer) labelRenderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);
}

function createHotspots() {
    hotspotMeshes = [];
    // Limpiar anteriores
    while (hotspotGroup.children.length) {
        hotspotGroup.remove(hotspotGroup.children[0]);
    }

    OFFICES.forEach(office => {
        // Esfera clickeable
        const geo = new THREE.SphereGeometry(0.35, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.85
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...office.pos);
        mesh.userData.office = office;
        mesh.userData.floor = office.floor;

        // Anillo exterior (más visible)
        const ringGeo = new THREE.RingGeometry(0.4, 0.55, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(mesh.position);
        ring.position.y -= 0.05;

        // Etiqueta CSS2D
        const div = document.createElement('div');
        div.className = 'hotspot-label';
        div.textContent = office.name;
        div.style.cssText = `
            color: #00d4ff;
            font-size: 11px;
            font-weight: 500;
            font-family: Inter, sans-serif;
            background: rgba(10,12,16,0.85);
            padding: 3px 8px;
            border-radius: 4px;
            border: 1px solid rgba(0,212,255,0.3);
            white-space: nowrap;
            pointer-events: none;
            transform: translateY(-18px);
        `;
        const label = new CSS2DObject(div);
        label.position.set(...office.pos);
        label.position.y += 0.6;

        hotspotGroup.add(mesh);
        hotspotGroup.add(ring);
        hotspotGroup.add(label);
        hotspotMeshes.push(mesh);
    });
}

function updateHotspotsVisibility(floor) {
    hotspotGroup.children.forEach(child => {
        if (child.userData && child.userData.floor !== undefined) {
            child.visible = child.userData.floor === floor;
        } else if (child.isCSS2DObject) {
            // Las etiquetas se manejan por el mesh asociado; ocultamos por piso
            const office = OFFICES.find(o =>
                Math.abs(o.pos[0] - child.position.x) < 0.1 &&
                Math.abs(o.pos[2] - child.position.z) < 0.1
            );
            child.visible = office ? office.floor === floor : false;
        } else {
            // Anillos: mismos criterios
            const office = OFFICES.find(o =>
                Math.abs(o.pos[0] - child.position.x) < 0.1 &&
                Math.abs(o.pos[2] - child.position.z) < 0.1
            );
            if (office) child.visible = office.floor === floor;
        }
    });

    // Más simple y fiable:
    hotspotMeshes.forEach(mesh => {
        const show = mesh.userData.floor === floor;
        mesh.visible = show;
    });
}