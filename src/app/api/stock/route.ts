import { NextRequest, NextResponse } from 'next/server'

// Hardcoded map of ticker symbols to their CIK numbers (as strings)
const TICKER_TO_CIK: Record<string, string> = {
	AAPL: '320193',
	MSFT: '789019',
	AMZN: '1018724',
	GOOG: '1652044',
	TSLA: '1318605',
}

// Helper function to look up the CIK from a ticker.
// It returns null if the ticker isn't found in our map.
function getCIKFromTicker(ticker: string): string | null {
	const normalized = ticker.toUpperCase()
	return TICKER_TO_CIK[normalized] ?? null
}

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const ticker = searchParams.get('name')
	if (!ticker) {
		return NextResponse.json({ error: 'Missing stock name' }, { status: 400 })
	}

	// Get the unpadded CIK from our mapping.
	const cikUnpadded = getCIKFromTicker(ticker)
	if (!cikUnpadded) {
		return NextResponse.json(
			{ error: 'Unknown ticker', ticker },
			{ status: 400 }
		)
	}

	// Pad the CIK to 10 digits.
	const cik = cikUnpadded.toString().padStart(10, '0')
	const edgarUrl = `https://data.sec.gov/submissions/CIK${cik}.json`

	try {
		const response = await fetch(edgarUrl, {
			// The SEC requires a proper User-Agent header.
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
