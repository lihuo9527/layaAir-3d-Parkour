(function () {
    'use strict';

    class GameConfig {
        constructor() {
        }
        static init() {
            var reg = Laya.ClassUtils.regClass;
        }
    }
    GameConfig.width = 720;
    GameConfig.height = 1280;
    GameConfig.scaleMode = "fixedwidth";
    GameConfig.screenMode = "none";
    GameConfig.alignV = "top";
    GameConfig.alignH = "left";
    GameConfig.startScene = "views/home.scene";
    GameConfig.sceneRoot = "";
    GameConfig.debug = false;
    GameConfig.stat = true;
    GameConfig.physicsDebug = false;
    GameConfig.exportSceneToJson = true;
    GameConfig.init();

    var isDead = false;
    class Home extends Laya.Scene {
        constructor() {
            super();
        }
        load() {
            return new Promise((resolve, reject) => {
                Laya.Scene.load('views/home.scene', Laya.Handler.create(this, function (homeScene) {
                    console.log(homeScene);
                    var scene = Laya.stage.addChild(homeScene);
                    this.ProgressBar = scene.getChildByName('progressBar');
                    this.progress = scene.getChildByName('progress');
                    this.startButton = scene.getChildByName('start');
                    resolve(this.ProgressBar);
                }));
            });
        }
    }
    class GameUI extends Laya.Scene {
        constructor() {
            super();
            this.cameraZ = 0;
            this.buildingIndex = 4;
            this.currentPositionZ = 2;
            this.pools = [];
            this.lock = false;
            this.roleCurrentPosition = 0;
            this.currenMouseX = 0;
            this.currenMouseY = 0;
            this.roleCurrentPositionY = 0;
            this.isReady = false;
            this.isDead = isDead;
            this.countLoop = 1;
            this.transitionLock = false;
            this.initHome();
        }
        initHome() {
            this.home = new Home();
            this.home.load().then(async () => {
                console.log(this.home.ProgressBar);
                this.home.ProgressBar.value = 0;
                await this.loadingAssets();
                this.sceneByMemory = Laya.loader.getRes('res/LayaScene_TitleScene/Conventional/TitleScene.ls');
                this.home.startButton.visible = true;
                this.home.startButton.on(Laya.Event.CLICK, this, this.init);
            });
        }
        async loadingAssets() {
            return new Promise((resolve, reject) => {
                Laya.loader.create(['res/LayaScene_TitleScene/Conventional/TitleScene.ls', "res/bgm_Bounce_It.mp3"], Laya.Handler.create(this, function (isComplete) {
                    resolve(isComplete);
                }), Laya.Handler.create(this, function (Progress) {
                    this.home.ProgressBar.value = Progress;
                    this.home.progress.text = Math.floor(Progress * 100) + "%";
                    console.log(Progress);
                }));
            });
        }
        init() {
            this.roleCurrentPosition = 0;
            this.roleCurrentPositionY = 0;
            this.cameraZ = 0;
            this.countLoop = 1;
            this.buildingIndex = 4;
            this.currentPositionZ = 2;
            Laya.timer.once(300, this, function () {
                this.scene3D = Laya.stage.addChild(new Laya.Scene3D());
                this.camera = (this.scene3D.addChild(new Laya.Camera(0, 5, 120)));
                this.camera.name = "mainCamera";
                this.camera.transform.translate(new Laya.Vector3(0, 5, 20));
                this.camera.transform.rotate(new Laya.Vector3(0, 0, 0), true, false);
                this.scene3D.ambientColor = new Laya.Vector3(1, 1, 1);
                this.Road = this.sceneByMemory.getChildByName('Road').clone();
                var Vampire = this.sceneByMemory.getChildByName('Vampire_No_Animation').clone();
                this.role = this.scene3D.addChild(Vampire);
                this.role.transform.position = new Laya.Vector3(0, 0, 10);
                this.role.addComponent(TriggerCollisionScript);
                this.ani = this.role.getComponent(Laya.Animator);
                this.ani.getDefaultState().clip.islooping = true;
                this.ani.play('Run');
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
        GameLoop() {
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
        GameOver() {
            Laya.timer.clear(this, this.GameLoop);
            this.ani.play('Dead');
            var restartButton = new Laya.Button();
            restartButton.skin = "res/ui/restart.png";
            restartButton.label = "游戏结束";
            restartButton.width = 282;
            restartButton.height = 100;
            restartButton.labelSize = 24;
            restartButton.labelColors = '#fff';
            restartButton.pos(Laya.stage.width / 2 - 141, Laya.stage.height / 2 - 65);
            this.restartButton = Laya.stage.addChild(restartButton);
            this.restartButton.on(Laya.Event.CLICK, this, () => {
                this.restartButton.removeSelf();
                isDead = false;
                this.roleCurrentPosition = 0;
                this.ani.play('Run');
                Laya.Pool.recoverByClass('building');
                this.scene3D.removeSelf();
                console.log(this.sceneByMemory);
                Laya.stage.off(Laya.Event.MOUSE_DOWN, this, this.onTouchDown);
                Laya.stage.off(Laya.Event.MOUSE_UP, this, this.onTouchUp);
                this.player.stop();
            });
        }
        onComplete() {
            console.log('MusicComplete');
        }
        onTouchUp() {
            if (this.transitionLock || isDead)
                return;
            if (Math.abs(Laya.stage.mouseY - this.currenMouseY) > Math.abs(Laya.stage.mouseX - this.currenMouseX) && Laya.stage.mouseY < this.currenMouseY) {
                this.ani.play('JumpUp');
                this.transitionTurn('up');
                return;
            }
            if (this.currenMouseX > Laya.stage.mouseX) {
                if (this.roleCurrentPosition === -1.5)
                    return;
                this.ani.play('TurnLeft');
                this.transitionTurn('left');
            }
            else {
                if (this.roleCurrentPosition === 1.5)
                    return;
                this.ani.play('TurnRight');
                this.transitionTurn('right');
            }
        }
        async transition(direction) {
            return new Promise((resolve, reject) => {
                Laya.timer.once(20, this, () => {
                    if (direction === 'right')
                        this.roleCurrentPosition += 0.3;
                    if (direction === 'left')
                        this.roleCurrentPosition -= 0.3;
                    if (direction === 'up')
                        this.roleCurrentPositionY += 0.4;
                    if (direction === 'down')
                        this.roleCurrentPositionY -= 0.4;
                    resolve(this.roleCurrentPosition);
                });
            });
        }
        async transitionTurn(direction) {
            if (this.transitionLock)
                return;
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
        onTouchDown() {
            this.currenMouseY = Laya.stage.mouseY;
            this.currenMouseX = Laya.stage.mouseX;
        }
        destroyObstacle(scene, count) {
            this.lock = true;
            for (var i = 0; i < scene.numChildren; i++) {
                if (i > 1 && scene.getChildAt(i).transform.position.z > count + 40) {
                    scene.getChildAt(i).removeSelf();
                    Laya.Pool.recover('building', scene.getChildAt(i));
                }
            }
            this.lock = false;
        }
        createObstacle(scene, targetScene) {
            var z = this.currentPositionZ - 20;
            var num = Math.floor(Math.random() * 4) + 1;
            var left = new Laya.Vector3(-1.7, 0, z);
            var center = new Laya.Vector3(0, 0, z);
            var right = new Laya.Vector3(1.5, 0, z);
            var coin = scene.getChildByName('Coin');
            var car = scene.getChildByName('modelCar');
            var stone = scene.getChildByName('Obstacle_Defend_Box');
            if (num === 1) {
                car.transform.position = left;
                coin.transform.position = right;
                stone.transform.position = center;
            }
            else if (num === 2) {
                coin.transform.position = left;
                car.transform.position = right;
                stone.transform.position = center;
            }
            else if (num === 3) {
                stone.transform.position = left;
                car.transform.position = right;
                coin.transform.position = center;
            }
            else if (num === 4) {
                stone.transform.position = left;
                coin.transform.position = right;
                car.transform.position = center;
            }
            stone.transform.localScale = new Laya.Vector3(0.009, 0.009, 0.009);
            car.transform.localScale = new Laya.Vector3(0.8, 0.8, 0.8);
            var build1 = Laya.Pool.getItemByClass('building', Laya.Sprite3D);
            var build2 = Laya.Pool.getItemByClass('building', Laya.Sprite3D);
            var build3 = Laya.Pool.getItemByClass('building', Laya.Sprite3D);
            build1 = Laya.Sprite3D.instantiate(coin, targetScene, false);
            build2 = Laya.Sprite3D.instantiate(car, targetScene, false);
            build3 = Laya.Sprite3D.instantiate(stone, targetScene, false);
            this.currentPositionZ = z;
        }
    }
    class TriggerCollisionScript extends Laya.Script3D {
        constructor() {
            super();
        }
        onTriggerEnter(other) {
            console.log(other.owner.name);
            if (other.owner.name === 'Coin') {
                Laya.SoundManager.playSound("res/coin.mp3", 1, Laya.Handler.create(this, null));
                other.owner.removeSelf();
            }
            else if (other.owner.name === 'modelCar' || other.owner.name === 'Obstacle_Defend_Box') {
                Laya.SoundManager.playSound("res/hit.mp3", 1, Laya.Handler.create(this, null));
                isDead = true;
            }
        }
        onTriggerExit(other) {
        }
    }

    class Main {
        constructor() {
            if (window["Laya3D"])
                Laya3D.init(GameConfig.width, GameConfig.height);
            else
                Laya.init(GameConfig.width, GameConfig.height, Laya["WebGL"]);
            Laya["Physics"] && Laya["Physics"].enable();
            Laya["DebugPanel"] && Laya["DebugPanel"].enable();
            Laya.stage.scaleMode = GameConfig.scaleMode;
            Laya.stage.screenMode = Laya.Stage.SCREEN_VERTICAL;
            Laya.stage.alignV = GameConfig.alignV;
            Laya.stage.alignH = GameConfig.alignH;
            Laya.stage.screenMode = Laya.Stage.SCREEN_VERTICAL;
            var screenPercent = Laya.Browser.height / Laya.Browser.width;
            if (screenPercent > 1.5) {
                Laya.stage.scaleMode = Laya.Stage.SCALE_FIXED_WIDTH;
                var scale = Laya.Browser.height / Laya.Browser.width;
                var height = Laya.stage.width * scale;
                Laya.stage.y = height / 2 - Laya.stage.designHeight / 2;
            }
            else {
                Laya.stage.scaleMode = Laya.Stage.SCALE_FIXED_HEIGHT;
                var scale = Laya.Browser.height / Laya.Browser.width;
                var width = Laya.stage.height / scale;
                Laya.stage.x = width / 2 - Laya.stage.designWidth / 2;
            }
            Laya.URL.exportSceneToJson = GameConfig.exportSceneToJson;
            if (GameConfig.debug || Laya.Utils.getQueryString("debug") == "true")
                Laya.enableDebugPanel();
            if (GameConfig.physicsDebug && Laya["PhysicsDebugDraw"])
                Laya["PhysicsDebugDraw"].enable();
            if (GameConfig.stat)
                Laya.Stat.show();
            Laya.alertGlobalError(true);
            Laya.ResourceVersion.enable("version.json", Laya.Handler.create(this, this.onVersionLoaded), Laya.ResourceVersion.FILENAME_VERSION);
        }
        onVersionLoaded() {
            Laya.AtlasInfoManager.enable("fileconfig.json", Laya.Handler.create(this, this.onConfigLoaded));
        }
        onConfigLoaded() {
            new GameUI();
        }
    }
    new Main();

}());
