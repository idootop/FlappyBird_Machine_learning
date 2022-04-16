// 前进步数
let step = 0;
// 分数
let score = 0;
// 最高分
let best = 0;
// 游戏轮数
let generation = 1;
// 每代小鸟数量
const birdsAmount = 100;
// 活着的小鸟
let birds: Bird[] = [];
// 死掉的小鸟
let savedBirds: Bird[] = [];
// 障碍物
let obstacles: Obstacle[] = [];

function setup() {
  // tensorflow 开启 cpu 模式
  tf.setBackend("cpu");
  createCanvas(windowWidth, windowHeight);
  frameRate(120);
  // 初始化小鸟
  for (let i = 0; i < birdsAmount; i++) {
    birds.push(new Bird());
  }
}

function draw() {
  // 清空屏幕
  clear(0, 0, 255, 255);
  fill(0, 0, 255);
  // 绘制左上角文字
  textSize(20);
  text("最高分数: " + (best < score ? score : best), 20, 20 + 20);
  text("当前分数: " + score, 20, 20 + 50);
  text("当前存活: " + birds.length, 20, 20 + 80);
  text("当前轮数: " + generation, 20, 20 + 110);

  if (step % 100 == 0) {
    // 每100步添加一个新的障碍物
    obstacles.push(new Obstacle());
  }

  // 倒序遍历，因为要删除数组中元素
  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    // 更新障碍物位置
    obstacles[i].update();
    obstacles[i].show();
    if (!obstacles[i].passed && obstacles[i].passesBird()) {
      // 小鸟超过当前障碍物，分数+1
      score++;
    }
    if (obstacles[i].isOffScreen()) {
      // 移除离屏障碍物
      obstacles.splice(i, 1);
    }
  }

  // 要 pass 的下一个障碍物
  const nextObstacle = obstacles[0].passesBird() ? obstacles[1] : obstacles[0];
  for (let z = 0; z < birds.length; z += 1) {
    // 检测小鸟是否碰到障碍物
    for (let i = obstacles.length - 1; i >= 0; i -= 1) {
      birds[z].hits(obstacles[i]);
    }
    birds[z].update();
    birds[z].updateNextObstacle(nextObstacle);
    // 小鸟 agent 自动操作
    birds[z].think();
    birds[z].show();
    // 小鸟死的差不多后开启 debug 模式
    birds[z].debug = birds.length < 5;
  }

  // 活着的小鸟留下
  birds = birds.filter((bird) => {
    if (bird.isAlive) {
      return true;
    } else {
      // 保存死了的小鸟
      savedBirds.push(bird);
      return false;
    }
  });

  if (birds.length === 0) {
    // 本轮小鸟全部 gg ，重新生成下一轮小鸟
    obstacles = [];
    obstacles.push(new Obstacle());
    // 刷新最高分
    best = score > best ? score : best;
    score = 0;
    step = 0;
    nextGeneration();
    generation++;
  }
  step++;
}
