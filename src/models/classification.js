import { CLASSES, MODEL_HANDS_INPUT_LENGTH } from "../assets/global";
import * as tf from "@tensorflow/tfjs";

const train = async () => {
  const res = await fetch("../../data_34_hasan.csv");
  const resRami = await fetch("../../data_34_rami.csv");
  const resRm = await fetch("../../data_34_rm.csv");
  let data = await res.text();
  data += await resRami.text();
  data += await resRm.text();

  let INPUT = [];
  let OUTPUT = [];
  let inputSequence = [];
  let outputSequence = [];
  let model = null;

  data.split("\n").forEach((frame) => {
    let input = frame.split(",").map(Number);
    let output = input[input.length - 1];
    input = input.slice(0, input.length - 1);

    inputSequence.push(...input);

    if (inputSequence.length === MODEL_HANDS_INPUT_LENGTH) {
      outputSequence.push(output);
      INPUT.push(inputSequence);
      OUTPUT.push(...outputSequence);
      inputSequence = [];
      outputSequence = [];
    }
  });
  tf.util.shuffleCombo(INPUT, OUTPUT);
  const INPUT_TENSOR = tf.tensor2d(INPUT);
  const OUTPUT_TENSOR = tf.oneHot(tf.tensor1d(OUTPUT, "int32"), CLASSES);
  model = tf.sequential();
  model.add(
    tf.layers.dense({
      inputShape: [INPUT[0].length],
      units: 63 * 2,
      activation: "relu",
    })
  );
  model.add(tf.layers.dense({ units: 170, activation: "relu" }));
  model.add(tf.layers.dense({ units: 170, activation: "relu" }));
  model.add(tf.layers.dense({ units: 35, activation: "relu" }));
  model.add(tf.layers.dense({ units: CLASSES, activation: "softmax" }));

  const logProgress = (epoch, log) => {
    console.log(log);
  };
  model.compile({
    optimizer: "adam",
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  let result = await model.fit(INPUT_TENSOR, OUTPUT_TENSOR, {
    shuffle: true,
    validationSplit: 25,
    learningRate: 0.0000001,
    batchSize: 34,
    epochs: 70,
    callbacks: { onEpochEnd: logProgress },
  });

  await model.save("downloads://handModel");

  OUTPUT_TENSOR.dispose();
  INPUT_TENSOR.dispose();

  return model;
};

export default train;
