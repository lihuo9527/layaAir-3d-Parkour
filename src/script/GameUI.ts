var isDead = false;
export class Home extends Laya.Scene {
    ProgressBar: Laya.ProgressBar;
    progress: number | string;
    startButton: Laya.Button;
    constructor() {
        super();
    }
    load() {
        return new Promise((resolve, reject) => {
            Laya.Scene.load('views/home.scene', Laya.Handler.create(this, function (homeScene: Laya.Scene) {
                console.log(homeScene)
                var scene = Laya.stage.addChild(homeScene);
                this.ProgressBar = scene.getChildByName('progressBar') as Laya.ProgressBar;
                this.progress = scene.getChildByName('progress') as Laya.Text;
                this.startButton = scene.getChildByName('start') as Laya.Text;
                resolve(this.ProgressBar);
            }))
        })
    }
}

export class GameUI extends Laya.Scene {
    constructor() {
        super();
        this.initHome();
    }
    home: any;
    cameraZ: number = 0;
    buildingIndex: number = 4;
    currentPositionZ = 2;
    coin: Laya.Sprite3D;
    car: Laya.Sprite3D;
    stone: Laya.Sprite3D;
    pools: Laya.Sprite3D[] = [];
    lock: boolean = false;
    ani: Laya.Animator;
    roleCurrentPosition: number = 0;
    role: Laya.Sprite3D;
    currenMouseX: number = 0;
    currenMouseY: number = 0;
    roleCurrentPositionY: number = 0;
    isReady: boolean = false;
    isDead = isDead;
    camera: Laya.Camera;
    scene3D: Laya.Scene3D;
    sceneByMemory: Laya.Scene3D;
    Road: Laya.Sprite3D;
    countLoop = 1;
    transitionLock = false;
    progressBar: Laya.ProgressBar;
    restartButton: Laya.Button;
    player: Laya.SoundChannel;
    initHome() {
        this.home = new Home();
        this.home.load().then(async () => {
            console.log(this.home.ProgressBar)
            this.home.ProgressBar.value = 0;
            await this.loadingAssets();
            this.sceneByMemory = Laya.loader.getRes('res/LayaScene_TitleScene/Conventional/TitleScene.ls') as Laya.Scene3D;
            this.home.startButton.visible = true;
            this.home.startButton.on(Laya.Event.CLICK, this, this.init);
        })
    }

    async loadingAssets() {
        return new Promise((resolve, reject) => {
            Laya.loader.create(['res/LayaScene_TitleScene/Conventional/TitleScene.ls', "res/bgm_Bounce_It.mp3"], Laya.Handler.create(this, function (isComplete) {
                resolve(isComplete);
            }),
                Laya.Handler.create(this, function (Progress) {
                    this.home.ProgressBar.value = Progress;
                    this.home.progress.text = Math.floor(Progress * 100) + "%";
                    console.log(Progress);
                })
            )
        })
    }

    init() {
        // this.home.visible = false;
        this.roleCurrentPosition = 0;
        this.roleCurrentPositionY = 0;
        this.cameraZ = 0;
        this.countLoop = 1;
        this.buildingIndex = 4;
        this.currentPositionZ = 2;
        Laya.timer.once(300, this, function () {
            this.scene3D = Laya.stage.addChild(new Laya.Scene3D()) as Laya.Scene3D;
            //添加照相机
            this.camera = (this.scene3D.addChild(new Laya.Camera(0, 5, 120))) as Laya.Camera;
            this.camera.name = "mainCamera";
            this.camera.transform.translate(new Laya.Vector3(0, 5, 20));
            this.camera.transform.rotate(new Laya.Vector3(0, 0, 0), true, false);
            this.scene3D.ambientColor = new Laya.Vector3(1, 1, 1);
            // console.log(this.sceneByMemory);
            this.Road = this.sceneByMemory.getChildByName('Road').clone() as Laya.Sprite3D;
            // console.log(this.sceneByMemory, this.Road);
            var Vampire = this.sceneByMemory.getChildByName('Vampire_No_Animation').clone();
            this.role = this.scene3D.addChild(Vampire) as Laya.Sprite3D;
            // console.log(this.role);
            this.role.transform.position = new Laya.Vector3(0, 0, 10);
            this.role.addComponent(TriggerCollisionScript);
            this.ani = this.role.getComponent(Laya.Animator) as Laya.Animator;
            this.ani.getDefaultState().clip.islooping = true;
            // this.ani.speed = 0.5;
            this.ani.play('Run');
            // console.log(scene);
            for (let roadCount = 0; roadCount < 5; roadCount++) {
                var building = Laya.Pool.getItemByClass('building', Laya.Sprite3D);
                building = Laya.Sprite3D.instantiate(this.Road, this.scene3D, false, new Laya.Vector3(0, 0, -(32 * roadCount)));
            }
            for (let i = 0; i < 35; i++) {
                this.createObstacle(this.sceneByMemory, this.scene3D);
            }
            Laya.timer.loop(40, this, this.GameLoop);
            Laya.stage.on(Laya.Event.MOUSE_DOWN, this, this.onTouchDown);
            Laya.stage.on(Laya.Event.MOUSE_UP, this, this.onTouchUp);
            this.player = Laya.SoundManager.playMusic("res/bgm_Bounce_It.mp3", 0, Laya.Handler.create(this, this.onComplete));
        });
    }

