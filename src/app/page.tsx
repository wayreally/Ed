"use client";

import React, { useEffect, useRef, useState } from "react";
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

// Flatten letters for reveal queue
const buttonLetterQueue = buttonLabels.join("").split("");

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
// COMPONENT
// --------------------------------------------------------------------

export default function Page() {

	// ASCII reveal
	const flatArt = asciiArt.join("\n");
	const revealOrder: number[] = [];
	for (let i = 0; i < flatArt.length; i++) {
		const c = flatArt[i];
		if (c !== " " && c !== "\n") revealOrder.push(i);
	}

	const [visibleCount, setVisibleCount] = useState(0);
	useEffect(() => {
		if (visibleCount < revealOrder.length) {
			const t = window.setInterval(() => {
				setVisibleCount(v => v + 1);
			}, 0);
			return () => window.clearInterval(t);
		}
	}, [visibleCount, revealOrder.length]);

	// Overlay
	const [overlayChars, setOverlayChars] = useState(["", "", "", ""]);
	const [showOverlay, setShowOverlay] = useState(false);
	const [visibleOverlayCount, setVisibleOverlayCount] = useState(0);
	const [randomOpacity, setRandomOpacity] = useState([1, 1, 1, 1]);
	const [finalOpacity, setFinalOpacity] = useState([0, 0, 0, 0]);
	const [randomAppear, setRandomAppear] = useState([0, 0, 0, 0]);

	const [hasClicked, setHasClicked] = useState(false);

	// Letter-by-letter reveal
	const [revealedLetters, setRevealedLetters] = useState(
		buttonLabels.map(label => Array(label.length).fill(0))
	);
	const letterIndex = useRef(0);

	// Refs
	const containerRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
	const measureWidthRef = useRef<HTMLSpanElement | null>(null);
	const preRef = useRef<HTMLPreElement | null>(null);

	const [charSize, setCharSize] = useState<{ width: number; height: number } | null>(null);

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

	// Overlay animations
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
			timers.forEach(t => clearInterval(t));
			clearInterval(t);
		};

	}, [visibleCount]);

	useEffect(() => {
		if (!showOverlay) return;

		setFinalOpacity([0, 0, 0, 0]);
		setRandomOpacity([1, 1, 1, 1]);

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

	function handleEnter() {
		if (hasClicked) return;
		[0, 1, 2, 3].forEach(i => {
			const delay = 200 + Math.random() * 300;
			window.setTimeout(() => {
				setFinalOpacity(o => { const c = [...o]; c[i] = 1; return c; });
				setRandomOpacity(o => { const c = [...o]; c[i] = 0; return c; });
			}, delay);
		});
	}

	function handleLeave() {
		if (hasClicked) return;
		[0, 1, 2, 3].forEach(i => {
			const delay = 200 + Math.random() * 300;
			window.setTimeout(() => {
				setFinalOpacity(o => { const c = [...o]; c[i] = 0; return c; });
				setRandomOpacity(o => { const c = [...o]; c[i] = 1; return c; });
			}, delay);
		});
	}

	// --------------------------------------------------------------------
	// Wave logic + letter reveal
	// --------------------------------------------------------------------

	function startAsciiWave() {

		const cont = containerRef.current;
		const canvas = canvasRef.current;
		if (!cont || !canvas) return;

		const rect = cont.getBoundingClientRect();
		canvas.width = rect.width;
		canvas.height = rect.height;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctxRef.current = ctx;

		if (!charSize) return;

		const charW = charSize.width;
		const charH = charSize.height;

		const asciiW = charW * cols;
		const asciiH = charH * rows;

		const startX = (rect.width - asciiW) / 2;
		const startY = (rect.height - asciiH) / 2;

		const maxDist = Math.sqrt(centerCol ** 2 + centerRow ** 2);

		const thickness = 0.35;
		const waveCount = 6;

		const baseSpacing = 36;
		let nextWaveAt = baseSpacing + Math.max(0, Math.round(gaussianRandom(10, 4)));
		let inDoubleDrop = false;

		let waves: Array<{ radius: number; originCol: number; originRow: number }> = [];

		// First wave spawn
		const firstSpawn = filledCells[Math.floor(Math.random() * filledCells.length)];
		waves.push({
			radius: 0,
			originCol: firstSpawn.col,
			originRow: firstSpawn.row
		});

		revealNextLetter();

		canvas.style.opacity = "1";

		function revealNextLetter() {
			const idx = letterIndex.current;
			if (idx >= buttonLetterQueue.length) return;

			let remaining = idx;

			for (let b = 0; b < buttonLabels.length; b++) {
				const label = buttonLabels[b];

				if (remaining < label.length) {
					setRevealedLetters(prev => {
						const c = prev.map(a => [...a]);
						c[b][remaining] = 1;
						return c;
					});
					break;
				}
				remaining -= label.length;
			}

			letterIndex.current++;
		}

		let frameCounter = 0;

		function frame() {

			const ctx = ctxRef.current;
			const canvas = canvasRef.current;
			if (!ctx || !canvas) return;

			ctx.clearRect(0, 0, rect.width, rect.height);

			ctx.save();
			ctx.beginPath();
			ctx.rect(startX, startY, asciiW, asciiH);
			ctx.clip();

			frameCounter++;

			// New wave spawn
			if (frameCounter >= nextWaveAt && waves.length < waveCount) {

				const spawn = filledCells[Math.floor(Math.random() * filledCells.length)];

				waves.push({
					radius: 0,
					originCol: spawn.col,
					originRow: spawn.row
				});

				revealNextLetter();

				if (!inDoubleDrop && Math.random() < 0.3) {
					inDoubleDrop = true;
					nextWaveAt = frameCounter + 4 + Math.floor(Math.random() * 4);
					ctx.restore();
					return requestAnimationFrame(frame);
				}

				inDoubleDrop = false;
				const gaussianOffset = Math.max(0, Math.round(gaussianRandom(10, 4)));
				nextWaveAt = frameCounter + baseSpacing + gaussianOffset;
			}

			// Draw wave rings
			for (let w = 0; w < waves.length; w++) {
				const wave = waves[w];

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

			ctx.restore();

			waves = waves.filter(w => w.radius < maxDist + thickness);

			if (waves.length > 0) requestAnimationFrame(frame);
			else canvas.style.opacity = "0";
		}

		requestAnimationFrame(frame);
	}

	// Click triggers waves
	function handleClick() {
		if (hasClicked) return;
		setHasClicked(true);

		const order = shuffle([0, 1, 2, 3]);
		let maxDelay = 0;

		order.forEach(i => {
			const delay = 200 + Math.random() * 300;
			maxDelay = Math.max(maxDelay, delay);

			window.setTimeout(() => {
				setFinalOpacity(o => { const c = [...o]; c[i] = 0; return c; });
				setRandomOpacity(o => { const c = [...o]; c[i] = 0; return c; });
			}, delay);
		});

		window.setTimeout(() => startAsciiWave(), maxDelay + 100);
	}

	// Build ASCII
	const vis = new Set(revealOrder.slice(0, visibleCount));
	let revealed = "";

	for (let i = 0; i < flatArt.length; i++) {
		const c = flatArt[i];
		if (c === " ") revealed += " ";
		else if (c === "\n") revealed += "\n";
		else if (vis.has(i)) revealed += c;
		else revealed += " ";
	}

	// --------------------------------------------------------------------
	// Render
	// --------------------------------------------------------------------

	return (
		<div className="ascii-container" ref={containerRef}>

			<pre ref={preRef} className="ascii-art">{revealed}</pre>

			<span ref={measureWidthRef} className="measure-width">@@@@@@</span>

			<canvas ref={canvasRef} className="wave-canvas" />

			{showOverlay && !hasClicked && (
				<div
					className="overlay-chars"
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
							</div>
						);
					})}
				</div>
			)}

			{/* Option A: menu always visible once clicked */}
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
					bottom: 15%;
					left: 50%;
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
