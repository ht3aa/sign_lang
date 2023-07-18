<script setup>
import {
  PoseLandmarker,
  HandLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { onMounted, ref } from "vue";
import * as tf from "@tensorflow/tfjs";
import train from "../models/classification";
import { MODEL_HANDS_INPUT_LENGTH, zerosHandLandmarks } from "../assets/global";

const { poseLandmarker, handLandmarker, handsLandmarker, constraints } =
  defineProps({
    poseLandmarker: Object,
    handLandmarker: Object,
    handsLandmarker: Object,
    constraints: Object,
  });

// for first and last frames model
const words = [
  "my",
  "name hassan",
  "hello",
  "me",
  "deaf",
  "need",
  "nice",
  "please",
  "where",
  "help",
  "you",
  "can",
];
const data = ref([]);
const predict = ref("");
const text = ref("");
const start = ref(false);
const video = ref(undefined);
const poseCanvasElement = ref(undefined);
const handCanvasElement = ref(undefined);

let poseCanvasCtx;
let handCanvasCtx;
let poseDrawingUtils;
let handDrawingUtils;
let model;
let handsModel;

onMounted(async () => {
  poseCanvasCtx = poseCanvasElement.value.getContext("2d");
  handCanvasCtx = handCanvasElement.value.getContext("2d");
  poseDrawingUtils = new DrawingUtils(poseCanvasCtx);
  handDrawingUtils = new DrawingUtils(handCanvasCtx);

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.value.srcObject = stream;
  });

  model = await train();
});

let lastVideoTime = -1;
let result = undefined;
let handResults = undefined;
let poseResults = undefined;
let counter = 0;

const predictWebcam = async () => {
  if (start.value) {
    if (data.value.length === MODEL_HANDS_INPUT_LENGTH) {
      let INPUT_TENSOR = tf.tensor2d([data.value]);
      let res = await model.predict(INPUT_TENSOR).squeeze().array();
      console.log(res);
      let max = Math.max(...res);
      console.log(max);
      if (max >= 0.7) {
        let index = res.indexOf(max);
        predict.value = words[index];
        text.value += words[index] + " ";
      }
      data.value = [];
      counter = 0;
      start.value = false;
      await new Promise((r) => setTimeout(r, 1000));
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

      data.value.push(...flatten);

      counter++;
    }
  } else {
    await new Promise((r) => setTimeout(r, 1000));
    data.value = [];
    counter = 0;
    start.value = true;
  }

  handCanvasCtx.restore();

  window.requestAnimationFrame(predictWebcam);
};

const reset = () => {
  text.value = "";
};
</script>

<template>
  <div>
    <div class="viewPort" style="position: relative; width: 100%">
      <span
        style="
          position: absolute;
          z-index: 4;
          left: 10px;
          top: 10px;
          color: red;
          font-size: 20px;
        "
        >predict: {{ predict }}</span
      >
      <span
        style="
          position: absolute;
          z-index: 4;
          right: 10px;
          top: 10px;
          color: rgb(51, 255, 0);
          font-size: 20px;
        "
        >start: {{ start }}</span
      >
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
    </div>
    <div>
      {{ text }}
    </div>
    <div>
      <button @click="reset">reset</button>
    </div>
  </div>
</template>

<style scoped></style>