    public GameLoop() {
        if (isDead) {
            this.GameOver();
            return;
        }
        this.camera.transform.position = new Laya.Vector3(0, 5, 20 - this.countLoop);
        this.role.transform.position = new Laya.Vector3(this.roleCurrentPosition, this.roleCurrentPositionY, 10 - this.countLoop);
        this.countLoop += 0.5;
        if (this.countLoop - this.cameraZ >= 32) {
            this.cameraZ = this.countLoop;
            this.buildingIndex++;
            var building = Laya.Pool.getItemByClass('building', Laya.Sprite3D);
            building = Laya.Sprite3D.instantiate(this.Road, this.scene3D, false, new Laya.Vector3(0, 0, -(this.buildingIndex * 32)));
            for (var a = 0; a < 3; a++) {
                this.createObstacle(this.sceneByMemory, this.scene3D);
            }
        }
        if (!this.lock) {
            this.destroyObstacle(this.scene3D, -10 - this.countLoop);
        }
        if (isDead) {
            this.GameOver();
        }
    }
    public GameOver() {
        Laya.timer.clear(this, this.GameLoop);
        // this.ani.getDefaultState().clip.islooping = false;
        this.ani.play('Dead');
        // this.camera.transform.position = new Laya.Vector3(0, 5, this.camera.transform.position.z + 3);
        var restartButton = new Laya.Button();
        restartButton.skin = "res/ui/restart.png";
        restartButton.label = "游戏结束";
        restartButton.width = 282;
        restartButton.height = 100;
        restartButton.labelSize = 24;
        restartButton.labelColors = '#fff';
        restartButton.pos(Laya.stage.width / 2 - 141, Laya.stage.height / 2 - 65);
        this.restartButton = Laya.stage.addChild(restartButton) as Laya.Button;
        this.restartButton.on(Laya.Event.CLICK, this, () => {
            this.restartButton.removeSelf();
            isDead = false;
            this.roleCurrentPosition = 0;
            this.ani.play('Run');
            Laya.Pool.recoverByClass('building');
            // this.scene3D.visible = false;
            this.scene3D.removeSelf();
            console.log(this.sceneByMemory)
            // this.scene3D.destroy(true);
            Laya.stage.off(Laya.Event.MOUSE_DOWN, this, this.onTouchDown);
            Laya.stage.off(Laya.Event.MOUSE_UP, this, this.onTouchUp);
            this.player.stop();
        });
    }

    public onComplete() {
        console.log('MusicComplete');
    }
    
    // public roleCurrentPositionY
    public onTouchUp() {
        if (this.transitionLock || isDead) return;
        if (Math.abs(Laya.stage.mouseY - this.currenMouseY) > Math.abs(Laya.stage.mouseX - this.currenMouseX) && Laya.stage.mouseY < this.currenMouseY) {
            this.ani.play('JumpUp');
            this.transitionTurn('up');
            return;
        }
        if (this.currenMouseX > Laya.stage.mouseX) {
            if (this.roleCurrentPosition === -1.5) return;
            this.ani.play('TurnLeft');
            this.transitionTurn('left');
        } else {
            if (this.roleCurrentPosition === 1.5) return;
            this.ani.play('TurnRight');
            this.transitionTurn('right');
        }
    }

