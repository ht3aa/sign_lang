const ONE_HAND_LANDMARKS_NUMBER = 21 * 3;
export const TRAIN_FRAMES_NUMBERS = 15;

export const MODEL_HANDS_INPUT_LENGTH =
  (ONE_HAND_LANDMARKS_NUMBER + ONE_HAND_LANDMARKS_NUMBER) *
  TRAIN_FRAMES_NUMBERS;

export const CLASSES = 12;

export const zerosHandLandmarks = () => {
  const zerosHandLandmarks = [];
  for (let i = 0; i < 21; i++) {
    zerosHandLandmarks.push({ x: 0, y: 0, z: 0 });
  }

  return zerosHandLandmarks;
};
