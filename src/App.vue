<script setup>
import { onMounted, ref } from "vue";
import Detect from "./components/Detect.vue";
import { createHandLandmarker, createPoseLandmarker } from "./models/landmarks";
import Train from "./components/Train.vue";

const errorMsg = ref(null);
const isLoading = ref(true);
const poseLandmarker = ref(undefined);
const handLandmarker = ref(undefined);
const video = ref(undefined);

const checkWebCam = () => {
  const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

  if (!hasGetUserMedia()) {
    errorMsg.value = "your browser does not supported webcam feature";
  }
};

const enableCam = async () => {
  poseLandmarker.value = await createPoseLandmarker();
  handLandmarker.value = await createHandLandmarker();
  if (!poseLandmarker.value && !handLandmarker.value) {
    errorMsg.value = "Wait! poseLandmarker or handLandmarker not loaded yet.";
    await new Promise((r) => setTimeout(r, 5000));
  } else {
    console.log(poseLandmarker.value);

    isLoading.value = false;
    return;
  }

  enableCam();
};

const setErrorMsg = (msg) => {
  errorMsg.value = msg;
};

onMounted(() => {
  checkWebCam();
  enableCam();
});
</script>

<template>
  <div v-if="!errorMsg && !isLoading" id="liveView" class="videoView">
    <!-- <Detect :poseLandmarker="poseLandmarker" :handLandmarker="handLandmarker" /> -->
    <Train :poseLandmarker="poseLandmarker" :handLandmarker="handLandmarker" />
  </div>

  <h1 class="loading" v-else>loading...</h1>
</template>

<style scoped>
.loading {
  width: 100%;
  margin-top: 150px;

  text-align: center;
}
</style>
