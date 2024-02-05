import * as ZapparVideoRecorder from "@zappar/video-recorder";
import WebGlSnapshot from "@zappar/webgl-snapshot";
import * as THREE from "three";
import * as ZapparThree from "@zappar/zappar-threejs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./index.css";

const helmet = new URL("../assets/z_helmet.glb", import.meta.url).href;

if (ZapparThree.browserIncompatible()) {
  ZapparThree.browserIncompatibleUI();

  throw new Error("Unsupported browser");
}

const manager = new ZapparThree.LoadingManager();

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
const scene = new THREE.Scene();
document.body.appendChild(renderer.domElement);

renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const camera = new ZapparThree.Camera();

ZapparThree.permissionRequestUI().then((granted) => {
  if (granted) camera.start(true); // true parameter for user facing camera
  else ZapparThree.permissionDeniedUI();
});

ZapparThree.glContextSet(renderer.getContext());

scene.background = camera.backgroundTexture;
const faceTracker = new ZapparThree.FaceTrackerLoader(manager).load();
const faceTrackerGroup = new ZapparThree.FaceAnchorGroup(camera, faceTracker);
scene.add(faceTrackerGroup);

faceTrackerGroup.visible = false;

const mask = new ZapparThree.HeadMaskMeshLoader().load();
faceTrackerGroup.add(mask);

const gltfLoader = new GLTFLoader(manager);
gltfLoader.load(
  helmet,
  (gltf) => {
    gltf.scene.position.set(0.3, -1.3, 0);
    gltf.scene.scale.set(1.1, 1.1, 1.1);
    faceTrackerGroup.add(gltf.scene);
  },
  undefined,
  () => {
    console.log("An error ocurred loading the GLTF model");
  }
);

const directionalLight = new THREE.DirectionalLight("white", 0.8);
directionalLight.position.set(0, 5, 0);
directionalLight.lookAt(0, 0, 0);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight("white", 0.4);
scene.add(ambientLight);

faceTrackerGroup.faceTracker.onVisible.bind(() => {
  faceTrackerGroup.visible = true;
});
faceTrackerGroup.faceTracker.onNotVisible.bind(() => {
  faceTrackerGroup.visible = false;
});

const placeButton =
  document.getElementById("instructions") || document.createElement("div");

async function initRecorder() {
  const canvas =
    document.querySelector("canvas") || document.createElement("canvas");

  const recorder = await ZapparVideoRecorder.createCanvasVideoRecorder(canvas);
  let recording = false;

  recorder.onStart.bind(() => {
    recording = true;
    placeButton.innerText = "TAP TO STOP RECORDING";
  });

  recorder.onComplete.bind(async (result) => {
    placeButton.innerText = "TAP TO START RECORDING";

    WebGlSnapshot({
      data: await result.asDataURL(),
    });

    recording = false;
  });

  placeButton.addEventListener("click", async () => {
    if (recording) {
      recorder.stop();
    } else {
      recorder.start();
    }
  });
}

initRecorder();

function render(): void {
  camera.updateFrame(renderer);

  mask.updateFromFaceAnchorGroup(faceTrackerGroup);

  renderer.render(scene, camera);

  requestAnimationFrame(render);
}

render();
