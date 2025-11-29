"use client";

import React, { useEffect, useState } from "react";
import { Instrument_Serif } from "next/font/google";

const instrument = Instrument_Serif({
	subsets: ["latin"],
	weight: ["400"]
});

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

const finalChars = ["W", "A", "Y", "R"];

export default function Page() {

	/* ASCII reveal --------------------------------------------------------- */

	const flatArt = asciiArt.join("\n");
	const revealOrder = [];

	for (let i = 0; i < flatArt.length; i++) {
		if (flatArt[i] !== " " && flatArt[i] !== "\n") revealOrder.push(i);
	}

	const [visibleCount, setVisibleCount] = useState(0);

	useEffect(() => {
		if (visibleCount < revealOrder.length) {
			const timer = setInterval(() => setVisibleCount(v => v + 1), 0);
			return () => clearInterval(timer);
		}
	}, [visibleCount, revealOrder.length]);

	/* Overlay randomizer --------------------------------------------------- */

	const [overlayChars, setOverlayChars] = useState(["", "", "", ""]);
	const [showOverlay, setShowOverlay] = useState(false);
	const [visibleOverlayCount, setVisibleOverlayCount] = useState(0);

	// opacity layers
	const [randomOpacity, setRandomOpacity] = useState([1, 1, 1, 1]);
	const [finalOpacity, setFinalOpacity] = useState([0, 0, 0, 0]);

	// NEW: initial random character appearance stagger
	const [randomAppear, setRandomAppear] = useState([0, 0, 0, 0]);

	useEffect(() => {
		if (visibleCount >= revealOrder.length) {
			setShowOverlay(true);

			let step = 0;
			const revealInterval = setInterval(() => {
				step++;
				setVisibleOverlayCount(step);
				if (step >= 4) clearInterval(revealInterval);
			}, 100);

			const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/\\@%&";
			const randomChar = () => chars[Math.floor(Math.random() * chars.length)];

			const timers = [0, 1, 2, 3].map(i => {
				const interval = 120 + Math.random() * 25;
				return setInterval(() => {
					setOverlayChars(prev => {
						const c = [...prev];
						c[i] = randomChar();
						return c;
					});
				}, interval);
			});

			return () => {
				timers.forEach(t => clearInterval(t));
				clearInterval(revealInterval);
			};
		}
	}, [visibleCount, revealOrder.length]);

	/* INITIAL APPEARANCE STAGGER ----------------------------------------- */

	useEffect(() => {
		if (!showOverlay) return;

		setFinalOpacity([0, 0, 0, 0]);
		setRandomOpacity([1, 1, 1, 1]);

		// stagger random characters IN
		[0, 1, 2, 3].forEach(i => {
			const delay = 120 + i * 160;
			setTimeout(() => {
				setRandomAppear(prev => {
					const c = [...prev];
					c[i] = 1;
					return c;
				});
			}, delay);
		});
	}, [showOverlay]);

	/* Hover logic ---------------------------------------------------------- */

	function handleEnter() {
		[0, 1, 2, 3].forEach(i => {
			const delay = 200 + Math.random() * 300;
			setTimeout(() => {
				setFinalOpacity(prev => {
					const c = [...prev];
					c[i] = 1;
					return c;
				});
				setRandomOpacity(prev => {
					const c = [...prev];
					c[i] = 0;
					return c;
				});
			}, delay);
		});
	}

	function handleLeave() {
		[0, 1, 2, 3].forEach(i => {
			const delay = 200 + Math.random() * 300;
			setTimeout(() => {
				setFinalOpacity(prev => {
					const c = [...prev];
					c[i] = 0;
					return c;
				});
				setRandomOpacity(prev => {
					const c = [...prev];
					c[i] = 1;
					return c;
				});
			}, delay);
		});
	}

	/* Build ASCII reveal --------------------------------------------------- */

	const visibleIndices = new Set(revealOrder.slice(0, visibleCount));
	let revealed = "";

	for (let i = 0; i < flatArt.length; i++) {
		const c = flatArt[i];
		if (c === " ") revealed += " ";
		else if (c === "\n") revealed += "\n";
		else if (visibleIndices.has(i)) revealed += c;
		else revealed += " ";
	}

	/* Render --------------------------------------------------------------- */

	return (
		<div className="ascii-container">
			<pre className="ascii-art">{revealed}</pre>

			{showOverlay && (
				<div
					className="overlay-chars"
					onMouseEnter={handleEnter}
					onMouseLeave={handleLeave}
				>
					{overlayChars.map((rand, i) => (
						<div key={i} className="char-wrap">
							{/* RANDOM LAYER */}
							<span
								className={`${instrument.className} overlay-char rand-layer`}
								style={{ opacity: randomOpacity[i] * randomAppear[i] }}
							>
								{rand}
							</span>

							{/* FINAL LAYER */}
							<span
								className={`${instrument.className} overlay-char final-layer`}
								style={{ opacity: finalOpacity[i] }}
							>
								{finalChars[i]}
							</span>
						</div>
					))}
				</div>
			)}

			<style jsx>{`
				.overlay-chars,
				.overlay-char,
				.char-wrap,
				.ascii-art {
					user-select: none;
				}

				.overlay-chars {
					position: absolute;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					display: flex;
					gap: 24px;
					pointer-events: auto;
					z-index: 10;
				}

				.char-wrap {
					position: relative;
					width: 30px; /* serif needs more width */
					height: 42px;
				}

				.overlay-char {
					position: absolute;
					top: 0;
					left: 0;
					font-family: "Instrument Serif", serif;
					font-size: 40px;
					color: black;
					transition: opacity 0s;
				}

				.ascii-container {
					min-height: 100vh;
					display: flex;
					align-items: center;
					justify-content: center;
					background: #fff;
				}

				.ascii-art {
					font-family: "Fira Code", monospace;
					font-size: 10px;
					color: #ccc;
					line-height: 1.1;
					letter-spacing: 1px;
					text-align: center;
				}
			`}</style>
		</div>
	);
}
