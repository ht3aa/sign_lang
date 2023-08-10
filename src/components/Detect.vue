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
import { HfInference } from "@huggingface/inference";

const { poseLandmarker, handLandmarker, constraints } = defineProps({
  poseLandmarker: Object,
  handLandmarker: Object,
  handsLandmarker: Object,
  constraints: Object,
});

// for first and last frames model
// const words = [
//   "my",
//   "name hassan",
//   "hello",
//   "me",
//   "deaf",
//   "need",
//   "nice",
//   "please",
//   "where",
//   "help",
//   "you",
//   "can",
// ];
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
const data = ref([]);
const predict = ref("");
const text = ref("");
const start = ref(false);
const video = ref(undefined);
const poseCanvasElement = ref(undefined);
const handCanvasElement = ref(undefined);
const signVideosSrcs = {
  REST: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/bed-rest.mp4`,
  YOU: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/you.mp4`,
  MUST: "https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/must.mp4",
  HAVE: "https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/have.mp4",
  WHAT: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/what.mp4`,
  WHERE: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/where.mp4`,
  HELP: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/help.mp4`,
  CAN: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/can.mp4`,
  ME: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/me.mp4`,
  DEAF: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/deaf.mp4`,
  NEED: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/need.mp4`,
  NICE: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/nice.mp4`,
  PLEASE: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/please.mp4`,
  DO: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/--do.mp4`,
  FEEL: `https://s3-us-west-1.amazonaws.com/assets.startasl.com/videos-new/feel.mp4`,
};
const asrText = ref([]);
const asrTextIndex = ref(0);
const signVdieo = ref(undefined);

const hf = new HfInference("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");

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

  // model = await train();
  model = await tf.loadLayersModel("/model/handModel.json");
  console.log("hi");
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
      if (max >= 0.8) {
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

      // poseResults = poseLandmarker.detectForVideo(video.value, startTimeMs);
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
  data.value = [];
  counter = 0;
  start.value = true;
  predict.value = "";
};

let mediaRecorder = undefined;
const recordSpeech = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioChunks = [];
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };
  mediaRecorder.onstop = async () => {
    // Convert audio chunks to a Blob and read it as ArrayBuffer
    const audioBlob = new Blob(audioChunks, { type: "audio/flac" });
    const audioBuffer = await audioBlob.arrayBuffer();
    const audioData = new Uint8Array(audioBuffer);
    // Call ASR function with the audio data
    try {
      const asrResult = await hf.automaticSpeechRecognition({
        model: "facebook/wav2vec2-large-960h-lv60-self",
        data: audioData,
      });
      console.log(asrResult.text);
      const asrResultArr = asrResult.text.split(" ");
      asrText.value = asrResultArr;

      nextSign();
    } catch (error) {
      console.error("ASR Error:", error);
    }
  };
  mediaRecorder.start();
};
const stopRecordSpeech = async () => {
  mediaRecorder.stop();
};

const setSignVideo = () => {
  if (!signVideosSrcs[asrText.value[asrTextIndex.value]]) return false;

  signVdieo.value.src = signVideosSrcs[asrText.value[asrTextIndex.value]];
  signVdieo.value.id = asrText.value[asrTextIndex.value];

  signVdieo.value.playbackRate = 1.5;
  signVdieo.value.play();
  asrTextIndex.value++;

  return true;
};

const nextSign = async () => {
  if (asrTextIndex.value >= asrText.value.length) {
    asrTextIndex.value = 0;
    setSignVideo();
  } else if (!setSignVideo()) {
    asrTextIndex.value++;
    nextSign();
  }
};
//testing
const vibrate = () => {
  if ("vibrate" in navigator) {
    navigator.vibrate([500, 200, 300]);
  } else {
    alert("Vibration API not supported");
  }
};
</script>

<template>
  <div class="container">
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
        <div
          style="
            width: 700px;
            height: 5px;
            background-color: rgb(0, 255, 0);
            position: absolute;
            left: 0;
            top: 90px;
            bottom: 0;
            z-index: 100;
          "
        ></div>
        <div
          style="
            width: 700px;
            height: 5px;
            background-color: rgb(0, 255, 0);
            position: absolute;
            left: 0;
            top: 330px;
            bottom: 0;
            z-index: 100;
          "
        ></div>
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
        <div class="toolBar">
          <button @click="predictWebcam">start predict</button>
        </div>
      </div>
      <h3>
        {{ text }}
      </h3>
      <div>
        <button @click="reset">reset</button>
        <button @click="vibrate">vibrate</button>
      </div>
    </div>
    <div>
      <button @click="recordSpeech">record speech</button>
      <button @click="stopRecordSpeech">stop record speech</button>
      <h3>{{ asrText.join(" ") }}</h3>
      <div style="width: 500px">
        <video
          style="width: 100%"
          @ended="
            () => {
              nextSign();
            }
          "
          ref="signVdieo"
        ></video>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
}
.container div {
  width: 50%;
}
</style>
