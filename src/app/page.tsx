"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Instrument_Serif } from "next/font/google";

const instrument = Instrument_Serif({
	subsets: ["latin"],
	weight: ["400"]
});

// --------------------------------------------------------------------
// ASCII ART
// --------------------------------------------------------------------

const asciiArt = [
	"                                                                                                    ",
	"                                                                                                    ",
	"                                                                                                    ",
	"                                                @@                                                  ",
	"                                                @@@                                                 ",
	"                                               @@@@                                                 ",
	"                                               @@@@@                                                ",
	"                                              @@@@@@                                                ",
	"                                              @@@@@@@                                               ",
	"                                             @@@@@@@@                                               ",
	"                                             @@@@@@@@@                                              ",
	"                                            @@@@@@@@@@@                                             ",
	"                                            @@@@@@@@@@@                                             ",
	"                                           @@@@@@@@@@@@                                             ",
	"                                           @@@@@@@@@@@@@                                            ",
	"                                          @@@@@@@@@@@@@@@                                           ",
	"                  @@@                   @@@@@@@@@@@@@@@@@@@                   @@@                  ",
	"                     @@@@@@@@@           @@@@@@@@@@@@@@@@@          @@@@@@@@@@                     ",
	"                        @@@@@@@@@@@@@@@     @@@@@@@@@@@     @@@@@@@@@@@@@@@                        ",
	"                           @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@                           ",
	"                             @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@                              ",
	"                                @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@                                 ",
	"                                   @@@@@@@@@@@@@@@@@@@@@@@@@@@@@                                   ",
	"                                    @@@@@@ @@@@@@@@@@@@@@@@@@@                                     ",
	"                                    @@@@  @@@@@@@@@@@@@@@@@@@@                                     ",
	"                                    @    @@@@@@@@@@@@@@@@@@@@@@                                    ",
	"                                       @@@@@@@@@@@@@@@@@@@@@@@@@                                   ",
	"                                      @@@@@@@@@     @@@@@@@@@@@@@                                  ",
	"                                     @@@@@@@@         @@@@@@@@@@@@                                 ",
	"                                    @@@@@@@             @@@@@@@@@@                                 ",
	"                                  @@@@@@@                 @@@@@@@@@                                ",
	"                                 @@@@@@                     @@@@@@@@                               ",
	"                                @@@@@                         @@@@@@@                              ",
	"                              @@@@@                             @@@@@@                             ",
	"                             @@@@                                 @@@@@                            ",
	"                            @@@                                     @@@                            ",
	"                           @@                                         @@                           ",
	"                                                                                                    ",
	"                                                                                                    ",
	"                                                                                                    ",
	"                                                                                                    ",
	"                                                                                                    ",
	"                                                                                                    "
];

// --------------------------------------------------------------------
// PRECOMPUTED MASK
// --------------------------------------------------------------------

const rows = asciiArt.length;
const cols = Math.max(...asciiArt.map(r => r.length));

const asciiMask = asciiArt.map(r => r.split("").map(ch => ch !== " "));
const filledCells: Array<{ col: number; row: number }> = [];

for (let row = 0; row < rows; row++) {
	for (let col = 0; col < cols; col++) {
		if (asciiMask[row][col]) filledCells.push({ col, row });
	}
}

const centerCol = cols / 2;
const centerRow = rows / 2;

const finalChars = ["W", "A", "Y", "R"];
const buttonLabels = ["HOME", "ABOUT", "PROJECTS", "CONTACT"];

// Randomized reveal letter positions
const allLetterPositions: Array<{ b: number; j: number }> = [];
for (let b = 0; b < buttonLabels.length; b++) {
	for (let j = 0; j < buttonLabels[b].length; j++) {
		allLetterPositions.push({ b, j });
	}
}

// synchronous letter reveal cache
const revealedInstant = buttonLabels.map(label => Array(label.length).fill(0));

