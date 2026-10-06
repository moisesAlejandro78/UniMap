import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// =====================================================
// CONFIGURACIÓN DE TORRES
// =====================================================
const TOWERS = {
  innovacion: {
    name: 'Torre Innovación',
    floors: 13,
    model: './models/oficinas.glb',
    // Un solo modelo para todos los pisos
    getModel: () => './models/oficinas.glb',
  },
  antigua: {
    name: 'Torre Antigua',
    floors: 17,
    // Lógica especial por piso
    getModel: (floor) => {
      if (floor === 5 || floor === 9) return './models/torreAntiguaConexion.glb';
      if (floor % 2 === 0) return './models/torreAntiguaBanos.glb'; // pares
      return './models/torreAntiguaCurso.glb'; // impares
    },
  },
};

// Datos de oficinas (ejemplo – edítalos según tu campus)
const OFFICES = {
  innovacion: [
    { id: 1,  name: 'Recepción',           floor: 1,  person: 'Ana López',      dept: 'Atención',     desc: 'Punto de ingreso principal.', pos: [2, 1.2, 3] },
    { id: 2,  name: 'Sala de espera',      floor: 1,  person: '—',               dept: 'Común',        desc: 'Área de espera.', pos: [-2, 1.2, 2] },
    { id: 3,  name: 'Seguridad',           floor: 1,  person: 'Carlos Ruiz',     dept: 'Seguridad',    desc: 'Control de accesos 24/7.', pos: [0, 1.2, -3] },
    { id: 4,  name: 'Recursos Humanos',    floor: 2,  person: 'María Gómez',     dept: 'RRHH',         desc: 'Gestión de personal.', pos: [3, 4.5, 1] },
    { id: 5,  name: 'Marketing',           floor: 3,  person: 'Laura Pérez',     dept: 'Marketing',    desc: 'Branding y comunicación.', pos: [2, 8, 0] },
    { id: 6,  name: 'Desarrollo',          floor: 4,  person: 'Andrés Soto',     dept: 'TI',           desc: 'Equipo de software.', pos: [1, 11.5, -1] },
    { id: 7,  name: 'Finanzas',            floor: 5,  person: 'Roberto Díaz',    dept: 'Finanzas',     desc: 'Contabilidad y presupuestos.', pos: [0, 15, 1] },
    { id: 8,  name: 'Dirección General',   floor: 7,  person: 'Javier Mendoza',  dept: 'Dirección',    desc: 'Oficina del Director.', pos: [0, 22, 0] },
    { id: 9,  name: 'Terraza / Eventos',   floor: 13, person: '—',               dept: 'Común',        desc: 'Espacio para eventos.', pos: [0, 43, 0] },
  ],
  antigua: [
    // Puedes agregar hotspots reales más adelante
    { id: 101, name: 'Baños Piso 2',       floor: 2,  person: '—', dept: 'Servicios', desc: 'Baños del segundo piso.', pos: [0, 3.5, 0] },
    { id: 102, name: 'Aula 301',           floor: 3,  person: '—', dept: 'Académico', desc: 'Aula de clases.', pos: [1, 7, 1] },
    { id: 103, name: 'Conexión Piso 5',    floor: 5,  person: '—', dept: 'Circulación', desc: 'Pasillo de conexión.', pos: [0, 14, 0] },
    { id: 104, name: 'Conexión Piso 9',    floor: 9,  person: '—', dept: 'Circulación', desc: 'Pasillo de conexión.', pos: [0, 28, 0] },
  ],
};

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
const authScreen   = document.getElementById('auth-screen');
const towerScreen  = document.getElementById('tower-screen');
const app          = document.getElementById('app');
const authOptions  = document.getElementById('auth-options');
const loginForm    = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const userInfo     = document.getElementById('user-info');
const towerBadge   = document.getElementById('tower-badge');
const floorList    = document.getElementById('floor-list');
const currentFloorLabel = document.getElementById('current-floor-label');
const loadingEl    = document.getElementById('loading');
const sidebar      = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const searchInput  = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const btnClearSearch = document.getElementById('btn-clear-search');
const infoPanel    = document.getElementById('info-panel');

// Estado global
let currentTower = null;   // 'innovacion' | 'antigua'
let currentFloor = 1;
let floorButtons = [];
let currentOffices = [];
let selectedOffice = null;

// Three.js
let scene, camera, renderer, controls, labelRenderer;
let hotspotGroup, raycaster, mouse, hotspotMeshes = [];
let currentModel = null;
let modelLoader = null;

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

function enterTowerSelect(user) {
  authScreen.classList.add('hidden');
  towerScreen.classList.remove('hidden');
  app.classList.add('hidden');
  userInfo.textContent = user.type === 'guest' ? 'Invitado' : (user.name || user.email);
}

