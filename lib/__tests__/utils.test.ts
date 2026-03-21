import { vi } from "vitest"
import {
  extractDomain,
  isValidPublicUrl,
  formatMs,
  cwvRating,
  entityTag,
} from "../utils"

// ---------------------------------------------------------------------------
// extractDomain
// ---------------------------------------------------------------------------
describe("extractDomain", () => {
  it("extracts domain from an https URL", () => {
    expect(extractDomain("https://example.com")).toBe("example.com")
  })

  it("strips www. prefix", () => {
    expect(extractDomain("https://www.example.com")).toBe("example.com")
  })

  it("handles URLs with paths and query strings", () => {
    expect(
      extractDomain("https://shop.example.com/products?page=2&sort=price")
    ).toBe("shop.example.com")
  })

  it("throws on an empty string", () => {
    expect(() => extractDomain("")).toThrow()
  })

  it("throws on a URL without a protocol", () => {
    expect(() => extractDomain("example.com")).toThrow()
  })

  it("throws on garbage input", () => {
    expect(() => extractDomain("not-a-url-at-all")).toThrow()
  })
})

// ---------------------------------------------------------------------------
// isValidPublicUrl
// ---------------------------------------------------------------------------
describe("isValidPublicUrl", () => {
  it("returns true for a valid HTTPS URL", () => {
    expect(isValidPublicUrl("https://example.com")).toBe(true)
  })

  it("returns false for HTTP (not HTTPS)", () => {
    expect(isValidPublicUrl("http://example.com")).toBe(false)
  })

  it("returns false for localhost", () => {
    expect(isValidPublicUrl("https://localhost")).toBe(false)
  })

  it("returns false for 127.0.0.1", () => {
    expect(isValidPublicUrl("https://127.0.0.1")).toBe(false)
  })

  it("returns false for 10.0.0.1 (private class A)", () => {
    expect(isValidPublicUrl("https://10.0.0.1")).toBe(false)
  })

  it("returns false for 172.16.0.1 (private class B)", () => {
    expect(isValidPublicUrl("https://172.16.0.1")).toBe(false)
  })

  it("returns false for 192.168.1.1 (private class C)", () => {
    expect(isValidPublicUrl("https://192.168.1.1")).toBe(false)
  })

  it("returns false for 169.254.0.1 (link-local)", () => {
    expect(isValidPublicUrl("https://169.254.0.1")).toBe(false)
  })

  it("returns false for *.local domains", () => {
    expect(isValidPublicUrl("https://myapp.local")).toBe(false)
  })

  it("returns false for *.internal domains", () => {
    expect(isValidPublicUrl("https://service.internal")).toBe(false)
  })

  it("returns false for invalid strings", () => {
    expect(isValidPublicUrl("not-a-url")).toBe(false)
  })

  it("returns false for an empty string", () => {
    expect(isValidPublicUrl("")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// formatMs
// ---------------------------------------------------------------------------
describe("formatMs", () => {
  it('returns "N/A" for null', () => {
    expect(formatMs(null)).toBe("N/A")
  })

  it("returns formatted seconds for values >= 1000", () => {
    expect(formatMs(1200)).toBe("1.2s")
  })

  it("returns formatted milliseconds for values < 1000", () => {
    expect(formatMs(340)).toBe("340ms")
  })

  it("handles 0", () => {
    expect(formatMs(0)).toBe("0ms")
  })

  it("handles exactly 1000", () => {
    expect(formatMs(1000)).toBe("1.0s")
  })
})

// ---------------------------------------------------------------------------
// cwvRating
// ---------------------------------------------------------------------------
describe("cwvRating", () => {
  describe("LCP thresholds", () => {
    it('rates 2500 as "good"', () => {
      expect(cwvRating("lcp", 2500)).toBe("good")
    })

    it('rates 3000 as "needs-improvement"', () => {
      expect(cwvRating("lcp", 3000)).toBe("needs-improvement")
    })

    it('rates 4001 as "poor"', () => {
      expect(cwvRating("lcp", 4001)).toBe("poor")
    })
  })

  describe("CLS thresholds", () => {
    it('rates 0.1 as "good"', () => {
      expect(cwvRating("cls", 0.1)).toBe("good")
    })

    it('rates 0.2 as "needs-improvement"', () => {
      expect(cwvRating("cls", 0.2)).toBe("needs-improvement")
    })

    it('rates 0.26 as "poor"', () => {
      expect(cwvRating("cls", 0.26)).toBe("poor")
    })
  })

  describe("INP thresholds", () => {
    it('rates 200 as "good"', () => {
      expect(cwvRating("inp", 200)).toBe("good")
    })

    it('rates 300 as "needs-improvement"', () => {
      expect(cwvRating("inp", 300)).toBe("needs-improvement")
    })

    it('rates 501 as "poor"', () => {
      expect(cwvRating("inp", 501)).toBe("poor")
    })
  })

  describe("TTFB thresholds", () => {
    it('rates 800 as "good"', () => {
      expect(cwvRating("ttfb", 800)).toBe("good")
    })

    it('rates 1000 as "needs-improvement"', () => {
      expect(cwvRating("ttfb", 1000)).toBe("needs-improvement")
    })

    it('rates 1801 as "poor"', () => {
      expect(cwvRating("ttfb", 1801)).toBe("poor")
    })
  })

  it('returns "unknown" for a null value', () => {
    expect(cwvRating("lcp", null)).toBe("unknown")
  })

  it('returns "unknown" for an unrecognized metric', () => {
    expect(cwvRating("foobar", 100)).toBe("unknown")
  })
})

// ---------------------------------------------------------------------------
// entityTag
// ---------------------------------------------------------------------------
describe("entityTag", () => {
  it("converts example.com to entity-example-com", () => {
    expect(entityTag("example.com")).toBe("entity-example-com")
  })

  it("handles subdomains", () => {
    expect(entityTag("api.example.com")).toBe("entity-api-example-com")
  })
})
