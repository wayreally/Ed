'use client'

import { useEffect, useState, useMemo } from 'react'

const asciiLogo = `                                                                                                    
                                                                                                    
                                                                                                    
                                                @@                                                  
                                                @@@                                                 
                                               @@@@                                                 
                                               @@@@@                                                
                                              @@@@@@                                                
                                              @@@@@@@                                               
                                             @@@@@@@@                                               
                                             @@@@@@@@@                                              
                                            @@@@@@@@@@@                                             
                                            @@@@@@@@@@@                                             
                                           @@@@@@@@@@@@                                             
                                           @@@@@@@@@@@@@                                            
                                          @@@@@@@@@@@@@@@                                           
                  @@@                   @@@@@@@@@@@@@@@@@@@                   @@@                   
                     @@@@@@@@@           @@@@@@@@@@@@@@@@@          @@@@@@@@@@                      
                        @@@@@@@@@@@@@@@     @@@@@@@@@@@     @@@@@@@@@@@@@@@                         
                           @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@                            
                             @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@                               
                                @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@                                  
                                   @@@@@@@@@@@@@@@@@@@@@@@@@@@@@                                    
                                    @@@@@@ @@@@@@@@@@@@@@@@@@@                                      
                                    @@@@  @@@@@@@@@@@@@@@@@@@@                                      
                                    @    @@@@@@@@@@@@@@@@@@@@@@                                     
                                       @@@@@@@@@@@@@@@@@@@@@@@@@                                    
                                      @@@@@@@@@     @@@@@@@@@@@@@                                   
                                     @@@@@@@@         @@@@@@@@@@@@                                  
                                    @@@@@@@             @@@@@@@@@@                                  
                                  @@@@@@@                 @@@@@@@@@                                 
                                 @@@@@@                     @@@@@@@@                                
                                @@@@@                         @@@@@@@                               
                              @@@@@                             @@@@@@                              
                             @@@@                                 @@@@@                             
                            @@@                                     @@@                             
                           @@                                         @@                            
                                                                                                    
                                                                                                    
                                                                                                    
                                                                                                    
                                                                                                    
                                                                                                    													
`
interface AsciiBackgroundProps {
	charsPerSecond?: number
	cursorChar?: string
	cursorBlinkSpeed?: number
	scale?: number
	waveSpeed?: number      // 🌊 new
	waveWidth?: number      // 🌊 new
  }
  
  export default function AsciiBackground({
	charsPerSecond = 200,
	cursorChar = '_',
	cursorBlinkSpeed = 500,
	scale = .9,
	waveSpeed = 0.35,       // 🌊 default wave speed
	waveWidth = 3           // 🌊 wave affects 3 chars around peak
  }: AsciiBackgroundProps) {
  
	const lines = useMemo(() => asciiLogo.split('\n').filter(l => l.trim() !== ''), [])
	const maxLineLength = useMemo(() => Math.max(...lines.map(l => l.length)), [lines])
	const lineHeightFactor = 1.0
  
	const totalChars = useMemo(() =>
	  lines.reduce((sum, line) => sum + line.replace(/ /g, '').length, 0),
	  [lines]
	)
  
	const [visibleChars, setVisibleChars] = useState(0)
	const [fontSize, setFontSize] = useState(10)
	const [showCursor, setShowCursor] = useState(false)
  
	// 🌊 Wave position
	const [wavePos, setWavePos] = useState(0);

	// Debug: Log wave position whenever it changes
	useEffect(() => {
	console.debug('Wave position updated:', wavePos);
	}, [wavePos]);

	// Resize font
	useEffect(() => {
	const updateFontSize = () => {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const fontSizeByWidth = vw / (maxLineLength * 1.1);
		const fontSizeByHeight = vh / (lines.length * lineHeightFactor);
		const baseSize = Math.min(fontSizeByWidth, fontSizeByHeight);
		const newFontSize = baseSize * scale;
		setFontSize(newFontSize);

		// Debug: Log font size calculation
		console.debug('Font size updated:', {
		vw,
		vh,
		fontSizeByWidth,
		fontSizeByHeight,
		baseSize,
		scale,
		newFontSize,
		});
	};

	updateFontSize();
	const onResize = () => {
		clearTimeout((window as any)._rt);
		(window as any)._rt = setTimeout(updateFontSize, 100);
	};

	window.addEventListener('resize', onResize);

	// Clean up event listener
	return () => {
		window.removeEventListener('resize', onResize);
	};
	}, [maxLineLength, lines.length, lineHeightFactor, scale]);
  
	// Typing animation
	useEffect(() => {
	  let chars = 0
	  let lastTime = performance.now()
  
	  const step = (time: number) => {
		const delta = time - lastTime
		chars += (delta / 1000) * charsPerSecond
		const newVis = Math.min(Math.floor(chars), totalChars)
		setVisibleChars(newVis)
		lastTime = time
		if (newVis < totalChars) requestAnimationFrame(step)
		else setShowCursor(true)
	  }
	  requestAnimationFrame(step)
	}, [charsPerSecond, totalChars])
  
	// Cursor blink
	useEffect(() => {
	  if (!showCursor) return
	  const t = setInterval(() => setShowCursor(p => !p), cursorBlinkSpeed)
	  return () => clearInterval(t)
	}, [showCursor, cursorBlinkSpeed])
  
	// 🌊 Wave effect (runs after typing finishes)
	useEffect(() => {
	if (!showCursor) return;

	let frameId: number;
	const animate = () => {
		setWavePos(prev => prev + waveSpeed); // waveSpeed controls animation speed
		frameId = requestAnimationFrame(animate);
	};
	frameId = requestAnimationFrame(animate);
	return () => cancelAnimationFrame(frameId);
	}, [showCursor, waveSpeed]);
  
	// Build visible lines with wave mask
	const visibleLines = useMemo(() => {
	  let remaining = visibleChars
  
	  return lines.map(line => {
		let visiblePart = ''
		let hiddenPart = ''
  
		for (let i = 0; i < line.length; i++) {
		  const char = line[i]
  
		  // Preserve spaces regardless
		  if (char === ' ') {
			visiblePart += char
			continue
		  }
  
		  // Typing logic
		  let showChar = false
		  if (remaining > 0) {
			showChar = true
			remaining--
		  }
  
		  // 🌊 WAVE MASK (overrides showChar)
		  const inWave = Math.abs(i - wavePos) < waveWidth
		  if (inWave) showChar = false
  
		  if (showChar) visiblePart += char
		  else hiddenPart += char
		}
  
		return { visiblePart, hiddenPart }
	  })
	}, [lines, visibleChars, wavePos, waveWidth])
  
	return (
	  <div className="relative min-h-screen bg-white overflow-hidden">
		<pre
		className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
					font-mono whitespace-pre text-center leading-[1]
					text-black/10 select-none pointer-events-none z-0"
		style={{ fontSize: `${fontSize}px`, lineHeight: lineHeightFactor }}
		>
		{visibleLines.map(({ visiblePart, hiddenPart }, lineIdx) => (
			<span key={lineIdx} style={{ display: 'block' }}>
				{visiblePart.split('').map((char, charIdx) => {
				const wave = Math.sin(wavePos + (lineIdx * visiblePart.length + charIdx) * 0.3);
				const opacity = 0.3 + 0.7 * Math.abs(wave);
				return (
					<span
					key={charIdx}
					style={{
						opacity,
						transition: 'opacity 0.2s',
					}}
					>
					{char}
					</span>
				);
				})}
			{lineIdx === visibleLines.length - 1 && showCursor && (
				<span className="inline-block opacity-100">{cursorChar}</span>
			)}
			<span style={{ opacity: 0 }}>{hiddenPart}</span>
			</span>
		))}
		</pre>
  
		<div className="relative z-10 flex items-center justify-center min-h-screen">
		  <h1 className="text-4xl font-vogue text-black"></h1>
		</div>
	  </div>
	)
  }