function enterApp(towerKey) {
  currentTower = towerKey;
  towerScreen.classList.add('hidden');
  app.classList.remove('hidden');

  towerBadge.textContent = TOWERS[towerKey].name;
  currentOffices = OFFICES[towerKey] || [];

  generateFloorButtons();
  setupSearch();
  setupMobileMenu();
  setupInfoPanel();

  // Iniciar o reiniciar visor
  if (!scene) {
    initViewer();
  } else {
    loadTowerModel(1);
  }
}

document.getElementById('btn-login').addEventListener('click', showLogin);
document.getElementById('btn-register').addEventListener('click', showRegister);
document.getElementById('btn-guest').addEventListener('click', () => {
  const guest = { type: 'guest', name: 'Invitado' };
  setSession(guest);
  enterTowerSelect(guest);
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
  enterTowerSelect({ type: 'user', email: user.email, name: user.name });
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
  enterTowerSelect({ type: 'user', email, name });
});

document.getElementById('btn-logout').addEventListener('click', () => {
  clearSession();
  location.reload();
});
document.getElementById('btn-logout-tower').addEventListener('click', () => {
  clearSession();
  location.reload();
});

document.getElementById('btn-innovacion').addEventListener('click', () => enterApp('innovacion'));
document.getElementById('btn-antigua').addEventListener('click', () => enterApp('antigua'));
document.getElementById('btn-change-tower').addEventListener('click', () => {
  app.classList.add('hidden');
  towerScreen.classList.remove('hidden');
  // Limpiar modelo actual
  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }
  clearHotspots();
});

// Sesión existente
const existingSession = getSession();
if (existingSession) enterTowerSelect(existingSession);

// =====================================================
// MENÚ MÓVIL
// =====================================================
function setupMobileMenu() {
  const btnMenu = document.getElementById('btn-menu');
  const btnClose = document.getElementById('btn-close-sidebar');

  function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    sidebarOverlay.classList.remove('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = '';
  }

  btnMenu.onclick = openSidebar;
  btnClose.onclick = closeSidebar;
  sidebarOverlay.onclick = closeSidebar;

  floorList.addEventListener('click', (e) => {
    if (window.innerWidth < 768 && e.target.closest('.floor-btn')) closeSidebar();
  });
}

// =====================================================
// PISOS
// =====================================================
function generateFloorButtons() {
  const total = TOWERS[currentTower].floors;
  floorList.innerHTML = '';
  floorButtons = [];

  for (let i = 1; i <= total; i++) {
    const count = currentOffices.filter(o => o.floor === i).length;
    const btn = document.createElement('button');
    btn.className = `floor-btn flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-left transition min-h-[44px]
      ${i === 1 ? 'bg-accent/10 border border-accent/20 text-accent' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100 border border-transparent'}`;
    btn.innerHTML = `
      <span class="w-7 h-7 flex items-center justify-center rounded-md text-xs font-semibold
        ${i === 1 ? 'bg-accent text-dark-950' : 'bg-white/5'}">${i}</span>
      <span>Piso ${i}</span>
      ${count ? `<span class="ml-auto text-[11px] opacity-60">${count}</span>` : ''}
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
    const active = idx + 1 === floor;
    btn.className = `floor-btn flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-left transition min-h-[44px]
      ${active ? 'bg-accent/10 border border-accent/20 text-accent' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100 border border-transparent'}`;
    const num = btn.querySelector('span');
    if (num) {
      num.className = `w-7 h-7 flex items-center justify-center rounded-md text-xs font-semibold ${active ? 'bg-accent text-dark-950' : 'bg-white/5'}`;
    }
  });

  // Cargar el modelo correspondiente al piso (importante en Torre Antigua)
  loadTowerModel(floor);

  updateHotspotsVisibility(floor);

  if (camera && controls) {
    const targetY = (floor - 1) * FLOOR_HEIGHT + 1.5;
    camera.position.set(10, targetY + 5, 12);
    controls.target.set(0, targetY, 0);
    controls.update();
  }

  if (officeId) {
    const office = currentOffices.find(o => o.id === officeId);
    if (office) showInfoPanel(office);
  }
}

// =====================================================
// BÚSQUEDA
// =====================================================
function setupSearch() {
  searchInput.oninput = () => {
    const q = searchInput.value.trim().toLowerCase();
    btnClearSearch.classList.toggle('hidden', !q);

    if (!q) {
      searchResults.classList.add('hidden');
      searchResults.innerHTML = '';
      return;
    }

    const results = currentOffices.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.person.toLowerCase().includes(q) ||
      o.dept.toLowerCase().includes(q) ||
      o.desc.toLowerCase().includes(q)
    );

    searchResults.classList.remove('hidden');

    if (results.length === 0) {
      searchResults.innerHTML = `<div class="py-4 text-center text-sm text-slate-500">No se encontraron resultados</div>`;
      return;
    }

    searchResults.innerHTML = results.map(o => `
      <div class="search-item p-3 rounded-lg cursor-pointer hover:bg-white/5 transition" data-id="${o.id}">
        <div class="text-sm font-medium">${o.name}</div>
        <div class="text-[11px] text-slate-500">Piso ${o.floor} · ${o.dept}${o.person !== '—' ? ' · ' + o.person : ''}</div>
      </div>
    `).join('');

    searchResults.querySelectorAll('.search-item').forEach(el => {
      el.onclick = () => {
        const id = parseInt(el.dataset.id, 10);
        const office = currentOffices.find(o => o.id === id);
        if (office) {
          selectFloor(office.floor, office.id);
          searchInput.value = '';
          btnClearSearch.classList.add('hidden');
          searchResults.classList.add('hidden');
          if (window.innerWidth < 768) {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('opacity-0', 'pointer-events-none');
            document.body.style.overflow = '';
          }
        }
      };
    });
  };

  btnClearSearch.onclick = () => {
    searchInput.value = '';
    btnClearSearch.classList.add('hidden');
    searchResults.classList.add('hidden');
    searchResults.innerHTML = '';
    searchInput.focus();
  };
}