// Gaussian helper
function gaussianRandom(mean = 0, stdev = 1) {
	let u = 0, v = 0;
	while (u === 0) u = Math.random();
	while (v === 0) v = Math.random();
	return mean + stdev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function shuffle(arr: number[]): number[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// --------------------------------------------------------------------
// ANIMATION STATE TYPES
// --------------------------------------------------------------------

type Wave = {
	radius: number;
	originCol: number;
	originRow: number;
};

type AnimState = {
	started: boolean;
	frame: number;
	waves: Wave[];
	fluidWaves: Wave[];
	nextWaveFrame: number;
	lettersRevealed: number;
	fluidMode: boolean;
};

const ALL_LETTERS_COUNT = allLetterPositions.length;

// --------------------------------------------------------------------
// COMPONENT
// --------------------------------------------------------------------

export default function Page() {
	// ASCII flatten + reveal order
	const flatArt = useMemo(() => asciiArt.join("\n"), []);
	const revealOrder = useMemo(() => {
		const order: number[] = [];
		for (let i = 0; i < flatArt.length; i++) {
			const c = flatArt[i];
			if (c !== " " && c !== "\n") order.push(i);
		}
		return order;
	}, [flatArt]);

	// ASCII reveal state
	const [visibleCount, setVisibleCount] = useState(0);

	// Overlay states
	const [overlayChars, setOverlayChars] = useState(["", "", "", ""]);
	// disintegration states
	const [disintegrateChars, setDisintegrateChars] = useState(["", "", "", ""]);
	const [isDisintegrating, setIsDisintegrating] = useState(false);
	const [overlayDone, setOverlayDone] = useState(false);
	const [showOverlay, setShowOverlay] = useState(false);
	const [visibleOverlayCount, setVisibleOverlayCount] = useState(0);
	const [randomOpacity, setRandomOpacity] = useState([1, 1, 1, 1]);
	const [finalOpacity, setFinalOpacity] = useState([0, 0, 0, 0]);
	const [randomAppear, setRandomAppear] = useState([0, 0, 0, 0]);
	const [hasClicked, setHasClicked] = useState(false);

	// Letter states
	const [revealedLetters, setRevealedLetters] = useState(
		buttonLabels.map(label => Array(label.length).fill(0))
	);

	// Refs
	const containerRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
	const measureWidthRef = useRef<HTMLSpanElement | null>(null);
	const preRef = useRef<HTMLPreElement | null>(null);

	const [charSize, setCharSize] = useState<{ width: number; height: number } | null>(null);

	// Mirrors into refs for animation loop
	const charSizeRef = useRef<typeof charSize>(null);
	const hasClickedRef = useRef(false);
	const lastLettersCountRef = useRef(0);

	useEffect(() => {
		charSizeRef.current = charSize;
	}, [charSize]);

	useEffect(() => {
		hasClickedRef.current = hasClicked;
	}, [hasClicked]);

	useEffect(() => {
		lastLettersCountRef.current = ALL_LETTERS_COUNT - allLetterPositions.filter(p => revealedInstant[p.b][p.j] === 0).length;
	}, []);

	// --------------------------------------------------------------------
	// ASCII REVEAL (STABLE, NO INTERVALS)
	// --------------------------------------------------------------------

	useEffect(() => {
		let frameId = 0;
		let count = 0;
		const total = revealOrder.length;
		const speed = 3; // chars per frame

		function tick() {
			if (count < total) {
				count += speed;
				if (count > total) count = total;
				setVisibleCount(count);
				frameId = requestAnimationFrame(tick);
			}
		}

		frameId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameId);
	}, []);


	// --------------------------------------------------------------------
	// CHARACTER METRICS (CHAR WIDTH/HEIGHT)
	// --------------------------------------------------------------------

	useEffect(() => {
		const mw = measureWidthRef.current;
		if (!mw) return;

		const wRect = mw.getBoundingClientRect();
		const charW = wRect.width / 6;

		const pre = preRef.current;
		if (!pre) return;

		const preRect = pre.getBoundingClientRect();
		const charH = preRect.height / rows;

		setCharSize({ width: charW, height: charH });
	}, [visibleCount]);

	// --------------------------------------------------------------------
	// OVERLAY ANIMATION (ONCE ASCII DONE)
	// --------------------------------------------------------------------

	useEffect(() => {
		if (visibleCount < revealOrder.length) return;

		setShowOverlay(true);

		let step = 0;
		const t = window.setInterval(() => {
			step++;
			setVisibleOverlayCount(step);
			if (step >= 4) window.clearInterval(t);
		}, 100);

		const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/\\@%&";
		const rand = () => pool[Math.floor(Math.random() * pool.length)];

		const timers = [0, 1, 2, 3].map(i => {
			const interval = 140 + Math.random() * 25;
			return window.setInterval(() => {
				setOverlayChars(prev => {
					const c = [...prev];
					c[i] = rand();
					return c;
				});
			}, interval);
		});


		return () => {
			timers.forEach(id => window.clearInterval(id));
			window.clearInterval(t);
		};
		}, [visibleCount, revealOrder.length]);

	function runDisintegration() {
		setIsDisintegrating(true);

		const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/\\@%&";
		const rand = () => pool[Math.floor(Math.random() * pool.length)];

		let frame = 0;
		const maxFrames = 18 + Math.floor(Math.random() * 8); // random duration

		function tick() {
			frame++;

			// random-glyph per letter
			setDisintegrateChars(prev => prev.map(() => rand()));

			if (frame < maxFrames) {
				requestAnimationFrame(tick);
				return;
			}

			// final disappearance
			setDisintegrateChars(["", "", "", ""]);
			setIsDisintegrating(false);
			setOverlayDone(true);

		}

		requestAnimationFrame(tick);
	}

	
	// overlay hover in/out
	function handleEnter() {
		if (hasClicked) return;
		[0, 1, 2, 3].forEach(i => {
			const delay = 200 + Math.random() * 300;
			window.setTimeout(() => {
				setFinalOpacity(o => {
					const c = [...o];
					c[i] = 1;
					return c;
				});
				setRandomOpacity(o => {
					const c = [...o];
					c[i] = 0;
					return c;
				});
			}, delay);
		});
	}

	function handleLeave() {
		if (hasClicked) return;
		[0, 1, 2, 3].forEach(i => {
			const delay = 200 + Math.random() * 300;
			window.setTimeout(() => {
				setFinalOpacity(o => {
					const c = [...o];
					c[i] = 0;
					return c;
				});
				setRandomOpacity(o => {
					const c = [...o];
					c[i] = 1;
					return c;
				});
			}, delay);
		});
	}

	useEffect(() => {
		if (!showOverlay) return;

		setFinalOpacity([0, 0, 0, 0]);
		setRandomOpacity([1, 1, 1, 1]);
		setRandomAppear([0, 0, 0, 0]);

		[0, 1, 2, 3].forEach(i => {
			const delay = 150 + i * 160;
			window.setTimeout(() => {
				setRandomAppear(prev => {
					const c = [...prev];
					c[i] = 1;
					return c;
				});
			}, delay);
		});
	}, [showOverlay]);

	// --------------------------------------------------------------------
	// UNIFIED ANIMATION LOOP (WAVES + FLUID + LETTER REVEAL)
	// --------------------------------------------------------------------

	useEffect(() => {
		// reset revealedInstant cache on mount
		for (let b = 0; b < buttonLabels.length; b++) {
			for (let j = 0; j < buttonLabels[b].length; j++) {
				revealedInstant[b][j] = 0;
			}
		}
		lastLettersCountRef.current = 0;
		setRevealedLetters(buttonLabels.map(label => Array(label.length).fill(0)));
	}, []);

	const animRef = useRef<AnimState>({
		started: false,
		frame: 0,
		waves: [],
		fluidWaves: [],
		nextWaveFrame: 0,
		lettersRevealed: 0,
		fluidMode: false
	});

	function revealNextLetter(state: AnimState) {
		const remaining: Array<{ b: number; j: number }> = [];
		for (let idx = 0; idx < allLetterPositions.length; idx++) {
			const p = allLetterPositions[idx];
			if (revealedInstant[p.b][p.j] === 0) remaining.push(p);
		}
		if (remaining.length === 0) {
			state.fluidMode = true;
			return;
		}

		const pick = remaining[Math.floor(Math.random() * remaining.length)];
		revealedInstant[pick.b][pick.j] = 1;
		state.lettersRevealed++;

		if (state.lettersRevealed !== lastLettersCountRef.current) {
			const clone = buttonLabels.map((label, b) => revealedInstant[b].slice());
			lastLettersCountRef.current = state.lettersRevealed;
			setRevealedLetters(clone);
		}
	}

	useEffect(() => {
		let frameId = 0;

		function loop() {
			const state = animRef.current;
			const cont = containerRef.current;
			const canvas = canvasRef.current;
			const cs = charSizeRef.current;
			const clicked = hasClickedRef.current;

			state.frame++;

			if (canvas && cont && cs && clicked) {
				const rect = cont.getBoundingClientRect();
				canvas.width = rect.width;
				canvas.height = rect.height;

				const ctx = ctxRef.current || canvas.getContext("2d");
				if (!ctx) {
					frameId = requestAnimationFrame(loop);
					return;
				}
				ctxRef.current = ctx;

				const charW = cs.width;
				const charH = cs.height;
				const asciiW = charW * cols;
				const asciiH = charH * rows;
				const startX = (rect.width - asciiW) / 2;
				const startY = (rect.height - asciiH) / 2;
				const maxDist = Math.sqrt(centerCol * centerCol + centerRow * centerRow);

				// initial opacity for active waves / fluid
				canvas.style.opacity = "1";

				ctx.clearRect(0, 0, rect.width, rect.height);
				ctx.save();
				ctx.beginPath();
				ctx.rect(startX, startY, asciiW, asciiH);
				ctx.clip();

				// spawn new waves while letters remain
				if (!state.fluidMode && state.lettersRevealed < ALL_LETTERS_COUNT) {
					if (state.frame >= state.nextWaveFrame && state.waves.length < 6) {
						const spawn = filledCells[Math.floor(Math.random() * filledCells.length)];
						state.waves.push({
							radius: 0,
							originCol: spawn.col,
							originRow: spawn.row
						});

						revealNextLetter(state);

						const baseSpacing = 12;
						const gaussianOffset = Math.max(0, Math.round(gaussianRandom(10, 4)));
						state.nextWaveFrame = state.frame + baseSpacing + gaussianOffset;
					}
				}

				// draw primary waves
				for (let w = 0; w < state.waves.length; w++) {
					const wave = state.waves[w];
					let alpha = Math.pow(1 - wave.radius / maxDist, 1.4);
					if (alpha < 0) alpha = 0;

					for (let row = 0; row < rows; row++) {
						for (let col = 0; col < cols; col++) {
							if (!asciiMask[row][col]) continue;

							let d = Math.sqrt(
								(col - wave.originCol) ** 2 +
								(row - wave.originRow) ** 2
							);

							const wobble =
								Math.sin(row * 0.8 + wave.radius * 0.55) * 0.35 +
								Math.cos(col * 0.6 + wave.radius * 0.45) * 0.35;

							d += wobble;

							const thickness = 0.35;
							if (Math.abs(d - wave.radius) < thickness) {
								const edge = Math.abs(d - wave.radius) / thickness;
								const edgeAlpha = Math.max(0, 1 - edge);

								ctx.fillStyle = `rgba(255,255,255,${alpha * edgeAlpha})`;

								const x = startX + col * charW;
								const y = startY + row * charH;

								ctx.fillRect(x, y, charW + 1, charH + 1);
							}
						}
					}

					wave.radius += 0.55;
				}

				// remove old waves
				state.waves = state.waves.filter(w => w.radius < maxDist * 1.1);

				// if all letters are revealed, enable fluid mode
				if (state.lettersRevealed >= ALL_LETTERS_COUNT) {
					state.fluidMode = true;
				}

				// initialize fluid waves once in fluid mode
				if (state.fluidMode && state.fluidWaves.length === 0) {
					const FLUID_WAVE_COUNT = 5;
					for (let i = 0; i < FLUID_WAVE_COUNT; i++) {
						const spawn = filledCells[Math.floor(Math.random() * filledCells.length)];
						state.fluidWaves.push({
							radius: Math.random() * maxDist,
							originCol: spawn.col,
							originRow: spawn.row
						});
					}
				}

				// draw fluid waves
				if (state.fluidMode) {
					const FLUID_SPEED = 0.22;
					const FLUID_THICKNESS = 0.55;

					for (let w = 0; w < state.fluidWaves.length; w++) {
						const wave = state.fluidWaves[w];

						let alpha = Math.pow(1 - wave.radius / maxDist, 1.8) * 0.25;
						if (alpha < 0) alpha = 0;

						for (let row = 0; row < rows; row++) {
							for (let col = 0; col < cols; col++) {
								if (!asciiMask[row][col]) continue;

								let d = Math.sqrt(
									(col - wave.originCol) ** 2 +
									(row - wave.originRow) ** 2
								);

								const wobble =
									Math.sin(row * 0.8 + wave.radius * 0.55) * 0.45 +
									Math.cos(col * 0.6 + wave.radius * 0.45) * 0.45;

								d += wobble;

								if (Math.abs(d - wave.radius) < FLUID_THICKNESS) {
									const edge = Math.abs(d - wave.radius) / FLUID_THICKNESS;
									const edgeAlpha = Math.max(0, 1 - edge);

									ctx.fillStyle = `rgba(255,255,255,${alpha * edgeAlpha})`;

									const x = startX + col * charW;
									const y = startY + row * charH;

									ctx.fillRect(x, y, charW + 1, charH + 1);
								}
							}
						}

						wave.radius += FLUID_SPEED;

						if (wave.radius > maxDist) {
							const spawn = filledCells[Math.floor(Math.random() * filledCells.length)];
							wave.radius = 0;
							wave.originCol = spawn.col;
							wave.originRow = spawn.row;
						}
					}
				}

				ctx.restore();
			}

			frameId = requestAnimationFrame(loop);
		}

		frameId = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(frameId);
	}, []);

	// --------------------------------------------------------------------
	// CLICK HANDLER (STARTS WAVE ANIMATION + HIDES OVERLAY)
	// --------------------------------------------------------------------

	function handleClick() {
		if (hasClicked) return;
		setHasClicked(true);

		const state = animRef.current;

		if (!state.started) {
			const spawn = filledCells[Math.floor(Math.random() * filledCells.length)];
			state.started = true;
			state.frame = 0;
			state.waves = [
				{
					radius: 0,
					originCol: spawn.col,
					originRow: spawn.row
				}
			];
			state.nextWaveFrame = 10;
			state.lettersRevealed = 0;
			state.fluidMode = false;
		}

		const order = shuffle([0, 1, 2, 3]);
		let maxDelay = 0;

		order.forEach(i => {
			const delay = 200 + Math.random() * 300;
			maxDelay = Math.max(maxDelay, delay);

			window.setTimeout(() => {
				runDisintegration();
			}, delay);
		});

		// menu fade-in is handled via hasClicked state in JSX
	}

	// --------------------------------------------------------------------
	// BUILD FINAL ASCII STRING
	// --------------------------------------------------------------------

	const vis = useMemo(() => new Set(revealOrder.slice(0, visibleCount)), [revealOrder, visibleCount]);
	let revealed = "";

	for (let i = 0; i < flatArt.length; i++) {
		const c = flatArt[i];
		if (c === " ") revealed += " ";
		else if (c === "\n") revealed += "\n";
		else if (vis.has(i)) revealed += c;
		else revealed += " ";
	}

	// --------------------------------------------------------------------
	// RENDER
	// --------------------------------------------------------------------

	return (
		<div className="ascii-container" ref={containerRef}>
			<pre ref={preRef} className="ascii-art">{revealed}</pre>

			<span ref={measureWidthRef} className="measure-width">@@@@@@</span>

			<canvas ref={canvasRef} className="wave-canvas" />

			{showOverlay && !overlayDone &&(
				<div
					className="overlay-chars"
					style={{ pointerEvents: hasClicked ? "none" : "auto" }}
					onMouseEnter={handleEnter}
					onMouseLeave={handleLeave}
					onClick={handleClick}
				>
					{overlayChars.map((rand, i) => {
						const show = i < visibleOverlayCount;
						return (
							<div key={i} className="char-wrap">
								{isDisintegrating ? (
									<span
										className={`${instrument.className} overlay-char`}
										style={{ opacity: show ? 1 : 0 }}
									>
										{disintegrateChars[i]}
									</span>
								) : (
									<>
										<span
											className={`${instrument.className} overlay-char`}
											style={{ opacity: show ? randomOpacity[i] * randomAppear[i] : 0 }}
										>
											{rand}
										</span>

										<span
											className={`${instrument.className} overlay-char`}
											style={{ opacity: show ? finalOpacity[i] : 0 }}
										>
											{finalChars[i]}
										</span>
									</>
								)}

							</div>
						);
					})}
				</div>
			)}

			<div
				className="menu-container"
				style={{
					opacity: hasClicked ? 1 : 0,
					transition: "opacity 0.4s"
				}}
			>
				{buttonLabels.map((label, i) => (
					<button
						key={label}
						className={`${instrument.className} menu-button`}
					>
						{label.split("").map((ch, j) => (
							<span
								key={j}
								style={{
									opacity: revealedLetters[i][j],
									transition: "opacity 0.25s"
								}}
							>
								{ch}
							</span>
						))}
					</button>
				))}
			</div>

			<style jsx>{`
				.ascii-container,
				.ascii-art,
				.wave-canvas,
				.overlay-chars,
				.overlay-char,
				.char-wrap,
				.menu-container,
				.menu-button {
					user-select: none;
				}

				.ascii-container {
					min-height: 100vh;
					display: flex;
					align-items: center;
					justify-content: center;
					background: #fff;
					position: relative;
				}

				.ascii-art {
					font-family: "Fira Code", monospace;
					font-size: 10px;
					line-height: 1.1;
					color: black;
					letter-spacing: 1px;
					white-space: pre;
					text-align: center;
					z-index: 1;
					pointer-events: none;
				}

				.measure-width {
					position: absolute;
					visibility: hidden;
					font-family: "Fira Code", monospace;
					font-size: 10px;
					line-height: 1.1;
					letter-spacing: 1px;
					white-space: pre;
				}

				.wave-canvas {
					position: absolute;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					pointer-events: none;
					opacity: 0;
					transition: opacity 0.2s linear;
					z-index: 5;
				}

				.overlay-chars {
					position: absolute;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					display: flex;
					gap: 24px;
					cursor: pointer;
				}

				.char-wrap {
					position: relative;
					width: 42px;
					height: 42px;
				}

				.overlay-char {
					position: absolute;
					top: 0;
					left: 0;
					font-family: "Instrument Serif", serif;
					font-size: 40px;
					color: black;
				}

				.menu-container {
					position: absolute;
					z-index: 10;
					bottom: 15%;
					left: 50%;
					transform: translateX(-50%);
					display: flex;
					gap: 100px;
				}

				.menu-button {
					z-index: 10;
					background: none;
					border: none;
					font-size: 20px;
					cursor: pointer;
					color: black;
				}
			`}</style>
		</div>
	);
}
