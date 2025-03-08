import { NextRequest, NextResponse } from 'next/server'

// Helper function to pad a string to 10 digits (assuming the ticker is convertible)
// In practice, you'll likely need to look up the correct CIK for a given ticker.
function padCIK(ticker: string): string {
	const num = parseInt(ticker, 10)
	// If ticker is numeric, pad it; if not, you'll need to map ticker to CIK.
	return isNaN(num) ? ticker : num.toString().padStart(10, '0')
}

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const ticker = searchParams.get('name')
	if (!ticker) {
		return NextResponse.json({ error: 'Missing stock name' }, { status: 400 })
	}

	// Convert ticker to CIK format; adjust this mapping as needed
	const cik = padCIK(ticker)
	// Build the EDGAR API URL.
	// This example uses the submissions endpoint.
	const edgarUrl = `https://data.sec.gov/submissions/CIK${cik}.json`

	try {
		const response = await fetch(edgarUrl, {
			// The SEC requires a proper User-Agent header in your requests.
			headers: {
				'User-Agent': 'MyAppName (myemail@example.com)', // Replace with your info
			},
		})
		if (!response.ok) {
			return NextResponse.json(
				{ error: 'EDGAR API error', status: response.status },
				{ status: response.status }
			)
		}
		const edgarData = await response.json()
		return NextResponse.json({ edgarData })
	} catch (error) {
		return NextResponse.json(
			{ error: 'Server error', details: error },
			{ status: 500 }
		)
	}
}
