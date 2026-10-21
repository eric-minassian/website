import {
  Mesh,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";

export type Rgb = readonly [number, number, number];

export interface MoonFrame {
  /** Unit vector towards the sun in view space. */
  sun: readonly [number, number, number];
  /** Libration in radians around the x and y axes. */
  tilt: readonly [number, number];
  /** Dot opacity, 0 to 1. */
  opacity: number;
}

export interface MoonScene {
  resize: (width: number, height: number) => void;
  setColor: (rgb: Rgb) => void;
  render: (frame: MoonFrame) => void;
}

// The canvas is slightly larger than the moon so libration never clips its edge.
const FRAME = 1.05;
// Halftone cell size in CSS pixels.
const CELL = 6.5;

// Lit albedo in greyscale. The moon's dusty surface follows the Lommel-Seeliger law rather than
// Lambert's, which is why a full moon looks evenly bright right out to its edge.
const MOON_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = mat3(modelMatrix) * normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const MOON_FRAGMENT = /* glsl */ `
  uniform sampler2D uAlbedo;
  uniform vec3 uSun;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vNormal);
    float incidence = max(dot(n, uSun), 0.0);
    float emission = max(n.z, 0.0);
    float light = 2.0 * incidence / max(incidence + emission, 1e-3);
    // NASA's map spans roughly 0.36-1.0; stretch it so the maria read through the halftone.
    float albedo = mix(0.22, 1.0, smoothstep(0.42, 0.92, texture2D(uAlbedo, vUv).r));
    // A little earthshine keeps the unlit side faintly visible.
    gl_FragColor = vec4(vec3(albedo * min(0.95 * light + 0.045, 1.0)), 1.0);
  }
`;

// Round dots on a 45° screen whose area follows the brightness underneath.
const SCREEN_FRAGMENT = /* glsl */ `
  uniform sampler2D uScene;
  uniform vec2 uResolution;
  uniform float uCell;
  uniform float uSmoothing;
  uniform vec3 uColor;
  uniform float uOpacity;
  const float S = 0.70710678;
  void main() {
    vec2 f = gl_FragCoord.xy;
    vec2 p = vec2(S * (f.x + f.y), S * (f.y - f.x));
    vec2 center = (floor(p / uCell) + 0.5) * uCell;
    vec2 samplePoint = vec2(S * (center.x - center.y), S * (center.x + center.y));
    float lum = texture2D(uScene, samplePoint / uResolution).r;
    float radius = 0.46 * uCell * sqrt(lum);
    float coverage = 1.0 - smoothstep(radius - uSmoothing, radius + uSmoothing, length(p - center));
    float alpha = coverage * smoothstep(0.02, 0.05, lum) * mix(0.45, 1.0, smoothstep(0.02, 0.12, lum));
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(uColor, alpha * uOpacity);
  }
`;

export const createMoonScene = async (
  canvas: HTMLCanvasElement,
  textureUrl: string,
): Promise<MoonScene> => {
  const albedo = await new TextureLoader().loadAsync(textureUrl);
  albedo.colorSpace = NoColorSpace;

  const renderer = new WebGLRenderer({ canvas, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const sun = new Vector3(0, 0, 1);
  const moon = new Mesh(
    new SphereGeometry(1, 96, 64),
    new ShaderMaterial({
      uniforms: { uAlbedo: { value: albedo }, uSun: { value: sun } },
      vertexShader: MOON_VERTEX,
      fragmentShader: MOON_FRAGMENT,
    }),
  );
  const scene = new Scene().add(moon);
  const camera = new OrthographicCamera(-FRAME, FRAME, FRAME, -FRAME, 0.1, 10);
  camera.position.z = 5;

  const target = new WebGLRenderTarget(1, 1);
  const screen = new ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uScene: { value: target.texture },
      uResolution: { value: new Vector2(1, 1) },
      uCell: { value: CELL },
      uSmoothing: { value: 0.7 },
      uColor: { value: new Vector3(0.5, 0.5, 0.5) },
      uOpacity: { value: 1 },
    },
    vertexShader: "void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: SCREEN_FRAGMENT,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), screen);
  quad.frustumCulled = false;
  const post = new Scene().add(quad);

  return {
    resize: (width, height) => {
      const ratio = renderer.getPixelRatio();
      renderer.setSize(width, height, false);
      // The halftone only samples one point per cell, so half resolution is plenty.
      target.setSize(Math.ceil((width * ratio) / 2), Math.ceil((height * ratio) / 2));
      screen.uniforms.uResolution.value.set(width * ratio, height * ratio);
      screen.uniforms.uCell.value = CELL * ratio;
      screen.uniforms.uSmoothing.value = 0.7 * ratio;
    },
    setColor: ([r, g, b]) => {
      screen.uniforms.uColor.value.set(r, g, b);
    },
    render: ({ sun: [x, y, z], tilt: [tiltX, tiltY], opacity }) => {
      sun.set(x, y, z);
      // The map's longitude 0 sits on +x; turn it to face the viewer, as the real near side does.
      moon.rotation.set(tiltX, -Math.PI / 2 + tiltY, 0);
      screen.uniforms.uOpacity.value = opacity;

      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 1);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 0);
      renderer.render(post, camera);
    },
  };
};