    async transition(direction) {
        return new Promise((resolve, reject) => {
            Laya.timer.once(20, this, () => {
                if (direction === 'right') this.roleCurrentPosition += 0.3;
                if (direction === 'left') this.roleCurrentPosition -= 0.3;
                if (direction === 'up') this.roleCurrentPositionY += 0.4;
                if (direction === 'down') this.roleCurrentPositionY -= 0.4;
                resolve(this.roleCurrentPosition);
            })
        })
    }

    async transitionTurn(direction: 'left' | 'right' | 'up') {
        if (this.transitionLock) return;
        this.transitionLock = true;
        console.log(this.roleCurrentPosition);
        for (var i = 0; i < 5; i++) {
            await this.transition(direction);
        }
        if (direction === 'up') {
            for (var i = 0; i < 5; i++) {
                this.ani.play('JumpDown');
                await this.transition('down');
            }
        }
        this.ani.play('Run');
        this.transitionLock = false;
    }

    public onTouchDown() {
        this.currenMouseY = Laya.stage.mouseY;
        this.currenMouseX = Laya.stage.mouseX;
    }

    public destroyObstacle(scene: Laya.Scene3D, count: number) {
        this.lock = true;
        for (var i = 0; i < scene.numChildren; i++) {
            if (i > 1 && (scene.getChildAt(i) as Laya.Sprite3D).transform.position.z > count + 40) {
                // console.log("!!!")
                scene.getChildAt(i).removeSelf();
                Laya.Pool.recover('building', scene.getChildAt(i));
            }
        }
        this.lock = false;
    }

    public createObstacle(scene: Laya.Scene3D, targetScene: Laya.Scene3D) {

        var z = this.currentPositionZ - 20;
        var num = Math.floor(Math.random() * 4) + 1;
        var left = new Laya.Vector3(-1.7, 0, z);
        var center = new Laya.Vector3(0, 0, z);
        var right = new Laya.Vector3(1.5, 0, z);
        // console.log(z);
        var coin = scene.getChildByName('Coin') as Laya.Sprite3D;
        var car = scene.getChildByName('modelCar') as Laya.Sprite3D;
        var stone = scene.getChildByName('Obstacle_Defend_Box') as Laya.Sprite3D;
        if (num === 1) {
            car.transform.position = left;
            coin.transform.position = right;
            stone.transform.position = center;
        } else if (num === 2) {
            coin.transform.position = left;
            car.transform.position = right;
            stone.transform.position = center;
        } else if (num === 3) {
            stone.transform.position = left;
            car.transform.position = right;
            coin.transform.position = center;
        } else if (num === 4) {
            stone.transform.position = left;
            coin.transform.position = right;
            car.transform.position = center;
        }
        stone.transform.localScale = new Laya.Vector3(0.009, 0.009, 0.009);
        car.transform.localScale = new Laya.Vector3(0.8, 0.8, 0.8);
        var build1 = Laya.Pool.getItemByClass('building', Laya.Sprite3D);
        var build2 = Laya.Pool.getItemByClass('building', Laya.Sprite3D);
        var build3 = Laya.Pool.getItemByClass('building', Laya.Sprite3D);
        build1 = Laya.Sprite3D.instantiate(coin, targetScene, false) as Laya.Sprite3D;
        build2 = Laya.Sprite3D.instantiate(car, targetScene, false) as Laya.Sprite3D;
        build3 = Laya.Sprite3D.instantiate(stone, targetScene, false) as Laya.Sprite3D;
        this.currentPositionZ = z;
    }

}

class TriggerCollisionScript extends Laya.Script3D {
    public kinematicSprite: Laya.Sprite3D;

    constructor() {
        super();
    }

    public onTriggerEnter(other: Laya.PhysicsComponent): void {
        console.log(other.owner.name);
        if (other.owner.name === 'Coin') {
            Laya.SoundManager.playSound("res/coin.mp3", 1, Laya.Handler.create(this, null));
            other.owner.removeSelf();
        } else if (other.owner.name === 'modelCar' || other.owner.name === 'Obstacle_Defend_Box') {
            Laya.SoundManager.playSound("res/hit.mp3", 1, Laya.Handler.create(this, null));
            isDead = true;
        }
    }

    public onTriggerExit(other: Laya.PhysicsComponent): void {

    }

}

