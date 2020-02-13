"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Button_1 = require("./Button");
var Config_1 = require("./Config");
var MainScene = /** @class */ (function (_super) {
    __extends(MainScene, _super);
    function MainScene(param) {
        var _this = this;
        param.assetIds = [
            "img_numbers_n", "img_numbers_n_red", "title", "start", "finish", "bonus", "combo", "waku", "score", "time",
            "config", "volume", "test", "glyph72", "ui_common",
            "panel", "count",
            "se_start", "se_timeup", "move", "miss", "biri", "bgm", "clear"
        ];
        _this = _super.call(this, param) || this;
        var tl = require("@akashic-extension/akashic-timeline");
        var timeline = new tl.Timeline(_this);
        _this.loaded.add(function () {
            g.game.vars.gameState = { score: 0 };
            var size = 336;
            var panelNumX = 10;
            var panelNumY = 7;
            var panelSize = size / panelNumY;
            var margin = 12;
            var isDebug = false; //デバッグ用必ずfalseに
            // 何も送られてこない時は、標準の乱数生成器を使う
            var random = g.game.random;
            var isStart = false;
            _this.message.add(function (msg) {
                if (msg.data && msg.data.type === "start" && msg.data.parameters) {
                    var sessionParameters = msg.data.parameters;
                    if (sessionParameters.randomSeed != null) {
                        // プレイヤー間で共通の乱数生成器を生成
                        // `g.XorshiftRandomGenerator` は Akashic Engine の提供する乱数生成器実装で、 `g.game.random` と同じ型。
                        random = new g.XorshiftRandomGenerator(sessionParameters.randomSeed);
                    }
                }
            });
            // 配信者のIDを取得
            _this.lastJoinedPlayerId = "";
            g.game.join.add(function (ev) {
                _this.lastJoinedPlayerId = ev.player.id;
            });
            // 背景
            var bg = new g.FilledRect({ scene: _this, width: 640, height: 360, cssColor: "#303030", opacity: 0 });
            _this.append(bg);
            bg.touchable = true;
            _this.append(bg);
            if ((typeof window !== "undefined" && window.RPGAtsumaru) || isDebug) {
                bg.opacity = 1.0;
                bg.modified();
            }
            var base = new g.Sprite({ scene: _this, src: _this.assets["waku"] });
            _this.append(base);
            base.hide();
            var uiBase = new g.E({ scene: _this });
            _this.append(uiBase);
            uiBase.hide();
            //タイトル
            var sprTitle = new g.Sprite({ scene: _this, src: _this.assets["title"], x: 70 });
            _this.append(sprTitle);
            timeline.create(sprTitle, {
                modified: sprTitle.modified, destroyd: sprTitle.destroyed
            }).wait(5000).moveBy(-800, 0, 200).call(function () {
                bg.show();
                base.show();
                uiBase.show();
                isStart = true;
                reset();
            });
            var glyph = JSON.parse(_this.assets["test"].data);
            var numFont = new g.BitmapFont({
                src: _this.assets["img_numbers_n"],
                map: glyph.map,
                defaultGlyphWidth: glyph.width,
                defaultGlyphHeight: glyph.height,
                missingGlyph: glyph.missingGlyph
            });
            var numFontRed = new g.BitmapFont({
                src: _this.assets["img_numbers_n_red"],
                map: glyph.map,
                defaultGlyphWidth: glyph.width,
                defaultGlyphHeight: glyph.height,
                missingGlyph: glyph.missingGlyph
            });
            glyph = JSON.parse(_this.assets["glyph72"].data);
            var numFont72 = new g.BitmapFont({
                src: _this.assets["ui_common"],
                map: glyph.map,
                defaultGlyphWidth: 72,
                defaultGlyphHeight: 80
            });
            //スコア
            uiBase.append(new g.Sprite({ scene: _this, src: _this.assets["score"], x: 505, y: 6 }));
            var score = 0;
            var labelScore = new g.Label({
                scene: _this,
                x: 440,
                y: 45,
                width: 32 * 6,
                fontSize: 32,
                font: numFont,
                text: "0000",
                textAlign: g.TextAlign.Right, widthAutoAdjust: false
            });
            uiBase.append(labelScore);
            var labelScorePlus = new g.Label({
                scene: _this,
                x: 440,
                y: 80,
                width: 32 * 6,
                fontSize: 32,
                font: numFontRed,
                text: "",
                textAlign: g.TextAlign.Center, widthAutoAdjust: false
            });
            uiBase.append(labelScorePlus);
            //各色カウンタ
            var colorCnts = [];
            var labelColors = [];
            for (var i = 0; i < 3; i++) {
                uiBase.append(new g.Sprite({
                    scene: _this,
                    src: _this.assets["panel"],
                    x: 510,
                    y: 120 + (i * 50),
                    width: panelSize,
                    height: panelSize,
                    srcX: (Math.floor(i % 2)) * panelSize,
                    srcY: Math.floor(i / 2) * panelSize
                }));
                var label = new g.Label({
                    scene: _this, font: numFont, fontSize: 32, text: "70", x: 570, y: 128 + (i * 50),
                    width: 60, textAlign: g.TextAlign.Right, widthAutoAdjust: false
                });
                labelColors.push(label);
                uiBase.append(label);
                colorCnts.push(0);
            }
            //ゲーム数カウンタ
            var gameCnt = 0;
            var labelGameCnt = new g.Label({
                scene: _this, font: numFont, fontSize: 32, text: "0", x: 520, y: 280
            });
            uiBase.append(labelGameCnt);
            uiBase.append(new g.Sprite({ scene: _this, src: _this.assets["count"], x: 555, y: 282 }));
            //タイム
            uiBase.append(new g.Sprite({ scene: _this, src: _this.assets["time"], x: 540, y: 320 }));
            var labelTime = new g.Label({ scene: _this, font: numFont, fontSize: 32, text: "70", x: 580, y: 323 });
            uiBase.append(labelTime);
            //開始
            var sprStart = new g.Sprite({ scene: _this, src: _this.assets["start"], x: 50, y: 100 });
            uiBase.append(sprStart);
            sprStart.hide();
            //終了
            var finishBase = new g.E({ scene: _this, x: 0, y: 0 });
            _this.append(finishBase);
            finishBase.hide();
            var finishBg = new g.FilledRect({ scene: _this, width: 640, height: 360, cssColor: "#000000", opacity: 0.3 });
            finishBase.append(finishBg);
            var sprFinish = new g.Sprite({ scene: _this, src: _this.assets["finish"], x: 120, y: 100 });
            finishBase.append(sprFinish);
            //最前面
            var fg = new g.FilledRect({ scene: _this, width: 640, height: 480, cssColor: "#ff0000", opacity: 0.0 });
            _this.append(fg);
            //リセットボタン
            var btnReset = new Button_1.Button(_this, ["リセット"], 500, 270, 130);
            if ((typeof window !== "undefined" && window.RPGAtsumaru) || isDebug) {
                finishBase.append(btnReset);
                btnReset.pushEvent = function () {
                    reset();
                };
            }
            //ランキングボタン
            var btnRanking = new Button_1.Button(_this, ["ランキング"], 500, 200, 130);
            if ((typeof window !== "undefined" && window.RPGAtsumaru) || isDebug) {
                finishBase.append(btnRanking);
                btnRanking.pushEvent = function () {
                    window.RPGAtsumaru.experimental.scoreboards.display(1);
                };
            }
            //設定ボタン
            var btnConfig = new g.Sprite({ scene: _this, x: 600, y: 0, src: _this.assets["config"], touchable: true });
            if ((typeof window !== "undefined" && window.RPGAtsumaru) || isDebug) {
                _this.append(btnConfig);
            }
            //設定画面
            var config = new Config_1.Config(_this, 380, 40);
            if ((typeof window !== "undefined" && window.RPGAtsumaru) || isDebug) {
                _this.append(config);
            }
            config.hide();
            btnConfig.pointDown.add(function () {
                if (config.state & 1) {
                    config.show();
                }
                else {
                    config.hide();
                }
            });
            config.bgmEvent = function (num) {
                bgm.changeVolume(0.5 * num);
            };
            config.colorEvent = function (str) {
                bg.cssColor = str;
                bg.modified();
            };
            var playSound = function (name) {
                _this.assets[name].play().changeVolume(config.volumes[1]);
            };
            var bgm = _this.assets["bgm"].play();
            bgm.changeVolume(0.2);
            //色のつながったパネルの判定
            var dx = [0, 1, 0, -1];
            var dy = [1, 0, -1, 0];
            var list = [];
            var chkPanel = function (x, y, num) {
                var panelNow = panels[panelsBase[y][x].num];
                panelsBase[y][x].num = -1;
                for (var i = 0; i < 4; i++) {
                    var xx = x + dx[i];
                    var yy = y + dy[i];
                    if (xx >= 0 && xx < panelNumX && yy >= 0 && yy < panelNumY) {
                        if (panelsBase[yy][xx].num !== -1) {
                            var panel = panels[panelsBase[yy][xx].num];
                            if (num === panel.num) {
                                list.push(panel);
                                chkPanel(xx, yy, num);
                            }
                        }
                    }
                }
            };
            //ずらす処理
            var downPanel = function () {
                var j = 0;
                for (var x = 0; x < panelNumX; x++) {
                    var i = 0;
                    var flg = true;
                    for (var y = panelNumY - 1; 0 <= y; y--) {
                        var num = panelsBase[y][x].num;
                        if (num === -1) {
                            i++;
                            continue;
                        }
                        if (i > 0 || j > 0) {
                            var panel = panels[num];
                            var xx = panelsBase[y + i][x].x;
                            var yy = panelsBase[y + i][x].y;
                            var xxx = panelsBase[y + i][x - j].x;
                            timeline.create(panel, { modified: panel.modified, destroyed: panel.destroyed })
                                .wait(200).moveTo(xx, yy, 120).moveTo(xxx, yy, 120);
                            panelsBase[y + i][x - j].num = panelsBase[y][x].num;
                            panelsBase[y][x].num = -1;
                        }
                        flg = false;
                    }
                    if (flg)
                        j++;
                }
            };
            //詰み判定
            var chkMate = function () {
                for (var x = 0; x < panelNumX; x++) {
                    for (var y = panelNumY - 1; 0 <= y; y--) {
                        if (panelsBase[y][x].num === -1)
                            break;
                        for (var i = 0; i < 2; i++) {
                            var xx = x + dx[i];
                            var yy = y + dy[i];
                            if (xx >= 0 && xx < panelNumX && yy >= 0 && yy < panelNumY) {
                                if (panelsBase[yy][xx].num === -1)
                                    continue;
                                if (panels[panelsBase[y][x].num].num === panels[panelsBase[yy][xx].num].num) {
                                    return false;
                                }
                            }
                        }
                    }
                }
                return true;
            };
            //スコア追加
            var addScore = function (num) {
                if (score + num < 0) {
                    num = -score;
                }
                score += num;
                timeline.create().every(function (e, p) {
                    labelScore.text = "" + (score - Math.floor(num * (1 - p)));
                    labelScore.invalidate();
                }, 400);
                var str = num >= 0 ? "+" : "";
                labelScorePlus.text = str + num;
                labelScorePlus.font = num >= 0 ? numFont : numFontRed;
                labelScorePlus.invalidate();
                g.game.vars.gameState.score = score;
            };
            var panelCnt = panelNumX * panelNumY;
            var bkTween;
            var bonusScores = [1000, 300, 100];
            var isMove = false;
            var isMate = false;
            //パネルの土台
            var panelsBase = [];
            var _loop_1 = function (y) {
                panelsBase[y] = [];
                var _loop_2 = function (x) {
                    var rect = new PanelBase({
                        scene: _this,
                        x: panelSize * x + margin,
                        y: panelSize * y + margin,
                        width: panelSize,
                        height: panelSize,
                        cssColor: "gray",
                        touchable: true,
                        opacity: 0
                    });
                    base.append(rect);
                    panelsBase[y].push(rect);
                    rect.pointDown.add(function (ev) {
                        if (!isStart || isMove || isMate)
                            return;
                        //消す
                        var num = rect.num;
                        if (num === -1)
                            return;
                        list.length = 0;
                        list.push(panels[num]);
                        chkPanel(x, y, panels[num].num);
                        if (list.length === 1) {
                            rect.num = num; //1つのときは戻す
                            panels[rect.num].show();
                        }
                        if (list.length === 1) {
                            panels[num].frameNumber = 4;
                            panels[num].modified();
                            timeline.create().wait(150).call(function () {
                                panels[num].frameNumber = panels[num].num;
                                panels[num].modified();
                            });
                            addScore(-100);
                            playSound("biri");
                        }
                        if (list.length > 1) {
                            isMove = true;
                            list.forEach(function (e) {
                                e.frameNumber = 3;
                                e.modified();
                                timeline.create().wait(100).call(function () {
                                    e.hide();
                                });
                            });
                            //ずらす
                            downPanel();
                            //スコア加算
                            addScore(Math.pow(list.length, 2));
                            timeline.create().wait(450).call(function () { return isMove = false; });
                            //消した数表示
                            labelCombo.show();
                            sprCombo.show();
                            labelCombo.text = "" + list.length;
                            labelCombo.invalidate();
                            if (bkTween) {
                                timeline.remove(bkTween);
                            }
                            bkTween = timeline.create().wait(500).call(function () {
                                labelCombo.hide();
                                sprCombo.hide();
                            });
                            panelCnt -= list.length;
                            var n = panels[num].num;
                            colorCnts[n] -= list.length;
                            labelColors[n].text = "" + colorCnts[n];
                            labelColors[n].invalidate();
                            //詰みチェック
                            if (chkMate()) {
                                isMate = true;
                                timeline.create(rect).wait(600).call(function () {
                                    rectMask.cssColor = "#000000";
                                    rectMask.opacity = 0.5;
                                    rectMask.modified();
                                    //ボーナス追加と表示
                                    if (panelCnt <= 2) {
                                        sprBonus.frameNumber = panelCnt;
                                        sprBonus.modified();
                                        sprBonus.show();
                                        labelBonus.text = "+" + bonusScores[panelCnt];
                                        labelBonus.invalidate();
                                        labelBonus.show();
                                        score += bonusScores[panelCnt];
                                        timeline.create().every(function (e, p) {
                                            labelScore.text = "" + (score - Math.floor(bonusScores[panelCnt] * (1 - p)));
                                            labelScore.invalidate();
                                        }, 500);
                                        labelScorePlus.text = "";
                                        labelScorePlus.invalidate();
                                        g.game.vars.gameState.score = score;
                                        playSound("clear");
                                    }
                                    else {
                                        playSound("miss");
                                    }
                                }).wait(1300).call(function () {
                                    reStart();
                                });
                            }
                            playSound("move");
                        }
                        //追加するスコアの表示位置を変更
                        labelScorePlus.moveTo(panels[num].x - (labelScorePlus.width / 2), panels[num].y);
                        labelScorePlus.modified();
                        timeline.create(labelScorePlus, { modified: labelScorePlus.invalidate, destroyed: labelScorePlus.destroyed })
                            .moveBy(0, -20, 200)
                            .wait(250).call(function () {
                            labelScorePlus.text = "";
                            labelScorePlus.invalidate();
                        });
                    });
                };
                for (var x = 0; x < panelNumX; x++) {
                    _loop_2(x);
                }
            };
            for (var y = 0; y < panelNumY; y++) {
                _loop_1(y);
            }
            //パネル
            var panels = [];
            for (var i = 0; i < panelNumX * panelNumY; i++) {
                var rect = new Panel(_this, panelSize);
                base.append(rect);
                panels.push(rect);
                rect.hide();
            }
            //消した数の表示
            var sprCombo = new g.Sprite({ scene: _this, src: _this.assets["combo"], x: 220, y: 20 });
            uiBase.append(sprCombo);
            sprCombo.hide();
            var labelCombo = new g.Label({
                scene: _this, font: numFont72, fontSize: 72, text: "21", x: 100, y: 20, width: 120, textAlign: g.TextAlign.Right, widthAutoAdjust: false
            });
            uiBase.append(labelCombo);
            labelCombo.hide();
            //マスク
            var rectMask = new g.FilledRect({ scene: _this, width: 504, height: 480, cssColor: "#ff0000", opacity: 0.0 });
            _this.append(rectMask);
            //ボーナス表示
            var sprBonus = new g.FrameSprite({
                scene: _this,
                x: 150,
                y: 120,
                width: 250,
                height: 74,
                src: _this.assets["bonus"],
                frames: [0, 1, 2]
            });
            _this.append(sprBonus);
            sprBonus.hide();
            var labelBonus = new g.Label({
                scene: _this,
                x: 150,
                y: 200,
                width: 210,
                fontSize: 32,
                font: numFontRed,
                text: "+1000",
                textAlign: g.TextAlign.Center, widthAutoAdjust: false
            });
            _this.append(labelBonus);
            labelBonus.hide();
            //メインループ
            var bkTime = 0;
            var timeLimit = 70;
            var startTime = 0;
            _this.update.add(function () {
                if (!isStart)
                    return;
                var t = timeLimit - Math.floor((Date.now() - startTime) / 1000);
                if (t <= -1) {
                    isStart = false;
                    finishBase.show();
                    labelScorePlus.text = "";
                    labelScorePlus.invalidate();
                    timeline.create().wait(1500).call(function () {
                        if (typeof window !== "undefined" && window.RPGAtsumaru) {
                            window.RPGAtsumaru.experimental.scoreboards.setRecord(1, g.game.vars.gameState.score).then(function () {
                                btnRanking.show();
                                btnReset.show();
                            });
                        }
                        if (isDebug) {
                            btnRanking.show();
                            btnReset.show();
                        }
                    });
                    playSound("se_timeup");
                    return;
                }
                labelTime.text = "" + t;
                labelTime.invalidate();
                if (bkTime !== t && t <= 5) {
                    fg.opacity = 0.1;
                    fg.modified();
                    timeline.create().wait(500).call(function () {
                        fg.opacity = 0.0;
                        fg.modified();
                    });
                }
                bkTime = t;
            });
            var reStart = function () {
                panelCnt = panelNumX * panelNumY;
                //パネル設置
                var num = 0;
                for (var i = 0; i < 3; i++) {
                    colorCnts[i] = 0;
                }
                for (var y = 0; y < panelNumY; y++) {
                    for (var x = 0; x < panelNumX; x++) {
                        panelsBase[y][x].num = num;
                        var i = random.get(0, 2);
                        panels[num].num = i;
                        panels[num].frameNumber = i;
                        panels[num].x = panelsBase[y][x].x;
                        panels[num].y = panelsBase[y][x].y;
                        panels[num].modified();
                        panels[num].show();
                        num++;
                        colorCnts[i]++;
                    }
                }
                for (var i = 0; i < 3; i++) {
                    labelColors[i].text = "" + colorCnts[i];
                    labelColors[i].invalidate();
                }
                gameCnt++;
                labelGameCnt.text = "" + gameCnt;
                labelGameCnt.invalidate();
                rectMask.opacity = 0;
                sprBonus.hide();
                labelBonus.hide();
                isStart = true;
                isMove = false;
                isMate = false;
            };
            //リセット
            var reset = function () {
                bkTime = 0;
                score = 0;
                labelScore.text = "0";
                finishBase.hide();
                labelScore.invalidate();
                sprStart.show();
                timeline.create().wait(750).call(function () {
                    sprStart.hide();
                });
                btnReset.hide();
                btnRanking.hide();
                fg.opacity = 0;
                fg.modified();
                gameCnt = 0;
                reStart();
                playSound("se_start");
                startTime = Date.now();
            };
        });
        return _this;
    }
    return MainScene;
}(g.Scene));
exports.MainScene = MainScene;
var PanelBase = /** @class */ (function (_super) {
    __extends(PanelBase, _super);
    function PanelBase(param) {
        var _this = _super.call(this, param) || this;
        _this.num = 0;
        return _this;
    }
    return PanelBase;
}(g.FilledRect));
var Panel = /** @class */ (function (_super) {
    __extends(Panel, _super);
    function Panel(scene, panelSize) {
        var _this = _super.call(this, {
            scene: scene,
            width: panelSize,
            height: panelSize,
            src: scene.assets["panel"],
            frames: [0, 1, 2, 3, 4, 5]
        }) || this;
        _this.num = 0;
        return _this;
    }
    return Panel;
}(g.FrameSprite));
