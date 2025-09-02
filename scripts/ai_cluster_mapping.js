const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');

// Charger les données d'entraînement
const trainingData = JSON.parse(fs.readFileSync('data/training_data.json'));

// Préparer le modèle
const model = tf.sequential();
model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [10] }));
model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
model.add(tf.layers.dense({ units: 8, activation: 'softmax' }));

// Compiler le modèle
model.compile({
  optimizer: 'adam',
  loss: 'categoricalCrossentropy',
  metrics: ['accuracy']
});

// Entraîner le modèle
const xs = tf.tensor2d(trainingData.map(item => item.features));
const ys = tf.tensor2d(trainingData.map(item => item.labels));

model.fit(xs, ys, {
  epochs: 50,
  callbacks: {
    onEpochEnd: (epoch, logs) => {
      console.log(`Epoch ${epoch}: loss = ${logs.loss}, accuracy = ${logs.acc}`);
    }
  }
}).then(() => {
  model.save('file://./models/cluster_mapping');
  console.log('Modèle entraîné et sauvegardé');
});
