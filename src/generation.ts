function nextGeneration() {
  let bestBird = savedBirds[0];
  for (const bird of savedBirds) {
    if (bird.score > bestBird.score) {
      bestBird = bird;
    }
  }
  bestBird = new Bird(bestBird.brain);
  for (let i = 0; i < birdsAmount; i++) {
    // 选择继承上一轮中表现最好的鸟的经验
    if (i === 0) {
      birds[i] = bestBird;
    } else {
      const newBird = new Bird(bestBird.brain);
      newBird.mutate();
      birds[i] = newBird;
    }
  }
  savedBirds = [];
}
