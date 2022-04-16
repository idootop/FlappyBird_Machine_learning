class Bird {
  y = height / 2;
  x = 64;
  isAlive = true;
  // 下一缺口顶部坐标
  topNextObstacle = { x: 0, y: 0 };
  // 下一缺口底部坐标
  bottomNextObstacle = { x: 0, y: 0 };
  // 距下一缺口顶部距离
  upperDist = 0;
  // 距下一缺口底部部距离
  lowerDist = 0;
  // 距地面距离
  bottomDist = 0;
  debug = false;
  brain: NeuralNetwork;
  gravity = 0.8;
  lift = -12;
  // y 轴速度
  velocity = 0;
  // 这只鸟的适应能力分数（存活时间越长，分数越高）
  score = 0;
  // 这只鸟的适应能力（范围0-1，当前鸟适应能力分数在本轮所有鸟适应能力总分数中的占比）
  fitness = 0;

  constructor(brain?: NeuralNetwork) {
    if (brain) {
      this.brain = brain.copy();
    } else {
      this.brain = new NeuralNetwork(4, 8, 2);
    }
  }

  think() {
    let inputs = [];
    inputs[0] = this.y / height;
    inputs[1] = this.topNextObstacle.y / height;
    inputs[2] = this.bottomNextObstacle.x / width;
    inputs[3] = this.velocity / 10;
    // 根据当前状态作为输入，预测输出下一步的操作
    let output = this.brain.predict(inputs);
    if (output[0] > output[1]) {
      // 是否让鸟向上飞
      this.goUp();
    }
  }

  hits(obstacle: Obstacle) {
    if (this.y < 10 || this.y > height - 20) {
      // 鸟落地或碰到上边界
      this.isAlive = false;
      return true;
    }
    if (
      this.y < obstacle.gapStart ||
      this.y > obstacle.gapStart + obstacle.gapLength
    ) {
      if (this.x > obstacle.x && this.x < obstacle.x + obstacle.w) {
        // 鸟撞在柱子上
        this.isAlive = false;
        return true;
      }
    }
    return false;
  }

  goUp() {
    // 鸟向上飞
    this.velocity += this.lift;
  }

  mutate() {
    // 变异
    this.brain.mutate(0.5);
  }

  updateNextObstacle(obstacle: Obstacle) {
    // 更新目标缺口
    this.topNextObstacle = obstacle.upperVertex;
    this.bottomNextObstacle = obstacle.lowerVertex;
  }

  show() {
    // 计算距离
    this.calcDistances();
    this.debug && this.drawDistances();
    // 绘制“鸟” - 圆球
    stroke(255);
    fill(150, 50);
    ellipse(this.x, this.y, 32, 32);
  }

  update() {
    this.velocity += this.gravity;
    this.velocity *= 0.9;
    this.y += this.velocity;
    // 小鸟分数+1
    this.score++;

    if (this.y > height) {
      this.y = height;
      this.velocity = 0;
    }

    if (this.y < 0) {
      this.y = 0;
      this.velocity = 0;
    }
  }

  calcDistances() {
    this.upperDist = int(
      dist(this.x, this.y, this.topNextObstacle.x, this.topNextObstacle.y)
    );
    this.lowerDist = int(
      dist(this.x, this.y, this.bottomNextObstacle.x, this.bottomNextObstacle.y)
    );
    this.bottomDist = int(dist(this.x, this.y, this.x, height));
  }

  drawDistances() {
    // 绘制辅助线 debug
    fill(10, 20, 250);
    stroke(10, 20, 250);
    line(this.x, this.y, this.bottomNextObstacle.x, this.bottomNextObstacle.y);
    line(this.x, this.y, this.topNextObstacle.x, this.topNextObstacle.y);
    line(this.x, this.y, this.x, height);

    push();
    translate(
      (this.x + this.topNextObstacle.x) / 2,
      (this.y + this.topNextObstacle.y) / 2
    );
    rotate(
      atan2(this.topNextObstacle.y - this.y, this.topNextObstacle.x - this.x)
    );
    text(this.upperDist, 0, -5);
    pop();

    push();
    translate(
      (this.x + this.bottomNextObstacle.x) / 2,
      (this.y + this.bottomNextObstacle.y) / 2
    );
    rotate(
      atan2(
        this.bottomNextObstacle.y - this.y,
        this.bottomNextObstacle.x - this.x
      )
    );
    text(this.lowerDist, 0, -5);
    pop();

    push();
    translate(this.x / 2, (this.y + height) / 2);
    rotate(atan2(height - this.y, 0));
    text(this.bottomDist, 0, -5);
    pop();
  }
}
