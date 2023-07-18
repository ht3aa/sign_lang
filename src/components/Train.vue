<script setup>
import { DrawingUtils } from "@mediapipe/tasks-vision";
import { onMounted, ref } from "vue";
import { TRAIN_FRAMES_NUMBERS, zerosHandLandmarks } from "../assets/global";

const { poseLandmarker, handLandmarker, constraints } = defineProps({
  poseLandmarker: Object,
  handLandmarker: Object,
  constraints: Object,
});

const data = ref([]);
const dataLabel = ref("");
const predict = ref(null);
const video = ref(undefined);
const poseCanvasElement = ref(undefined);
const handCanvasElement = ref(undefined);

let poseCanvasCtx;
let handCanvasCtx;
let poseDrawingUtils;
let handDrawingUtils;
let model;

onMounted(async () => {
  poseCanvasCtx = poseCanvasElement.value.getContext("2d");
  handCanvasCtx = handCanvasElement.value.getContext("2d");
  poseDrawingUtils = new DrawingUtils(poseCanvasCtx);
  handDrawingUtils = new DrawingUtils(handCanvasCtx);

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.value.srcObject = stream;
  });
});

let lastVideoTime = -1;
let result = undefined;
let handResults = undefined;
let handsResults = undefined;
let poseResults = undefined;
let counter = 0;

const predictWebcam = async () => {
  if (counter >= TRAIN_FRAMES_NUMBERS) {
    counter = 0;
    return;
  }

  handCanvasElement.value.width = video.value.videoWidth;
  handCanvasElement.value.height = video.value.videoHeight;

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.value.currentTime) {
    lastVideoTime = video.value.currentTime;

    handResults = handLandmarker.detectForVideo(video.value, startTimeMs);

    poseResults = poseLandmarker.detectForVideo(video.value, startTimeMs);
  }

  handCanvasCtx.save();
  handCanvasCtx.clearRect(
    0,
    0,
    handCanvasElement.value.width,
    handCanvasElement.value.height
  );
  poseCanvasCtx.save();
  poseCanvasCtx.clearRect(
    0,
    0,
    poseCanvasElement.value.width,
    poseCanvasElement.value.height
  );

  if (handResults.landmarks.length > 0 && poseResults.landmarks.length > 0) {
    // poseLandmarker.landmarks[0] = poseLandmarker.landmarks[0].slice(11, 23);
    // result = [...handResults.landmarks, ...poseResults.landmarks]; // must use wide camera to get same data for each frame
    if (handResults.landmarks.length === 1) {
      result = [...handResults.landmarks, zerosHandLandmarks()];
    } else {
      result = [...handResults.landmarks];
    }
    for (const landmarks of result) {
      handDrawingUtils.drawLandmarks(landmarks, {
        color: "#FF0000",
        lineWidth: 2,
      });
    }

    let flatten = result.reduce((prev, next) => {
      let temp = next.reduce((acc, curr) => {
        acc.push(curr.x, curr.y, curr.z);
        return acc;
      }, []);

      prev.push(...temp);
      return prev;
    }, []);

    flatten.push(dataLabel.value);

    data.value.push(flatten);
    counter++;
  }

  handCanvasCtx.restore();

  window.requestAnimationFrame(predictWebcam);
};
async function saveFile() {
  const csvContent = data.value.reduce((acc, curr) => {
    acc += curr.join(",");
    acc += "\n";
    return acc;
  }, "");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "data.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
</script>

<template>
  <div>
    <div style="position: relative; width: 100%">
      <video
        ref="video"
        class="viewPort"
        style="position: absolute"
        autoplay
        playsinline
      ></video>
      <canvas
        class="output_canvas viewPort"
        ref="poseCanvasElement"
        style="position: absolute; left: 0px; top: 0px z-index: 2;"
      ></canvas>
      <canvas
        class="output_canvas viewPort"
        ref="handCanvasElement"
        style="position: absolute; left: 0px; top: 0px z-index: 1;"
      ></canvas>
    </div>
    <div class="toolBar">
      <input type="text" v-model="dataLabel" />

      <button @click="predictWebcam">start predict</button>
      <button @click="saveFile">Save data</button>
    </div>
  </div>
</template>

<style scoped></style>
