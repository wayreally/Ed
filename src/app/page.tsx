"use client";

import React, { useEffect, useState } from "react";

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
  
const entryText = "WAYR";

export default function Page() {

	// Flatten ASCII including newlines
	const flatArt = asciiArt.join("\n");
  
	// Build list of indices for NON-space characters only
	const revealOrder = [];
	for (let i = 0; i < flatArt.length; i++) {
	  const c = flatArt[i];
	  if (c !== " " && c !== "\n") {
		revealOrder.push(i);
	  }
	}
  
	const [visibleCount, setVisibleCount] = useState(0);
  
	useEffect(() => {
	  if (visibleCount < revealOrder.length) {
		const timer = setInterval(() => {
		  setVisibleCount(v => v + 1);
		}, 0);
		return () => clearInterval(timer);
	  }
	}, [visibleCount, revealOrder.length]);

	// After ASCII finishes revealing
	const [overlayChars, setOverlayChars] = useState(["", "", "", ""]);
	const [showOverlay, setShowOverlay] = useState(false);
	const [visibleOverlayCount, setVisibleOverlayCount] = useState(0);
	
	useEffect(() => {
		if (visibleCount >= revealOrder.length) {
		  setShowOverlay(true);
	  
		  // Reveal characters left → right
		  let step = 0;
		  const revealInterval = setInterval(() => {
			step++;
			setVisibleOverlayCount(step);
			if (step >= 4) clearInterval(revealInterval);
		  }, 100); // speed of left→right appearance
	  
		  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/\\@%&";
		  const randomChar = () => chars[Math.floor(Math.random() * chars.length)];
	  
		  // Independent timers for randomization
		  const timers = [...Array(4)].map((_, i) => {
			const intervalTime = 120 + Math.random() * 25;
			return setInterval(() => {
			  setOverlayChars(prev => {
				const copy = [...prev];
				copy[i] = randomChar();
				return copy;
			  });
			}, intervalTime);
		  });
	  
		  return () => {
			timers.forEach(t => clearInterval(t));
		  };
		}
	  }, [visibleCount, revealOrder.length]);
  
	// Set for O(1) membership check
	const visibleIndices = new Set(revealOrder.slice(0, visibleCount));
  
	// Build final output exactly position-by-position
	let revealed = "";
	for (let i = 0; i < flatArt.length; i++) {
	  const c = flatArt[i];
	  
	  if (c === " ") {
		revealed += " ";         // spaces always visible instantly
	  } else if (c === "\n") {
		revealed += "\n";        // preserve newlines exactly
	  } else if (visibleIndices.has(i)) {
		revealed += c;           // reveal this character
	  } else {
		revealed += " ";         // hide unrevealed non-space character
	  }
	}
  
	return (
	  <div className="ascii-container">
		<pre className="ascii-art">{revealed}</pre>
		{showOverlay && (
		<div className="overlay-chars">
			{overlayChars.map((c, i) => (
			i < visibleOverlayCount ? (
				<span key={i} className="overlay-char">{c}</span>
			) : (
				<span key={i} className="overlay-char" style={{ opacity: 0 }}></span>
			)
			))}
		</div>
		)}
		<style jsx>{`
		 .overlay-chars {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			display: flex;
			gap: 20px;
			pointer-events: none;
			z-index: 10;
		  }
		  
		  .overlay-char {
			font-family: monospace;
			color: black;
			font-size: 20px;
			font-weight: 900;
			opacity: 1;
		  }

		  .ascii-container {
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			background: #fff;
			z-index: 0;
		  }
		  .ascii-art {
			font-family: monospace;
			font-size: 10px;
			color: #CCCCCC;
			line-height: 1.1;
			letter-spacing: 1px;
			text-align: center;
		  }
		`}</style>
	  </div>
	);
  }