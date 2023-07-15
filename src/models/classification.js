import { MODEL_INPUT_LENGTH } from "../assets/global";
import * as tf from "@tensorflow/tfjs";

const train = async () => {
  const res = await fetch("../../data.csv");
  const data = await res.text();

  let INPUT = [];
  let OUTPUT = [];
  let inputSequence = [];
  let outputSequence = [];
  let model = null;

  data.split("\n").forEach(
    (frame) => {
      let input = frame.split(",").map(Number);
      let output = input[input.length - 1];
      input = input.slice(0, input.length - 1);

      inputSequence.push(...input);

      if (inputSequence.length === MODEL_INPUT_LENGTH) {
        outputSequence.push(output);
        INPUT.push(inputSequence);
        OUTPUT.push(...outputSequence);
        inputSequence = [];
        outputSequence = [];
      }
    },
    { INPUT: [], OUTPUT: [] }
  );

  tf.util.shuffleCombo(INPUT, OUTPUT);
  const INPUT_TENSOR = tf.tensor2d(INPUT);
  const OUTPUT_TENSOR = tf.oneHot(tf.tensor1d(OUTPUT, "int32"), 3);

  model = tf.sequential();
  model.add(
    tf.layers.dense({
      inputShape: [INPUT[0].length],
      units: 63,
      activation: "relu",
    })
  );
  model.add(tf.layers.dense({ units: 70, activation: "relu" }));
  model.add(tf.layers.dense({ units: 25, activation: "relu" }));
  model.add(tf.layers.dense({ units: 3, activation: "softmax" }));

  const logProgress = (epoch, log) => {
    console.log(log);
  };
  model.compile({
    optimizer: "adam",
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });

  let result = await model.fit(INPUT_TENSOR, OUTPUT_TENSOR, {
    shuffle: true,
    learningRate: 0.000001,
    batchSize: 34,
    epochs: 50,
    callbacks: { onEpochEnd: logProgress },
  });

  // await model.save("downloads://handModel");

  OUTPUT_TENSOR.dispose();
  INPUT_TENSOR.dispose();

  return model;
};

export default train;
