// src/app/my-page/page.tsx
'use client'
import React, { useEffect, useState } from 'react'

export default function MyPage() {
	const [data, setData] = useState(null)

	useEffect(() => {
		async function fetchData() {
			const response = await fetch('/api/stock')
			const json = await response.json()
			setData(json)
		}
		fetchData()
	}, [])

	return (
		<div>
			<h1>Mock API Test</h1>
			<pre>{JSON.stringify(data, null, 2)}</pre>
		</div>
	)
}
