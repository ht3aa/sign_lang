<script setup>
import { DrawingUtils } from "@mediapipe/tasks-vision";
import { onMounted, ref } from "vue";
import {
  TRAIN_FRAMES_NUMBERS,
  zerosHandLandmarks,
  TRAIN_FRAMES_SETS,
} from "../assets/global";

const { poseLandmarker, handLandmarker, constraints } = defineProps({
  poseLandmarker: Object,
  handLandmarker: Object,
  constraints: Object,
});

const words = [
  "BITE",
  "BLIND",
  "BONES",
  "COUGH",
  "CRAMP",
  "CRY",
  "DIARRHEA",
  "DIZZY",
  "DROP",
  "ENERGY",
  "EXAMINE",
  "EXPLODE",
  "EYES",
  "FEVER",
  "FORGET",
  "GAIN WEIGHT",
  "GIVE BLOOD",
  "HEADACHE",
  "INFORM",
  "ITCHY",
  "LOSE WEIGHT",
  "LOUD",
  "MEDICINE",
  "OVERLOOK",
  "PREVENT",
  "RASH",
  "RECOVER",
  "SMOKING",
  "SPINNING",
  "SPIT",
  "SURGERY",
  "SWOLLEN",
  "THROW UP",
  "UPSET STOMACH",
];
console.log(words.length);
const data = ref([]);
const framesSet = ref(0);
const currentRecordingSignIndex = ref(0);
const predict = ref(null);
const video = ref(undefined);
const handCanvasElement = ref(undefined);

let handCanvasCtx;
let handDrawingUtils;
let model;

onMounted(async () => {
  handCanvasCtx = handCanvasElement.value.getContext("2d");

  handDrawingUtils = new DrawingUtils(handCanvasCtx);

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.value.srcObject = stream;
  });
});

let lastVideoTime = -1;
let result = undefined;
let handResults = undefined;
let handsResults = undefined;
let counter = 0;

const predictWebcam = async () => {
  if (currentRecordingSignIndex.value === words.length) {
    alert("done collecting data");
    return;
  }
  if (counter >= TRAIN_FRAMES_NUMBERS) {
    framesSet.value++;
    counter = 0;
    if (framesSet.value === TRAIN_FRAMES_SETS) {
      alert(
        `done collecting data for ${words[currentRecordingSignIndex.value]}`
      );
      currentRecordingSignIndex.value++;
      framesSet.value = 0;
    }
    return;
  }

  handCanvasElement.value.width = video.value.videoWidth;
  handCanvasElement.value.height = video.value.videoHeight;

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.value.currentTime) {
    lastVideoTime = video.value.currentTime;
    handResults = handLandmarker.detectForVideo(video.value, startTimeMs);
  }

  handCanvasCtx.save();
  handCanvasCtx.clearRect(
    0,
    0,
    handCanvasElement.value.width,
    handCanvasElement.value.height
  );

  if (handResults.landmarks.length > 0) {
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

    flatten.push(currentRecordingSignIndex.value);

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
    <div style="position: relative; width: 700px; margin: 0 auto">
      <video ref="video" class="viewPort" autoplay playsinline></video>
      <canvas
        class="output_canvas viewPort"
        ref="handCanvasElement"
        style="position: absolute; left: 0; top: 0; z-index: 4"
      ></canvas>
    </div>
    <div style="position: absolute; left: 20px; top: 20px">
      <h4>
        You are recording for sign:
        <span style="color: red">{{ words[currentRecordingSignIndex] }}</span>
      </h4>
      <h4>number of frames sets: {{ framesSet }} / {{ TRAIN_FRAMES_SETS }}</h4>
    </div>
    <div></div>

    <div class="toolBar">
      <button @click="predictWebcam">start predict</button>
      <button @click="saveFile">Save data</button>
    </div>
  </div>
</template>

<style scoped></style>
