"use client";

import React, { useEffect, useRef, useState } from "react";

//
// ─── CONFIG ───────────────────────────────────────────────────────────────
//
const VIDEO_SRC = "/Videos/output.mp4"; // update to your path
const WIDTH_CHARS = 400;
const TARGET_FPS = 24;
const ASCII_CHARS = " .:-=+*#%@";

export default function Page() {
	const [asciiFrame, setAsciiFrame] = useState<string>("Loading video...");
	const [hasMetadata, setHasMetadata] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState<boolean>(false);

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const rafRef = useRef<number | null>(null);
	const lastTimeRef = useRef<number>(0);

	//
	// ─── CLEANUP ────────────────────────────────────────────────────────────
	//
	useEffect(() => {
		console.log("[INIT] Component mounted");
		return () => {
			console.log("[CLEANUP] component unmounted");
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				console.log("[CLEANUP] canceled RAF");
			}
		};
	}, []);

	//
	// ─── VIDEO METADATA LOADED ──────────────────────────────────────────────
	//
	function handleLoadedMetadata() {
		console.log("[VIDEO] Metadata loaded");
		console.log("[VIDEO] Resolution:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
		setHasMetadata(true);
		setAsciiFrame("Video ready…");
		start();
	}

	//
	// ─── START PLAYBACK ─────────────────────────────────────────────────────
	//
	function start() {
		const video = videoRef.current;
		if (!video) {
			console.warn("[START] videoRef missing");
			return;
		}

		console.log("[START] Attempting autoplay…");

		video.play()
			.then(() => {
				console.log("[START] Autoplay succeeded!");
				setIsPlaying(true);
				startLoop();
			})
			.catch((err) => {
				console.error("[START] Autoplay failed:", err);
				setError("Autoplay was blocked. Click anywhere to allow playback.");
			});
	}

	//
	// ─── RENDER LOOP ─────────────────────────────────────────────────────────
	//
	function startLoop() {
		console.log("[LOOP] Starting ASCII render loop…");

		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) {
			console.error("[LOOP] Missing video or canvas");
			return;
		}

		if (rafRef.current) {
			console.log("[LOOP] Canceling previous RAF before starting new loop");
			cancelAnimationFrame(rafRef.current);
		}

		lastTimeRef.current = 0;

		let frameCount = 0;

		const loop = (timestamp: number) => {
			frameCount++;
			if (frameCount % 30 === 0) console.log("[LOOP] Frame:", frameCount);

			if (!video || !canvas) return;

			// FPS throttle
			if (!lastTimeRef.current) lastTimeRef.current = timestamp;
			const delta = timestamp - lastTimeRef.current;

			if (delta < 1000 / TARGET_FPS) {
				rafRef.current = requestAnimationFrame(loop);
				return;
			}
			lastTimeRef.current = timestamp;

			const vw = video.videoWidth;
			const vh = video.videoHeight;

			if (!vw || !vh) {
				console.warn("[LOOP] Video reports 0 size");
				rafRef.current = requestAnimationFrame(loop);
				return;
			}

			const width = WIDTH_CHARS;
			const charAspect = 0.55;
			const height = Math.round((vh / vw) * width * charAspect);

			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				console.error("[LOOP] Could not get canvas context");
				return;
			}

			try {
				ctx.drawImage(video, 0, 0, width, height);
			} catch (err) {
				console.error("[LOOP] drawImage failed:", err);
				return;
			}

			let data;
			try {
				data = ctx.getImageData(0, 0, width, height).data;
			} catch (err) {
				console.error("[LOOP] getImageData failed:", err);
				return;
			}

			let ascii = "";
			let idx = 0;

			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const r = data[idx];
					const g = data[idx + 1];
					const b = data[idx + 2];

					const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
					const charIndex = Math.floor((ASCII_CHARS.length - 1) * brightness);
					ascii += ASCII_CHARS[charIndex];

					idx += 4;
				}
				ascii += "\n";
			}

			setAsciiFrame(ascii);

			if (!video.paused && !video.ended)
				rafRef.current = requestAnimationFrame(loop);
			else
				console.log("[LOOP] Video paused or ended, stopping loop");
		};

		rafRef.current = requestAnimationFrame(loop);
	}

	//
	// ─── UI ──────────────────────────────────────────────────────────────────
	//
	return (
		<div className="page" onClick={() => !isPlaying && start()}>
			<pre className="ascii">{asciiFrame}</pre>

			{/* hidden rendering engine */}
			<video
				ref={videoRef}
				src={VIDEO_SRC}
				muted
				playsInline
				loop
				onLoadedMetadata={handleLoadedMetadata}
				onLoadStart={() => console.log("[VIDEO] Load start")}
				onCanPlay={() => console.log("[VIDEO] Can play")}
				onCanPlayThrough={() => console.log("[VIDEO] Can play through")}
				onError={(e) => console.error("[VIDEO] Error event:", e)}
				style={{ display: "none" }}
			/>
			<canvas ref={canvasRef} style={{ display: "none" }} />

			{error && <div className="error">{error}</div>}

			<style jsx>{`
				.page {
					min-height: 100vh;
					display: flex;
					align-items: center;
					justify-content: center;
					background: #050608;
					color: #f4f4f4;
					font-family: "SF Mono", "Fira Code", Menlo, Monaco, Consolas, monospace;
					padding: 0;
				}

				.ascii {
				white-space: pre;
				margin: 0;
				font-size: 8px;
				line-height: 1;
				text-align: center;
				user-select: none;      /* ← disable text selection */
				-webkit-user-select: none;
				-moz-user-select: none;
				-ms-user-select: none;
			}


				.error {
					position: absolute;
					bottom: 20px;
					color: #ff7d7d;
					font-size: 14px;
				}
			`}</style>
		</div>
	);
}
