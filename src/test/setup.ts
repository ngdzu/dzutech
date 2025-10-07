import '@testing-library/jest-dom/vitest'

class MockIntersectionObserver {
	readonly root: Element | Document | null
	readonly rootMargin: string
	readonly thresholds: ReadonlyArray<number>

	private _timer?: ReturnType<typeof setTimeout>

	constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
		this.root = options?.root ?? null
		this.rootMargin = options?.rootMargin ?? '0px'
		const threshold = options?.threshold ?? 0
		this.thresholds = Array.isArray(threshold) ? threshold : [threshold]
		// Immediately invoke callback (async) to simulate an intersecting element.
		// Guard against environments where `document` may be torn down during
		// test teardown (avoid ReferenceError). Store the timer so it can be
		// cleared when the observer disconnects.
		this._timer = setTimeout(() => {
			if (typeof document === 'undefined' || !document.body) return
			try {
				const bodyRect = document.body.getBoundingClientRect()
				callback(
					[
						{
							isIntersecting: true,
							intersectionRatio: 1,
							target: document.body,
							time: 0,
							boundingClientRect: bodyRect,
							intersectionRect: bodyRect,
							rootBounds: null,
						} as IntersectionObserverEntry,
					],
					this as unknown as IntersectionObserver,
				)
			} catch {
				// ignore errors during teardown
			}
		}, 0)
	}

	observe() {
		/* no-op */
	}

	unobserve() {
		/* no-op */
	}

	disconnect() {
		if (this._timer) {
			clearTimeout(this._timer)
			this._timer = undefined
		}
	}
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
	writable: true,
	configurable: true,
	value: MockIntersectionObserver,
})

Object.defineProperty(globalThis, 'ResizeObserver', {
	writable: true,
	configurable: true,
	value: class {
		observe() { }
		unobserve() { }
		disconnect() { }
	},
})
