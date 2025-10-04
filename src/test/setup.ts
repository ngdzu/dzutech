import '@testing-library/jest-dom/vitest'

class MockIntersectionObserver {
	readonly root: Element | Document | null
	readonly rootMargin: string
	readonly thresholds: ReadonlyArray<number>

	constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
		this.root = options?.root ?? null
		this.rootMargin = options?.rootMargin ?? '0px'
		const threshold = options?.threshold ?? 0
		this.thresholds = Array.isArray(threshold) ? threshold : [threshold]
		// Immediately invoke callback to simulate an intersecting element
			setTimeout(() => {
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
		}, 0)
	}

	observe() {
		/* no-op */
	}

	unobserve() {
		/* no-op */
	}

	disconnect() {
		/* no-op */
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
		observe() {}
		unobserve() {}
		disconnect() {}
	},
})
