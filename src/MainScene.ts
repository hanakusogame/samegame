import { Button } from "./Button";
import { Config } from "./Config";
declare function require(x: string): any;
export class MainScene extends g.Scene {
	public lastJoinedPlayerId: string; // 配信者のID
	private font: g.Font;

	constructor(param: g.SceneParameterObject) {
		param.assetIds = [
			"img_numbers_n", "img_numbers_n_red", "title", "start", "finish", "bonus", "combo", "waku", "score", "time",
			"config", "volume", "test", "glyph72", "ui_common",
			"panel", "count",
			"se_start", "se_timeup", "move", "miss", "biri", "bgm", "clear"];
		super(param);

		const tl = require("@akashic-extension/akashic-timeline");
		const timeline = new tl.Timeline(this);

		this.loaded.add(() => {

			g.game.vars.gameState = { score: 0 };

			const size = 336;
			const panelNumX = 10;
			const panelNumY = 7;
			const panelSize = size / panelNumY;
			const margin = 12;
			const isDebug = false;//デバッグ用必ずfalseに

			// 何も送られてこない時は、標準の乱数生成器を使う
			let random = g.game.random;
			let isStart = false;

			this.message.add((msg) => {
				if (msg.data && msg.data.type === "start" && msg.data.parameters) { // セッションパラメータのイベント
					const sessionParameters = msg.data.parameters;
					if (sessionParameters.randomSeed != null) {
						// プレイヤー間で共通の乱数生成器を生成
						// `g.XorshiftRandomGenerator` は Akashic Engine の提供する乱数生成器実装で、 `g.game.random` と同じ型。
						random = new g.XorshiftRandomGenerator(sessionParameters.randomSeed);
					}
				}
			});

			// 配信者のIDを取得
			this.lastJoinedPlayerId = "";
			g.game.join.add((ev) => {
				this.lastJoinedPlayerId = ev.player.id;
			});

			// 背景
			const bg = new g.FilledRect({ scene: this, width: 640, height: 360, cssColor: "#303030", opacity: 0 });
			this.append(bg);
			bg.touchable = true;
			this.append(bg);
			if ((typeof window !== "undefined" && window.RPGAtsumaru) || isDebug) {
				bg.opacity = 1.0;
				bg.modified();
			}

			const base = new g.Sprite({ scene: this, src: this.assets["waku"] });
			this.append(base);
			base.hide();

			const uiBase = new g.E({ scene: this });
			this.append(uiBase);
			uiBase.hide();

			//タイトル
			const sprTitle = new g.Sprite({ scene: this, src: this.assets["title"], x: 70 });
			this.append(sprTitle);
			timeline.create(
				sprTitle, {
					modified: sprTitle.modified, destroyd: sprTitle.destroyed
				}).wait(5000).moveBy(-800, 0, 200).call(() => {
					bg.show();
					base.show();
					uiBase.show();
					isStart = true;
					reset();
				});

			let glyph = JSON.parse((this.assets["test"] as g.TextAsset).data);
			const numFont = new g.BitmapFont({
				src: this.assets["img_numbers_n"],
				map: glyph.map,
				defaultGlyphWidth: glyph.width,
				defaultGlyphHeight: glyph.height,
				missingGlyph: glyph.missingGlyph
			});

			const numFontRed = new g.BitmapFont({
				src: this.assets["img_numbers_n_red"],
				map: glyph.map,
				defaultGlyphWidth: glyph.width,
				defaultGlyphHeight: glyph.height,
				missingGlyph: glyph.missingGlyph
			});

			glyph = JSON.parse((this.assets["glyph72"] as g.TextAsset).data);
			const numFont72 = new g.BitmapFont({
				src: this.assets["ui_common"],
				map: glyph.map,
				defaultGlyphWidth: 72,
				defaultGlyphHeight: 80
			});

			//スコア
			uiBase.append(new g.Sprite({ scene: this, src: this.assets["score"], x: 505, y: 6 }));
			let score = 0;
			const labelScore = new g.Label({
				scene: this,
				x: 440,
				y: 45,
				width: 32 * 6,
				fontSize: 32,
				font: numFont,
				text: "0000",
				textAlign: g.TextAlign.Right, widthAutoAdjust: false
			});
			uiBase.append(labelScore);

			const labelScorePlus = new g.Label({
				scene: this,
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
			const colorCnts: number[] = [];
			const labelColors: g.Label[] = [];
			for (let i = 0; i < 3; i++) {
				uiBase.append(new g.Sprite({
					scene: this,
					src: this.assets["panel"] as g.ImageAsset,
					x: 510,
					y: 120 + (i * 50),
					width: panelSize,
					height: panelSize,
					srcX: (Math.floor(i % 2)) * panelSize,
					srcY: Math.floor(i / 2) * panelSize
				}));
				const label = new g.Label({
					scene: this, font: numFont, fontSize: 32, text: "70", x: 570, y: 128 + (i * 50),
					width: 60, textAlign: g.TextAlign.Right, widthAutoAdjust: false
				});
				labelColors.push(label);
				uiBase.append(label);
				colorCnts.push(0);
			}

			//ゲーム数カウンタ
			let gameCnt = 0;
			const labelGameCnt = new g.Label({
				scene: this, font: numFont, fontSize: 32, text: "0", x: 520, y: 280
			});
			uiBase.append(labelGameCnt);

			uiBase.append(new g.Sprite({ scene: this, src: this.assets["count"], x: 555, y: 282 }));

			//タイム
			uiBase.append(new g.Sprite({ scene: this, src: this.assets["time"], x: 540, y: 320 }));
			const labelTime = new g.Label({ scene: this, font: numFont, fontSize: 32, text: "70", x: 580, y: 323 });
			uiBase.append(labelTime);

			//開始
			const sprStart = new g.Sprite({ scene: this, src: this.assets["start"], x: 50, y: 100 });
			uiBase.append(sprStart);
			sprStart.hide();

			//終了
			const finishBase = new g.E({ scene: this, x: 0, y: 0 });
			this.append(finishBase);
			finishBase.hide();

			const finishBg = new g.FilledRect({ scene: this, width: 640, height: 360, cssColor: "#000000", opacity: 0.3 });
			finishBase.append(finishBg);

			const sprFinish = new g.Sprite({ scene: this, src: this.assets["finish"], x: 120, y: 100 });
			finishBase.append(sprFinish);

			//最前面
			const fg = new g.FilledRect({ scene: this, width: 640, height: 480, cssColor: "#ff0000", opacity: 0.0 });
			this.append(fg);

			//リセットボタン
			const btnReset = new Button(this, ["リセット"], 500, 270, 130);
			if ((typeof window !== "undefined" && window.RPGAtsumaru) || isDebug) {
				finishBase.append(btnReset);
				btnReset.pushEvent = () => {
					reset();
				};
			}

			//ランキングボタン
			const btnRanking = new Button(this, ["ランキング"], 500, 200, 130);
			if ((typeof window !== "undefined" && window.RPGAtsumaru) || isDebug) {
				finishBase.append(btnRanking);
				btnRanking.pushEvent = () => {
					window.RPGAtsumaru.experimental.scoreboards.display(1);
				};
			}

			//設定ボタン
			const btnConfig = new g.Sprite({ scene: this, x: 600, y: 0, src: this.assets["config"], touchable: true });
			if ((typeof window !== "undefined" && window.RPGAtsumaru) || isDebug) {
				this.append(btnConfig);
			}

			//設定画面
			const config = new Config(this, 380, 40);
			if ((typeof window !== "undefined" && window.RPGAtsumaru) || isDebug) {
				this.append(config);
			}
			config.hide();

			btnConfig.pointDown.add(() => {
				if (config.state & 1) {
					config.show();
				} else {
					config.hide();
				}
			});

			config.bgmEvent = (num) => {
				bgm.changeVolume(0.5 * num);
			};

			config.colorEvent = (str) => {
				bg.cssColor = str;
				bg.modified();
			};

			const playSound = (name: string) => {
				(this.assets[name] as g.AudioAsset).play().changeVolume(config.volumes[1]);
			};

			const bgm = (this.assets["bgm"] as g.AudioAsset).play();
			bgm.changeVolume(0.2);

			//色のつながったパネルの判定
			const dx = [0, 1, 0, -1];
			const dy = [1, 0, -1, 0];
			const list: Panel[] = [];
			const chkPanel = (x: number, y: number, num: number) => {
				const panelNow = panels[panelsBase[y][x].num];
				panelsBase[y][x].num = -1;

				for (let i = 0; i < 4; i++) {
					const xx = x + dx[i];
					const yy = y + dy[i];
					if (xx >= 0 && xx < panelNumX && yy >= 0 && yy < panelNumY) {
						if (panelsBase[yy][xx].num !== -1) {
							const panel = panels[panelsBase[yy][xx].num];
							if (num === panel.num) {
								list.push(panel);
								chkPanel(xx, yy, num);
							}
						}
					}
				}
			};

			//ずらす処理
			const downPanel = () => {
				let j = 0;
				for (let x = 0; x < panelNumX; x++) {
					let i = 0;
					let flg = true;
					for (let y = panelNumY - 1; 0 <= y; y--) {
						const num = panelsBase[y][x].num;
						if (num === -1) {
							i++;
							continue;
						}
						if (i > 0 || j > 0) {
							const panel = panels[num];
							const xx = panelsBase[y + i][x].x;
							const yy = panelsBase[y + i][x].y;
							const xxx = panelsBase[y + i][x - j].x;
							timeline.create(panel, { modified: panel.modified, destroyed: panel.destroyed })
								.wait(200).moveTo(xx, yy, 120).moveTo(xxx, yy, 120);
							panelsBase[y + i][x - j].num = panelsBase[y][x].num;
							panelsBase[y][x].num = -1;
						}
						flg = false;
					}
					if (flg) j++;
				}
			};

			//詰み判定
			const chkMate = () => {
				for (let x = 0; x < panelNumX; x++) {
					for (let y = panelNumY - 1; 0 <= y; y--) {
						if (panelsBase[y][x].num === -1) break;
						for (let i = 0; i < 2; i++) {
							const xx = x + dx[i];
							const yy = y + dy[i];
							if (xx >= 0 && xx < panelNumX && yy >= 0 && yy < panelNumY) {
								if (panelsBase[yy][xx].num === -1) continue;
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
			const addScore = (num: number) => {

				if (score + num < 0) {
					num = -score;
				}

				score += num;

				timeline.create().every((e: number, p: number) => {
					labelScore.text = "" + (score - Math.floor(num * (1 - p)));
					labelScore.invalidate();
				}, 400);

				const str = num >= 0 ? "+" : "";
				labelScorePlus.text = str + num;
				labelScorePlus.font = num >= 0 ? numFont : numFontRed;
				labelScorePlus.invalidate();

				g.game.vars.gameState.score = score;
			};

			let panelCnt = panelNumX * panelNumY;
			let bkTween: any;
			const bonusScores = [1000, 300, 100];
			let isMove = false;
			let isMate = false;
			//パネルの土台
			const panelsBase: PanelBase[][] = [];
			for (let y = 0; y < panelNumY; y++) {
				panelsBase[y] = [];
				for (let x = 0; x < panelNumX; x++) {
					const rect = new PanelBase({
						scene: this,
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

					rect.pointDown.add((ev) => {
						if (!isStart || isMove || isMate) return;

						//消す
						const num = rect.num;
						if (num === -1) return;

						list.length = 0;
						list.push(panels[num]);
						chkPanel(x, y, panels[num].num);
						if (list.length === 1) {
							rect.num = num;//1つのときは戻す
							panels[rect.num].show();
						}

						if (list.length === 1) {
							panels[num].frameNumber = 4;
							panels[num].modified();
							timeline.create().wait(150).call(() => {
								panels[num].frameNumber = panels[num].num;
								panels[num].modified();
							});
							addScore(-100);
							playSound("biri");
						}

						if (list.length > 1) {
							isMove = true;
							list.forEach((e) => {
								e.frameNumber = 3;
								e.modified();
								timeline.create().wait(100).call(() => {
									e.hide();
								});
							});
							//ずらす
							downPanel();

							//スコア加算
							addScore(Math.pow(list.length, 2));

							timeline.create().wait(450).call(() => isMove = false);

							//消した数表示
							labelCombo.show();
							sprCombo.show();
							labelCombo.text = "" + list.length;
							labelCombo.invalidate();
							if (bkTween) {
								timeline.remove(bkTween);
							}
							bkTween = timeline.create().wait(500).call(() => {
								labelCombo.hide();
								sprCombo.hide();
							});

							panelCnt -= list.length;

							const n = panels[num].num;
							colorCnts[n] -= list.length;
							labelColors[n].text = "" + colorCnts[n];
							labelColors[n].invalidate();

							//詰みチェック
							if (chkMate()) {
								isMate = true;
								timeline.create(rect).wait(600).call(() => {
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
										timeline.create().every((e: number, p: number) => {
											labelScore.text = "" + (score - Math.floor(bonusScores[panelCnt] * (1 - p)));
											labelScore.invalidate();
										}, 500);
										labelScorePlus.text = "";
										labelScorePlus.invalidate();

										g.game.vars.gameState.score = score;
										playSound("clear");
									} else {
										playSound("miss");
									}
								}).wait(1300).call(() => {
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
							.wait(250).call(() => {
								labelScorePlus.text = "";
								labelScorePlus.invalidate();
							});
					});
				}
			}

			//パネル
			const panels: Panel[] = [];
			for (let i = 0; i < panelNumX * panelNumY; i++) {
				const rect = new Panel(this, panelSize);
				base.append(rect);
				panels.push(rect);
				rect.hide();
			}

			//消した数の表示
			const sprCombo = new g.Sprite({ scene: this, src: this.assets["combo"], x: 220, y: 20 });
			uiBase.append(sprCombo);
			sprCombo.hide();

			const labelCombo = new g.Label({
				scene: this, font: numFont72, fontSize: 72, text: "21", x: 100, y: 20, width: 120, textAlign: g.TextAlign.Right, widthAutoAdjust: false
			});
			uiBase.append(labelCombo);
			labelCombo.hide();

			//マスク
			const rectMask = new g.FilledRect({ scene: this, width: 504, height: 480, cssColor: "#ff0000", opacity: 0.0 });
			this.append(rectMask);

			//ボーナス表示
			const sprBonus = new g.FrameSprite({
				scene: this,
				x: 150,
				y: 120,
				width: 250,
				height: 74,
				src: this.assets["bonus"] as g.ImageAsset,
				frames: [0, 1, 2]
			});
			this.append(sprBonus);
			sprBonus.hide();

			const labelBonus = new g.Label({
				scene: this,
				x: 150,
				y: 200,
				width: 210,
				fontSize: 32,
				font: numFontRed,
				text: "+1000",
				textAlign: g.TextAlign.Center, widthAutoAdjust: false
			});
			this.append(labelBonus);
			labelBonus.hide();

			//メインループ
			let bkTime = 0;
			const timeLimit = 70;
			let startTime = 0;
			this.update.add(() => {
				if (!isStart) return;

				const t = timeLimit - Math.floor((Date.now() - startTime) / 1000);

				if (t <= -1) {

					isStart = false;

					finishBase.show();
					labelScorePlus.text = "";
					labelScorePlus.invalidate();

					timeline.create().wait(1500).call(() => {
						if (typeof window !== "undefined" && window.RPGAtsumaru) {
							window.RPGAtsumaru.experimental.scoreboards.setRecord(1, g.game.vars.gameState.score).then(() => {
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
					timeline.create().wait(500).call(() => {
						fg.opacity = 0.0;
						fg.modified();
					});
				}

				bkTime = t;
			});

			const reStart = () => {
				panelCnt = panelNumX * panelNumY;
				//パネル設置
				let num = 0;
				for (let i = 0; i < 3; i++) { colorCnts[i] = 0; }
				for (let y = 0; y < panelNumY; y++) {
					for (let x = 0; x < panelNumX; x++) {
						panelsBase[y][x].num = num;
						const i = random.get(0, 2);
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
				for (let i = 0; i < 3; i++) {
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
			const reset = () => {
				bkTime = 0;

				score = 0;
				labelScore.text = "0";
				finishBase.hide();
				labelScore.invalidate();

				sprStart.show();
				timeline.create().wait(750).call(() => {
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
	}
}

class PanelBase extends g.FilledRect {
	public num: number = 0;
	constructor(param: g.FilledRectParameterObject) {
		super(param);
	}
}

class Panel extends g.FrameSprite {
	public num: number = 0;
	constructor(scene: g.Scene, panelSize: number) {
		super({
			scene: scene,
			width: panelSize,
			height: panelSize,
			src: scene.assets["panel"] as g.ImageAsset,
			frames: [0, 1, 2, 3, 4, 5]
		});
	}
}
