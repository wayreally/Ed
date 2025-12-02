"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
	"                                       @@@@@@@@@@@@@@@@@@@@@@@@@                                    ",
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

const rows = asciiArt.length;
const cols = Math.max(...asciiArt.map(row => row.length));

const asciiMask = asciiArt.map(r => r.split("").map(ch => ch !== " "));

// Flattened mask for fluid simulation (1 = fluid, 0 = wall)
const flatMask = new Uint8Array(rows * cols);
for (let row = 0; row < rows; row++) {
	for (let col = 0; col < cols; col++) {
		const idx = row * cols + col;
		const cell = asciiMask[row][col];
		flatMask[idx] = cell ? 1 : 0;
	}
}

// --------------------------------------------------------------------
// Filled cells (used for splash spawn locations)
// --------------------------------------------------------------------

const filledCells: Array<{ col: number; row: number }> = [];

for (let row = 0; row < rows; row++) {
	for (let col = 0; col < cols; col++) {
		if (asciiMask[row][col]) {
			filledCells.push({ col, row });
		}
	}
}

// --------------------------------------------------------------------
// Overlay text + menu
// --------------------------------------------------------------------

const finalChars = ["W", "A", "Y", "R"];
const buttonLabels = ["HOME", "ABOUT", "PROJECTS", "CONTACT"];

const allLetterPositions: Array<{ b: number; j: number }> = [];

for (let b = 0; b < buttonLabels.length; b++) {
	for (let j = 0; j < buttonLabels[b].length; j++) {
		allLetterPositions.push({ b, j });
	}
}

const ALL_LETTERS_COUNT = allLetterPositions.length;

// --------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------

function gaussianRandom(mean = 0, stdev = 1) {
	let u = 0, v = 0;
	while (u === 0) u = Math.random();
	while (v === 0) v = Math.random();
	return (
		mean +
		stdev *
			Math.sqrt(-2.0 * Math.log(u)) *
			Math.cos(2 * Math.PI * v)
	);
}

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// Wave equation tuning
const WAVE_STIFFNESS = 0.045;	// how fast waves propagate
const WAVE_DAMPING = 0.98;		// energy loss per step
const WAVE_INTENSITY_SCALE = 0.22;	// brightness from height
const WAVE_ALPHA_THRESHOLD = 0.01;	// skip very small ripples

type AnimState = {
	started: boolean;
	frame: number;
	lettersRevealed: number;
	fluidMode: boolean;
	height: Float32Array | null;
	velocity: Float32Array | null;
	heightScratch: Float32Array | null;
	nextSplashFrame: number;
};

