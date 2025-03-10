import { NextRequest, NextResponse } from 'next/server'

const TICKER_TO_CIK: Record<string, string> = {
	AAPL: '320193',
	MSFT: '789019',
	AMZN: '1018724',
	GOOG: '1652044',
	TSLA: '1318605',
}

function getCIKFromTicker(ticker: string): string | null {
	const normalized = ticker.toUpperCase()
	return TICKER_TO_CIK[normalized] ?? null
}

// Simple delay function
function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const ticker = searchParams.get('name')
	if (!ticker) {
		return NextResponse.json({ error: 'Missing stock name' }, { status: 400 })
	}

	const cikUnpadded = getCIKFromTicker(ticker)
	if (!cikUnpadded) {
		return NextResponse.json({ error: 'Unknown ticker', ticker }, { status: 400 })
	}

	// Pad the CIK for the SEC API call
	const cikPadded = cikUnpadded.toString().padStart(10, '0')
	const edgarUrl = `https://data.sec.gov/submissions/CIK${cikPadded}.json`

	// Create an AbortController for timeout handling.
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 seconds timeout

	try {
		const response = await fetch(edgarUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Ed; scoooberr@gmail.com)',
			},
			signal: controller.signal,
		})
		clearTimeout(timeoutId)

		if (!response.ok) {
			return NextResponse.json({ error: 'EDGAR API error', status: response.status }, { status: response.status })
		}

		const edgarData = await response.json()
		const recentFilings = edgarData.filings?.recent
		if (!recentFilings) {
			return NextResponse.json({ error: 'No recent filings found' }, { status: 404 })
		}

		if (!recentFilings.accessionNumber) {
			return NextResponse.json({ error: 'No accession numbers found in filings data' }, { status: 404 })
		}

		const filings = []
		for (let i = 0; i < recentFilings.form.length; i++) {
			const formType = recentFilings.form[i]
			if (formType === '10-K' || formType === '10-Q' || formType === '8-K' || formType === 'DEF 14A') {
				const filingDate = recentFilings.filingDate[i]
				const primaryDocument = recentFilings.primaryDocument[i]
				const accessionNumber = recentFilings.accessionNumber[i]
				if (!accessionNumber || !primaryDocument) {
					console.error(`Missing accessionNumber or primaryDocument at index ${i}`)
					continue
				}
				const accessionNumberNoDashes = accessionNumber.replace(/-/g, '')
				const docUrl = `https://www.sec.gov/Archives/edgar/data/${cikUnpadded}/${accessionNumberNoDashes}/${primaryDocument}`
				filings.push({
					form: formType,
					filingDate,
					documentUrl: docUrl,
				})

				if (filings.length === 20) {
					break
				}
			}
		}

		console.log('Constructed filings:', filings)

		// Process filings in chunks of 10 to limit to 10 requests per second.
		const filingsWithContent = []
		for (let i = 0; i < filings.length; i += 10) {
			const chunk = filings.slice(i, i + 10)
			const chunkResults = await Promise.all(
				chunk.map(async (filing) => {
					try {
						const docResponse = await fetch(filing.documentUrl, {
							headers: {
								'User-Agent': 'Mozilla/5.0 (compatible; Ed; scoooberr@gmail.com)',
							},
						})
						if (docResponse.ok) {
							const content = await docResponse.text()
							return { ...filing, content }
						} else {
							console.error(`Error fetching ${filing.documentUrl}: status ${docResponse.status}`)
						}
					} catch (docError) {
						console.error(`Error fetching document at ${filing.documentUrl}:`, docError)
					}
					return filing
				})
			)
			filingsWithContent.push(...chunkResults)
			// Wait 1 second before processing the next chunk, if any.
			if (i + 10 < filings.length) {
				await delay(1000)
			}
		}

		return NextResponse.json({
			filings: filingsWithContent.map(f => {
				// keep only wanted fields
				const { form, filingDate, documentUrl } = f
				return { form, filingDate, documentUrl }
			}),
		})
	} catch (error) {
		console.error('Error in GET handler:', error)
		return NextResponse.json({ error: 'Server error', details: error instanceof Error ? error.message : error }, { status: 500 })
	}
}
