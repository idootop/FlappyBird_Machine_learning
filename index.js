"use strict";
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
let birds = [];
// 死掉的小鸟
let savedBirds = [];
// 障碍物
let obstacles = [];
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
        }
        else {
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
class Bird {
    constructor(brain) {
        this.y = height / 2;
        this.x = 64;
        this.isAlive = true;
        // 下一缺口顶部坐标
        this.topNextObstacle = { x: 0, y: 0 };
        // 下一缺口底部坐标
        this.bottomNextObstacle = { x: 0, y: 0 };
        // 距下一缺口顶部距离
        this.upperDist = 0;
        // 距下一缺口底部部距离
        this.lowerDist = 0;
        // 距地面距离
        this.bottomDist = 0;
        this.debug = false;
        this.gravity = 0.8;
        this.lift = -12;
        // y 轴速度
        this.velocity = 0;
        // 这只鸟的适应能力分数（存活时间越长，分数越高）
        this.score = 0;
        // 这只鸟的适应能力（范围0-1，当前鸟适应能力分数在本轮所有鸟适应能力总分数中的占比）
        this.fitness = 0;
        if (brain) {
            this.brain = brain.copy();
        }
        else {
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
    hits(obstacle) {
        if (this.y < 10 || this.y > height - 20) {
            // 鸟落地或碰到上边界
            this.isAlive = false;
            return true;
        }
        if (this.y < obstacle.gapStart ||
            this.y > obstacle.gapStart + obstacle.gapLength) {
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
    updateNextObstacle(obstacle) {
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
        this.upperDist = int(dist(this.x, this.y, this.topNextObstacle.x, this.topNextObstacle.y));
        this.lowerDist = int(dist(this.x, this.y, this.bottomNextObstacle.x, this.bottomNextObstacle.y));
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
        translate((this.x + this.topNextObstacle.x) / 2, (this.y + this.topNextObstacle.y) / 2);
        rotate(atan2(this.topNextObstacle.y - this.y, this.topNextObstacle.x - this.x));
        text(this.upperDist, 0, -5);
        pop();
        push();
        translate((this.x + this.bottomNextObstacle.x) / 2, (this.y + this.bottomNextObstacle.y) / 2);
        rotate(atan2(this.bottomNextObstacle.y - this.y, this.bottomNextObstacle.x - this.x));
        text(this.lowerDist, 0, -5);
        pop();
        push();
        translate(this.x / 2, (this.y + height) / 2);
        rotate(atan2(height - this.y, 0));
        text(this.bottomDist, 0, -5);
        pop();
    }
}
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
        }
        else {
            const newBird = new Bird(bestBird.brain);
            newBird.mutate();
            birds[i] = newBird;
        }
    }
    savedBirds = [];
}
class NeuralNetwork {
    constructor(inputs, hidden, outputs, brain) {
        this.inputNodes = inputs;
        this.hiddenNodes = hidden;
        this.outputNodes = outputs;
        if (brain) {
            this.model = brain;
        }
        else {
            this.model = this.createModel();
        }
    }
    copy() {
        const modelCopy = this.createModel();
        const weights = this.model.getWeights();
        const weightCopies = [];
        for (let i = 0; i < weights.length; i++) {
            weightCopies[i] = weights[i].clone();
        }
        modelCopy.setWeights(weightCopies);
        return new NeuralNetwork(this.inputNodes, this.hiddenNodes, this.outputNodes, modelCopy);
    }
    mutate(rate) {
        const weights = this.model.getWeights();
        const mutatedWeights = [];
        for (let i = 0; i < weights.length; i++) {
            let tensor = weights[i];
            let shape = weights[i].shape;
            let values = tensor.dataSync().slice();
            for (let j = 0; j < values.length; j++) {
                if (random(1) < rate) {
                    // 变异
                    let w = values[j];
                    values[j] = w + randomGaussian(0, 1);
                }
            }
            mutatedWeights[i] = tf.tensor(values, shape);
        }
        this.model.setWeights(mutatedWeights);
    }
    createModel() {
        const model = tf.sequential();
        const hidden = tf.layers.dense({
            units: this.hiddenNodes,
            inputDim: this.inputNodes,
            activation: "sigmoid",
        });
        model.add(hidden);
        const output = tf.layers.dense({
            units: this.outputNodes,
            activation: "softmax",
        });
        model.add(output);
        return model;
    }
    predict(inputs) {
        // 预测
        const xs = tf.tensor2d([inputs]);
        const ys = this.model.predict(xs);
        return ys.dataSync();
    }
}
class Obstacle {
    constructor() {
        this.x = width;
        this.w = 30;
        this.topMin = 50;
        this.botMin = height / 2;
        // 缺口起始位置
        this.gapStart = random(this.topMin, this.botMin);
        // 缺口长度
        this.gapLength = 200;
        this.speed = 3;
        this.passed = false;
        this.highlight = false;
        this.upperVertex = { x: 0, y: 0 };
        this.lowerVertex = { x: 0, y: 0 };
    }
    show() {
        fill(0);
        rect(this.x, 0, this.w, this.gapStart);
        rect(this.x, this.gapStart + this.gapLength, this.w, height);
        const center = this.x + this.w / 2;
        this.lowerVertex = { x: center, y: this.gapStart + this.gapLength };
        this.upperVertex = { x: center, y: this.gapStart };
    }
    update() {
        this.x -= this.speed;
    }
    passesBird() {
        if (this.x < 60) {
            // 小鸟通过了当前障碍物
            this.passed = true;
            return true;
        }
        else {
            return false;
        }
    }
    isOffScreen() {
        // 离开屏幕
        return this.x < -this.w;
    }
    hits(bird) {
        if (bird.y < this.gapStart || bird.y > this.gapStart + this.gapLength) {
            if (bird.x > this.x && bird.x < this.x + this.w) {
                // 小鸟撞上了当前障碍物
                this.highlight = true;
                return true;
            }
        }
        this.highlight = false;
        return false;
    }
}