export default function Page() {
	const router = useRouter();

	// Flatten ASCII + reveal order
	const flatArt = useMemo(() => asciiArt.join("\n"), []);
	const revealOrder = useMemo(() => {
		const order: number[] = [];
		for (let i = 0; i < flatArt.length; i++) {
			const c = flatArt[i];
			if (c !== " " && c !== "\n") order.push(i);
		}
		return order;
	}, [flatArt]);

	const [visibleCount, setVisibleCount] = useState(0);

	// WAYR overlay
	const [overlayChars, setOverlayChars] = useState(["", "", "", ""]);
	const [showOverlay, setShowOverlay] = useState(false);
	const [visibleOverlayCount, setVisibleOverlayCount] = useState(0);
	const [randomOpacity, setRandomOpacity] = useState([1, 1, 1, 1]);
	const [finalOpacity, setFinalOpacity] = useState([0, 0, 0, 0]);
	const [randomAppear, setRandomAppear] = useState([0, 0, 0, 0]);
	const [hasClicked, setHasClicked] = useState(false);

	// Menu reveal
	const [revealedLetters, setRevealedLetters] = useState(
		buttonLabels.map(lbl => Array(lbl.length).fill(0))
	);
	const revealedInstant = useRef(
		buttonLabels.map(lbl => Array(lbl.length).fill(0))
	);

	// Exit
	const [isExiting, setIsExiting] = useState(false);
	const isExitingRef = useRef(false);

	useEffect(() => {
		isExitingRef.current = isExiting;
	}, [isExiting]);

	const [revealed, setRevealed] = useState(() =>
		flatArt.replace(/[^\n]/g, " ")
	);
	const exitAsciiRef = useRef<string[] | null>(null);

	// Waves allowed only after WAYR click
	const wavesStartedRef = useRef(false);

	// Refs
	const containerRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
	const measureWidthRef = useRef<HTMLSpanElement | null>(null);
	const preRef = useRef<HTMLPreElement | null>(null);

	const [charSize, setCharSize] = useState<{ width: number; height: number } | null>(null);
	const charSizeRef = useRef(charSize);

	useEffect(() => {
		charSizeRef.current = charSize;
	}, [charSize]);

	const animRef = useRef<AnimState>({
		started: false,
		frame: 0,
		lettersRevealed: 0,
		fluidMode: false,
		height: null,
		velocity: null,
		heightScratch: null,
		nextSplashFrame: 0
	});

	// Utility to ensure wave buffers exist
	function ensureWaveBuffers() {
		const state = animRef.current;
		const size = rows * cols;

		if (!state.height || state.height.length !== size) {
			state.height = new Float32Array(size);
		}
		if (!state.velocity || state.velocity.length !== size) {
			state.velocity = new Float32Array(size);
		}
		if (!state.heightScratch || state.heightScratch.length !== size) {
			state.heightScratch = new Float32Array(size);
		}
	}

	// Inject a splash into the wave field
	function injectSplashAt(col: number, row: number, magnitude: number) {
		const state = animRef.current;
		if (!state.height || !state.velocity) return;

		if (row < 0 || row >= rows || col < 0 || col >= cols) return;

		const idx = row * cols + col;
		if (!flatMask[idx]) return;

		state.velocity[idx] += magnitude;
	}

	// ASCII reveal
	useEffect(() => {
		let frameId = 0;
		let count = 0;
		const total = revealOrder.length;

		function tick() {
			if (count < total) {
				count += 3;
				if (count > total) count = total;
				setVisibleCount(count);
				frameId = requestAnimationFrame(tick);
			}
		}

		frameId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameId);
	}, [revealOrder.length]);

	// Character measurement
	useEffect(() => {
		const mw = measureWidthRef.current;
		if (!mw) return;

		const rect = mw.getBoundingClientRect();
		const w = rect.width / 6;

		const pre = preRef.current;
		if (!pre) return;

		const h = pre.getBoundingClientRect().height / rows;

		setCharSize({ width: w, height: h });
	}, [visibleCount]);

	// Overlay reveal
	useEffect(() => {
		if (visibleCount < revealOrder.length) return;

		setShowOverlay(true);

		let step = 0;
		const t = window.setInterval(() => {
			step++;
			setVisibleOverlayCount(step);
			if (step >= 4) window.clearInterval(t);
		}, 100);

		return () => window.clearInterval(t);
	}, [visibleCount, revealOrder.length]);

	// Overlay random characters
	useEffect(() => {
		if (!showOverlay) return;

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

		return () => timers.forEach(id => window.clearInterval(id));
	}, [showOverlay]);

	function handleEnter() {
		if (hasClicked) return;

		[0, 1, 2, 3].forEach(i => {
			const d = 200 + Math.random() * 300;
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
			}, d);
		});
	}

	function handleLeave() {
		if (hasClicked) return;

		[0, 1, 2, 3].forEach(i => {
			const d = 200 + Math.random() * 300;
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
			}, d);
		});
	}

	useEffect(() => {
		if (!showOverlay) return;

		setFinalOpacity([0, 0, 0, 0]);
		setRandomOpacity([1, 1, 1, 1]);
		setRandomAppear([0, 0, 0, 0]);

		[0, 1, 2, 3].forEach(i => {
			const d = 150 + i * 160;
			window.setTimeout(() => {
				setRandomAppear(prev => {
					const c = [...prev];
					c[i] = 1;
					return c;
				});
			}, d);
		});
	}, [showOverlay]);

	function revealNextLetter(state: AnimState) {
		const remaining: Array<{ b: number; j: number }> = [];

		for (let idx = 0; idx < allLetterPositions.length; idx++) {
			const p = allLetterPositions[idx];
			if (revealedInstant.current[p.b][p.j] === 0) remaining.push(p);
		}

		if (remaining.length === 0) {
			state.fluidMode = true;
            let stiffness = WAVE_STIFFNESS;
            let damping = WAVE_DAMPING;

            if (state.fluidMode) {
                // more energetic waves once everything appears
                stiffness = 0.5;  
                damping = 0.8;
            }
			return;
		}

		const pick = remaining[Math.floor(Math.random() * remaining.length)];

		revealedInstant.current[pick.b][pick.j] = 1;
		state.lettersRevealed++;

		setRevealedLetters(
			buttonLabels.map((lbl, b) =>
				revealedInstant.current[b].slice()
			)
		);

		// Link each new letter to a splash in the fluid
		if (filledCells.length > 0) {
			const spawn =
				filledCells[
					Math.floor(Math.random() * filledCells.length)
				];
			injectSplashAt(spawn.col, spawn.row, 0.7);
		}
	}

	// Wave animation loop (heightmap + reflection)
	useEffect(() => {
		let frameId = 0;

		function loop() {
			const cont = containerRef.current;
			const canvas = canvasRef.current;
			const cs = charSizeRef.current;

			if (!cont || !canvas || !cs) {
				frameId = requestAnimationFrame(loop);
				return;
			}

			const ctx =
				ctxRef.current ?? canvas.getContext("2d");

			if (!ctx) {
				frameId = requestAnimationFrame(loop);
				return;
			}

			if (!ctxRef.current) ctxRef.current = ctx;

			const rect = cont.getBoundingClientRect();
			canvas.width = rect.width;
			canvas.height = rect.height;

			const state = animRef.current;

			if (isExitingRef.current) {
				canvas.style.opacity = "0";
				ctx.clearRect(0, 0, rect.width, rect.height);
				frameId = requestAnimationFrame(loop);
				return;
			}

			if (!state.started || !wavesStartedRef.current) {
				canvas.style.opacity = "0";
				ctx.clearRect(0, 0, rect.width, rect.height);
				frameId = requestAnimationFrame(loop);
				return;
			}

			ensureWaveBuffers();

			state.frame++;

			const charW = cs.width;
			const charH = cs.height;

			const asciiW = charW * cols;
			const asciiH = charH * rows;

			const startX = (rect.width - asciiW) / 2;
			const startY = (rect.height - asciiH) / 2;

			canvas.style.opacity = "1";

			ctx.clearRect(0, 0, rect.width, rect.height);

			ctx.save();
			ctx.beginPath();
			ctx.rect(startX, startY, asciiW, asciiH);
			ctx.clip();

			// ----------------------------------------------------------------
			// Random idle splashes once fluidMode is active
			// ----------------------------------------------------------------
			if (state.fluidMode && state.frame >= state.nextSplashFrame) {
				if (filledCells.length > 0) {
					const burstCount = 1 + Math.floor(Math.random() * 3);
					for (let i = 0; i < burstCount; i++) {
						const spawn =
							filledCells[
								Math.floor(
									Math.random() * filledCells.length
								)
							];
						const mag = 0.8 + Math.random() * 0.15;
						injectSplashAt(spawn.col, spawn.row, mag);
					}
				}

				const baseDelay = 75;
				const jitter = Math.max(
					4,
					Math.round(gaussianRandom(24, 10))
				);
				state.nextSplashFrame = state.frame + baseDelay + jitter;
			}

			// ----------------------------------------------------------------
			// Wave equation step with reflection on non-ASCII cells
			// ----------------------------------------------------------------
			const height = state.height!;
			const velocity = state.velocity!;
			const hNew = state.heightScratch!;

			for (let row = 0; row < rows; row++) {
				for (let col = 0; col < cols; col++) {
					const idx = row * cols + col;

					// Non-ASCII cells act as solid walls (no fluid)
					if (!flatMask[idx]) {
						hNew[idx] = 0;
						velocity[idx] = 0;
						continue;
					}

					const center = height[idx];

					let sum = 0;
					let count = 0;

					// Up
					if (row > 0) {
						const nIdx = (row - 1) * cols + col;
						if (flatMask[nIdx]) {
							sum += height[nIdx];
						} else {
							sum += center;
						}
					} else {
						sum += center;
					}
					count++;

					// Down
					if (row < rows - 1) {
						const nIdx = (row + 1) * cols + col;
						if (flatMask[nIdx]) {
							sum += height[nIdx];
						} else {
							sum += center;
						}
					} else {
						sum += center;
					}
					count++;

					// Left
					if (col > 0) {
						const nIdx = row * cols + (col - 1);
						if (flatMask[nIdx]) {
							sum += height[nIdx];
						} else {
							sum += center;
						}
					} else {
						sum += center;
					}
					count++;

					// Right
					if (col < cols - 1) {
						const nIdx = row * cols + (col + 1);
						if (flatMask[nIdx]) {
							sum += height[nIdx];
						} else {
							sum += center;
						}
					} else {
						sum += center;
					}
					count++;

					const neighborAvg = sum / count;
					const laplacian = neighborAvg - center;
                    let stiffness = WAVE_STIFFNESS;
                    let damping = WAVE_DAMPING;
					let v = velocity[idx] + laplacian * stiffness;
                    v *= damping;

                    
                    if (v > 1.25) v = 1.25;
                    if (v < -1.25) v = -1.25;

					const hVal = center + v;

                    let hClamped = hVal;
                    if (hClamped > 0.8) hClamped = 0.8;
                    if (hClamped < -0.8) hClamped = -0.8;

                    hNew[idx] = hClamped;


					velocity[idx] = v;
					hNew[idx] = hVal;
				}
			}

			// Swap buffers
			state.height = hNew;
			state.heightScratch = height;

			const activeHeight = state.height!;

			// ----------------------------------------------------------------
			// Render highlight intensity from wave height
			// ----------------------------------------------------------------
			for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const idx = row * cols + col;
                    if (!flatMask[idx]) continue;

                    const x = startX + col * charW;
                    const y = startY + row * charH;

                    // get local wave velocity instead of height
                    const v = velocity[idx];

                    // only show sharp wave peaks
                    if (state.fluidMode) {
                        if (v > 0.03 && v <0.08) {
                        ctx.fillStyle = "rgba(255,255,255,1)";
                        ctx.fillRect(x, y, charW, charH);
                    }
                    }
                    if (!state.fluidMode) {
                        if (v > 0.03) {
                        ctx.fillStyle = "rgba(255,255,255,1)";
                        ctx.fillRect(x, y, charW, charH);
                    }
                    }
                    
                }
            }


			ctx.restore();

			frameId = requestAnimationFrame(loop);
		}

		frameId = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(frameId);
	}, []);

    function scheduleMenuReveal() {
	const state = animRef.current;

	if (state.lettersRevealed >= ALL_LETTERS_COUNT) {
		// when all letters are shown, go into idle/shimmer mode
		state.fluidMode = true;
		return;
	}

	// reveal one random letter
	revealNextLetter(state);

	// schedule the next letter reveal
	const delay = 80 + Math.random() * 90;
	window.setTimeout(scheduleMenuReveal, delay);
}


	function handleClick() {
	if (hasClicked) return;
	setHasClicked(true);

	const state = animRef.current;

	if (!state.started) {
		state.started = true;

		// begin with a single splash at click time
		if (filledCells.length) {
			const p = filledCells[Math.floor(Math.random() * filledCells.length)];
			injectSplashAt(p.col, p.row, 0.7);
		}

		state.frame = 0;
		state.lettersRevealed = 0;			// <— restore reveal-from-zero
		state.fluidMode = false;			// <— only after all letters appear
		state.nextSplashFrame = 0;

		ensureWaveBuffers();
		if (state.height && state.velocity) {
			state.height.fill(0);
			state.velocity.fill(0);
		}

		// kick off the old random reveal sequence
		scheduleMenuReveal();				// <— this was missing
	}

	wavesStartedRef.current = true;

	// Fade WAYR chars
	[0, 1, 2, 3].forEach(i => {
		const d = 200 + Math.random() * 300;
		window.setTimeout(() => {
			setFinalOpacity(o => {
				const c = [...o];
				c[i] = 0;
				return c;
			});
			setRandomOpacity(o => {
				const c = [...o];
				c[i] = 0;
				return c;
			});
		}, d);
	});
}



	type ExitItem =
		| { type: "ascii"; i: number }
		| { type: "menu"; b: number; j: number };

	function startExitDisintegration(target: string) {
		if (isExitingRef.current) return;

		setIsExiting(true);
		isExitingRef.current = true;

		const visSet = new Set(revealOrder.slice(0, visibleCount));

		const visibleAsciiItems: ExitItem[] = [];
		for (let i = 0; i < flatArt.length; i++) {
			if (visSet.has(i)) {
				visibleAsciiItems.push({ type: "ascii", i });
			}
		}

		const visibleMenu: ExitItem[] = [];

		for (let b = 0; b < revealedLetters.length; b++) {
			for (let j = 0; j < revealedLetters[b].length; j++) {
				if (revealedLetters[b][j] === 1) {
					visibleMenu.push({ type: "menu", b, j });
				}
			}
		}

		const combined = [...visibleAsciiItems, ...visibleMenu];
		const list = shuffle(combined);

		const asciiInitial = buildCurrentAscii(visSet);
		exitAsciiRef.current = asciiInitial.split("");

		let idx = 0;

		function tick() {
			const asciiBuf = exitAsciiRef.current;
			if (!asciiBuf) return;

			for (let k = 0; k < 6 && idx < list.length; k++) {
				const item = list[idx];

				if (item.type === "ascii") {
					asciiBuf[item.i] = " ";
				} else {
					revealedInstant.current[item.b][item.j] = 0;
				}

				idx++;
			}

			setRevealed(asciiBuf.join(""));
			setRevealedLetters(
				buttonLabels.map((lbl, b) =>
					revealedInstant.current[b].slice()
				)
			);

			if (idx < list.length) {
				requestAnimationFrame(tick);
			} else {
				router.push(target);
			}
		}

		requestAnimationFrame(tick);
	}

	function buildCurrentAscii(visSet: Set<number>) {
		let out = "";
		for (let i = 0; i < flatArt.length; i++) {
			const c = flatArt[i];
			if (c === "\n") out += "\n";
			else if (c === " ") out += " ";
			else if (visSet.has(i)) out += c;
			else out += " ";
		}
		return out;
	}

	useEffect(() => {
		if (isExitingRef.current) return;

		const vis = new Set(revealOrder.slice(0, visibleCount));
		setRevealed(buildCurrentAscii(vis));
	}, [visibleCount, revealOrder, flatArt]);

	// --------------------------------------------------------------------
	// WAYR OVERLAY POSITION — PURE CENTERING
	// --------------------------------------------------------------------

	const starPos = {
		x: "50%",
		y: "50%"
	};

	// --------------------------------------------------------------------
	// RENDER
	// --------------------------------------------------------------------

	return (
		<div className="ascii-container" ref={containerRef}>
			<pre ref={preRef} className="ascii-art">{revealed}</pre>

			<span ref={measureWidthRef} className="measure-width">@@@@@@</span>

			<canvas ref={canvasRef} className="wave-canvas" />

			{showOverlay && (
				<div
					className="overlay-chars"
					style={{
						position: "absolute",
						left: starPos.x,
						top: starPos.y,
						transform: "translate(-50%, -50%)",
						pointerEvents: hasClicked ? "none" : "auto"
					}}
					onMouseEnter={handleEnter}
					onMouseLeave={handleLeave}
					onClick={handleClick}
				>
					{overlayChars.map((rand, i) => {
						const show = i < visibleOverlayCount;

						return (
							<div key={i} className="char-wrap">
								<span
									className={`${instrument.className} overlay-char`}
									style={{
										opacity: show
											? randomOpacity[i] * randomAppear[i]
											: 0
									}}
								>
									{rand}
								</span>

								<span
									className={`${instrument.className} overlay-char`}
									style={{
										opacity: show ? finalOpacity[i] : 0
									}}
								>
									{finalChars[i]}
								</span>
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
				{buttonLabels.map((label, i) => {
					let target = "/home";
					if (label === "ABOUT") target = "/about";
					else if (label === "PROJECTS") target = "/projects";
					else if (label === "CONTACT") target = "/contact";

					return (
						<button
							key={label}
							className={`${instrument.className} menu-button`}
							onClick={() => startExitDisintegration(target)}
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
					);
				})}
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
                    letter-spacing: 1px;
					font-size: 10px;
					line-height: 1.1;
					color: rgba(99, 99, 99, 1);
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
					display: flex;
					gap: 24px;
					cursor: pointer;
					position: absolute;
				}

				.char-wrap {
					position: relative;
					width: 42px;
					height: 42px;
				}

				.overlay-char {
					font-family: "Instrument Serif", serif;
					font-size: 40px;
					color: black;
					position: absolute;
					left: 50%;
					top: 50%;
					transform: translate(-50%, -50%);
				}

				.menu-container {
					position: absolute;
					z-index: 10;
					bottom: 15%;
					left: 51%;
					transform: translateX(-50%);
					display: flex;
					gap: 100px;
				}

				.menu-button {
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
