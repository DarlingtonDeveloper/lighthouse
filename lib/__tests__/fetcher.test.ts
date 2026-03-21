import { vi } from "vitest"
import { fetchPage } from "../fetcher"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockResponse(html: string, headers: Record<string, string> = {}) {
  return {
    text: () => Promise.resolve(html),
    headers: new Map(Object.entries(headers)),
  }
}

// ---------------------------------------------------------------------------
// fetchPage
// ---------------------------------------------------------------------------
describe("fetchPage", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns html and headers on a successful fetch", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse("<html>OK</html>", {
        "content-type": "text/html",
        "x-powered-by": "Express",
      })
    )

    const result = await fetchPage("https://example.com")

    expect(result.html).toBe("<html>OK</html>")
    expect(result.headers).toEqual({
      "content-type": "text/html",
      "x-powered-by": "Express",
    })
  })

  it("returns empty result on network error", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"))

    const result = await fetchPage("https://unreachable.test")

    expect(result).toEqual({ html: "", headers: {} })
  })

  it("returns empty result on timeout (AbortError)", async () => {
    const abortError = new DOMException(
      "The operation was aborted.",
      "AbortError"
    )
    mockFetch.mockRejectedValueOnce(abortError)

    const result = await fetchPage("https://slow.test")

    expect(result).toEqual({ html: "", headers: {} })
  })

  it("sends the correct User-Agent header", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(""))

    await fetchPage("https://example.com")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callArgs = mockFetch.mock.calls[0]
    const options = callArgs[1] as RequestInit
    expect((options.headers as Record<string, string>)["User-Agent"]).toBe(
      "Mozilla/5.0 (compatible; Lighthouse-SA-Agent/2.0)"
    )
  })

  it("follows redirects (redirect: follow)", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(""))

    await fetchPage("https://example.com")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callArgs = mockFetch.mock.calls[0]
    const options = callArgs[1] as RequestInit
    expect(options.redirect).toBe("follow")
  })
})
