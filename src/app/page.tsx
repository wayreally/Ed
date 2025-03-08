'use client'

import React, { useState } from 'react'

export default function Home() {
	const [input, setInput] = useState('')
	const [result, setResult] = useState<unknown>(null) // Use 'unknown' instead of 'any'

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		try {
			const response = await fetch(`/api/stock?name=${encodeURIComponent(input)}`)
			const data = await response.json()
			console.log(data)
			setResult(data)
		} catch (error) {
			console.error('Error fetching data:', error)
		}
	}

	return (
		<div className="min-h-screen bg-black flex flex-col items-center justify-center">
			<form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded flex flex-col gap-4">
				<input
					type="text"
					placeholder="Enter stock name"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					className="px-4 py-2 rounded border border-gray-700 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<button type="submit" className="py-2 bg-blue-600 rounded text-white hover:bg-blue-700 transition">
					Submit
				</button>
			</form>
			{result !== null && (
				<div className="mt-8 text-white">
					<pre>{JSON.stringify(result, null, 2)}</pre>
				</div>
			)}
		</div>
	)
}