// =====================================================
// INFO PANEL
// =====================================================
function setupInfoPanel() {
  document.getElementById('btn-close-info').onclick = hideInfoPanel;
  document.getElementById('btn-focus-office').onclick = () => {
    if (selectedOffice && camera && controls) {
      const [x, y, z] = selectedOffice.pos;
      camera.position.set(x + 6, y + 4, z + 8);
      controls.target.set(x, y, z);
      controls.update();
      hideInfoPanel();
    }
  };
}

function showInfoPanel(office) {
  selectedOffice = office;
  document.getElementById('info-floor').textContent = `Piso ${office.floor}`;
  document.getElementById('info-title').textContent = office.name;
  document.getElementById('info-desc').textContent = office.desc;

  const meta = document.getElementById('info-meta');
  meta.innerHTML = '';
  if (office.dept) meta.innerHTML += `<span class="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-md">${office.dept}</span>`;
  if (office.person && office.person !== '—') meta.innerHTML += `<span class="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-md">${office.person}</span>`;

  infoPanel.classList.remove('hidden');
  requestAnimationFrame(() => {
    infoPanel.classList.remove('translate-y-full', 'md:translate-x-[120%]');
  });
}

function hideInfoPanel() {
  infoPanel.classList.add('translate-y-full', 'md:translate-x-[120%]');
  setTimeout(() => infoPanel.classList.add('hidden'), 300);
  selectedOffice = null;
}

// =====================================================
// VISOR 3D
// =====================================================
function initViewer() {
  const canvas = document.getElementById('viewer');
  const container = canvas.parentElement;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c10);

  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(10, 8, 14);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 4;
  controls.maxDistance = 120;
  controls.target.set(0, 4, 0);
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

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

  hotspotGroup = new THREE.Group();
  scene.add(hotspotGroup);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  modelLoader = new GLTFLoader();

  // Click / touch
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
      const office = intersects[0].object.userData.office;
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

  window.addEventListener('resize', () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (labelRenderer) labelRenderer.setSize(w, h);
  });

  // Cargar primer piso
  loadTowerModel(1);
}

function loadTowerModel(floor) {
  if (!modelLoader) return;

  loadingEl.classList.remove('hidden');
  loadingEl.querySelector('span').textContent = 'Cargando modelo 3D...';

  const modelPath = TOWERS[currentTower].getModel(floor);

  // Eliminar modelo anterior
  if (currentModel) {
    scene.remove(currentModel);
    currentModel.traverse(c => {
      if (c.isMesh) {
        c.geometry?.dispose();
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material?.dispose();
      }
    });
    currentModel = null;
  }

  modelLoader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);
      currentModel = model;

      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Centrar y escalar
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
      updateHotspotsVisibility(floor);
      loadingEl.classList.add('hidden');
    },
    (xhr) => {
      if (xhr.total) {
        loadingEl.querySelector('span').textContent =
          `Cargando... ${((xhr.loaded / xhr.total) * 100).toFixed(0)}%`;
      }
    },
    (err) => {
      console.error('Error cargando modelo:', modelPath, err);
      loadingEl.querySelector('span').textContent =
        `No se pudo cargar: ${modelPath.split('/').pop()}`;
      createHotspots();
      updateHotspotsVisibility(floor);
      setTimeout(() => loadingEl.classList.add('hidden'), 2500);
    }
  );
}

function clearHotspots() {
  while (hotspotGroup && hotspotGroup.children.length) {
    hotspotGroup.remove(hotspotGroup.children[0]);
  }
  hotspotMeshes = [];
}

function createHotspots() {
  clearHotspots();

  currentOffices.forEach(office => {
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
    ring.userData.floor = office.floor;

    const div = document.createElement('div');
    div.className = 'hotspot-label';
    div.textContent = office.name;
    const label = new CSS2DObject(div);
    label.position.set(...office.pos);
    label.position.y += 0.6;
    label.userData = { floor: office.floor };

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
    }
  });
  hotspotMeshes.forEach(mesh => {
    mesh.visible = mesh.userData.floor === floor;
  });
}