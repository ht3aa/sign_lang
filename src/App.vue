<script setup>
import { onMounted, ref } from "vue";
import Detect from "./components/Detect.vue";
import Train from "./components/Train.vue";
import { createHandLandmarker } from "./models/landmarks";

const errorMsg = ref("Loading...");
const isLoading = ref(true);
const poseLandmarker = ref(undefined);
const handLandmarker = ref(undefined);
const costraints = ref(undefined);
const waiting = ref(0);

const checkWebCam = () => {
  const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

  if (!hasGetUserMedia()) {
    errorMsg.value = "your browser does not supported webcam feature";
  }
};

const enableCam = async () => {
  handLandmarker.value = await createHandLandmarker();

  if (!handLandmarker.value) {
    if (waiting.value === 3) {
      errorMsg.value =
        "Taking to long, It seems that your device doesn't support webcam.";
      return;
    } else {
      errorMsg.value = "Wait! Models not loaded yet.";
      await new Promise((r) => setTimeout(r, 5000));
      waiting.value++;
    }
  } else {
    errorMsg.value = "";
    const isMobileDevice = () =>
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    if (isMobileDevice()) {
      costraints.value = {
        video: {
          facingMode: "environment",
        },
      };
    } else {
      costraints.value = {
        video: true,
      };
    }
    isLoading.value = false;
    return;
  }

  enableCam();
};

onMounted(() => {
  checkWebCam();
  enableCam();
});
</script>

<template>
  <div v-if="!errorMsg && !isLoading" id="liveView" class="videoView">
    <!-- <Detect
      :poseLandmarkeaaadfaasdfr="poseLandmarker"
      :handLandmarker="handLandmarker"
      :constraints="costraints"
    /> -->
    <Train
      :poseLandmarker="poseLandmarker"
      :handLandmarker="handLandmarker"
      :constraints="costraints"
    />
  </div>

  <div
    v-else
    style="
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    "
  >
    <span class="loader"></span>
    <div style="margin-top: 20px">
      <span>{{ errorMsg }}</span>
    </div>
  </div>
</template>

<style scoped>
.loader {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: inline-block;
  border-top: 4px solid #000000;
  border-right: 4px solid transparent;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}
.loader::after {
  content: "";
  box-sizing: border-box;
  position: absolute;
  left: 0;
  top: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border-bottom: 4px solid #ff3d00;
  border-left: 4px solid transparent;
}
@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
