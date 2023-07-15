<script setup>
import {
  PoseLandmarker,
  HandLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { onMounted, ref, defineProps } from "vue";
import * as tf from "@tensorflow/tfjs";
import train from "../models/classification";
import { MODEL_INPUT_LENGTH, TRAIN_FRAMES_NUMBERS } from "../assets/global";

const { poseLandmarker, handLandmarker } = defineProps({
  poseLandmarker: Object,
  handLandmarker: Object,
});

const data = ref([]);
const predict = ref(null);

let video;
let poseCanvasElement;
let handCanvasElement;
let poseCanvasCtx;
let handCanvasCtx;
let poseDrawingUtils;
let handDrawingUtils;
let model;

onMounted(async () => {
  video = document.getElementById("webcam");
  poseCanvasElement = document.getElementById("pose_canvas");
  handCanvasElement = document.getElementById("hand_canvas");
  poseCanvasCtx = poseCanvasElement.getContext("2d");
  handCanvasCtx = handCanvasElement.getContext("2d");
  poseDrawingUtils = new DrawingUtils(poseCanvasCtx);
  handDrawingUtils = new DrawingUtils(handCanvasCtx);

  const constraints = {
    video: true,
  };

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
  });

  model = await train();
  predictWebcam();
});

let lastVideoTime = -1;
let result = undefined;
let handResults = undefined;
let poseResults = undefined;
let counter = 0;

const predictWebcam = async () => {
  if (data.value.length === MODEL_INPUT_LENGTH) {
    const INPUT_TENSOR = tf.tensor2d([data.value]);
    let res = await model.predict(INPUT_TENSOR).squeeze().argMax();
    predict.value = await res.array();
    data.value = [];
    counter = 0;
    await new Promise((r) => setTimeout(r, 1000));
  }

  handCanvasElement.width = video.videoWidth;
  handCanvasElement.height = video.videoHeight;

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    handResults = handLandmarker.detectForVideo(video, startTimeMs);
    poseResults = poseLandmarker.detectForVideo(video, startTimeMs);
  }

  handCanvasCtx.save();
  handCanvasCtx.clearRect(
    0,
    0,
    handCanvasElement.width,
    handCanvasElement.height
  );
  poseCanvasCtx.save();
  poseCanvasCtx.clearRect(
    0,
    0,
    poseCanvasElement.width,
    poseCanvasElement.height
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

    data.value.push(...flatten);

    counter++;
  }

  handCanvasCtx.restore();

  window.requestAnimationFrame(predictWebcam);
};
</script>

<template>
  <div style="position: relative; width: 100%">
    <video
      id="webcam"
      class="viewPort"
      style="position: absolute"
      autoplay
      playsinline
    ></video>
    <canvas
      class="output_canvas viewPort"
      id="pose_canvas"
      style="position: absolute; left: 0px; top: 0px z-index: 2;"
    ></canvas>
    <canvas
      class="output_canvas viewPort"
      id="hand_canvas"
      style="position: absolute; left: 0px; top: 0px z-index: 1;"
    ></canvas>
  </div>
</template>

<style scoped>
.viewPort {
  width: 100%;
  height: 95vh;
  margin: 0 auto;
  object-fit: cover;
}
</style>
