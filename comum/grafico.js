// Gráficos partilhados pelos jogos 3D (Arena e Rally): céu atmosférico,
// reflexos do ambiente, relevo das texturas e pós-processamento.
import * as THREE from '../arena/three.module.min.js';
import { Sky } from '../vendor/three/objects/Sky.js';
import { EffectComposer } from '../vendor/three/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three/postprocessing/OutputPass.js';
import { RoomEnvironment } from '../vendor/three/environments/RoomEnvironment.js';

// Qualidade: 'alta' (tudo), 'media' (sem pós-processamento), 'baixa' (menos sombras)
export function qualidade() {
  const q = localStorage.getItem('graficos');
  if (q === 'alta' || q === 'media' || q === 'baixa') return q;
  const toque = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
  if (toque) return 'baixa';
  return (navigator.hardwareConcurrency || 4) >= 6 ? 'alta' : 'media';
}
export function definirQualidade(q) { localStorage.setItem('graficos', q); }
export const NOMES_QUALIDADE = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

// Mapa de normais a partir do desenho de uma textura (o claro é alto)
export function normalDe(tex, forca = 2.5) {
  const src = tex.image;
  const w = src.width, h = src.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  const out = g.createImageData(w, h), o = out.data;
  const L = (x, y) => lum[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1)) - (L(x - 1, y - 1) + 2 * L(x - 1, y) + L(x - 1, y + 1));
    const dy = (L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1)) - (L(x - 1, y - 1) + 2 * L(x, y - 1) + L(x + 1, y - 1));
    let nx = -dx * forca, ny = -dy * forca, nz = 1;
    const n = Math.hypot(nx, ny, nz); nx /= n; ny /= n; nz /= n;
    const k = (y * w + x) * 4;
    o[k] = (nx * 0.5 + 0.5) * 255; o[k + 1] = (ny * 0.5 + 0.5) * 255; o[k + 2] = (nz * 0.5 + 0.5) * 255; o[k + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.repeat.copy(tex.repeat); t.anisotropy = tex.anisotropy;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// Céu com dispersão atmosférica + reflexos do céu em tudo (scene.environment)
// o: { elevacao (graus), azimute (graus), turbidez, rayleigh, mie, tamanho }
export function ceuReal(renderer, cena, o) {
  const sky = new Sky();
  sky.scale.setScalar(o.tamanho || 2500);
  const u = sky.material.uniforms;
  u.turbidity.value = o.turbidez ?? 4;
  u.rayleigh.value = o.rayleigh ?? 1.5;
  u.mieCoefficient.value = o.mie ?? 0.005;
  u.mieDirectionalG.value = 0.8;
  const sol = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - (o.elevacao ?? 20)), THREE.MathUtils.degToRad(o.azimute ?? 180));
  u.sunPosition.value.copy(sol);
  cena.add(sky);
  // ambiente para os reflexos: o mesmo céu, desfocado
  const pm = new THREE.PMREMGenerator(renderer);
  const cenaCeu = new THREE.Scene();
  const sky2 = new Sky(); sky2.scale.setScalar(1000); Object.assign(sky2.material.uniforms, THREE.UniformsUtils.clone(u)); sky2.material.uniforms.sunPosition.value.copy(sol);
  cenaCeu.add(sky2);
  const env = pm.fromScene(cenaCeu, 0.04).texture;
  pm.dispose();
  cena.environment = env;
  cena.environmentIntensity = o.intensidadeAmbiente ?? 0.8;
  return { sky, sol };
}

// Reflexos genéricos de interior (casino) ou de noite
export function ambienteInterior(renderer, cena, intensidade = 0.35) {
  const pm = new THREE.PMREMGenerator(renderer);
  cena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environmentIntensity = intensidade;
  pm.dispose();
}
// Reflexos a partir de uma cena qualquer (ex.: o céu em gradiente de Lisboa)
export function ambienteDe(renderer, cena, cenaFonte, intensidade = 0.6) {
  const pm = new THREE.PMREMGenerator(renderer);
  cena.environment = pm.fromScene(cenaFonte, 0.04).texture;
  cena.environmentIntensity = intensidade;
  pm.dispose();
}

// Pós-processamento: anti-serrilhado (MSAA) + brilho suave nas luzes.
// passos: lista de [cena, camera] desenhadas por ordem (a 2.ª por cima, ex.: a arma)
export function criarComposer(renderer, passos, o = {}) {
  const tam = renderer.getSize(new THREE.Vector2());
  const pr = renderer.getPixelRatio();
  const rt = new THREE.WebGLRenderTarget(tam.x * pr, tam.y * pr, { type: THREE.HalfFloatType, samples: 4 });
  const comp = new EffectComposer(renderer, rt);
  passos.forEach(([cena, cam], i) => {
    const p = new RenderPass(cena, cam);
    if (i > 0) { p.clear = false; p.clearDepth = true; }
    comp.addPass(p);
  });
  const bloom = new UnrealBloomPass(new THREE.Vector2(tam.x, tam.y), o.forca ?? 0.35, o.raio ?? 0.5, o.limiar ?? 0.85);
  comp.addPass(bloom);
  comp.addPass(new OutputPass());
  return {
    comp, bloom,
    render(dt) { comp.render(dt); },
    setSize(w, h) { comp.setPixelRatio(renderer.getPixelRatio()); comp.setSize(w, h); },
    dispose() { rt.dispose(); comp.dispose && comp.dispose(); },
  };
}
