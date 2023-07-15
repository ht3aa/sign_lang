<script setup>
import {
  PoseLandmarker,
  HandLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { onMounted, ref, defineProps, toRef } from "vue";
import * as tf from "@tensorflow/tfjs";
import train from "../models/classification";
import { MODEL_INPUT_LENGTH, TRAIN_FRAMES_NUMBERS } from "../assets/global";

const { poseLandmarker, handLandmarker } = defineProps({
  poseLandmarker: Object,
  handLandmarker: Object,
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

  const constraints = {
    video: true,
  };

  console.log(video.value);

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.value.srcObject = stream;
  });

  if (video.value === "") {
    predictWebcam();
  }
});

let lastVideoTime = -1;
let result = undefined;
let handResults = undefined;
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
    result = [...handResults.landmarks];
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
  // create a new handle
  const newHandle = await window.showSaveFilePicker();

  // create a FileSystemWritableFileStream to write to
  const writableStream = await newHandle.createWritable();

  console.log(data.value);
  const res = data.value.reduce((acc, curr) => {
    console.log(curr);
    acc += curr.join(",");
    acc += "\n";
    return acc;
  }, "");

  // write our file
  await writableStream.write(res);

  // close the file and write the contents to disk.
  await writableStream.close();
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
      <button @click="predictWebcam">start predict</button>
      <button @click="saveFile">Save data</button>
    </div>
  </div>
</template>

<style scoped>
.viewPort {
  width: 100%;
  height: 95vh;
  margin: 0 auto;
  object-fit: cover;
}

.toolBar {
  width: 220px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: absolute;
  z-index: 5;
  left: 50%;
  bottom: 60px;
  transform: translateX(-50%);
}

.toolBar button {
  outline: none;
  border-radius: 10px;
  background-color: rgb(0, 89, 255);
  border: none;
  padding: 10px 15px;
  color: white;
}

.toolBar button:hover {
  cursor: pointer;
  background-color: rgb(0, 65, 187);
}
</style>
