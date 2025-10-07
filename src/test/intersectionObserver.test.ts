import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('MockIntersectionObserver', () => {
    let setSpy: ReturnType<typeof vi.spyOn>
    let clearSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        // Provide a narrow typed view of globals to avoid using `any`.
        setSpy = vi.spyOn(globalThis as unknown as { setTimeout: (...args: unknown[]) => number }, 'setTimeout')
        clearSpy = vi.spyOn(globalThis as unknown as { clearTimeout: (id?: number) => void }, 'clearTimeout')
    })

    afterEach(() => {
        setSpy.mockRestore()
        clearSpy.mockRestore()
    })

    it('schedules a timer and clears it on disconnect', () => {
        const cb = vi.fn()

        type ObsCtor = new (cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) => { disconnect(): void }
        const ObserverCtor = (globalThis as unknown as { IntersectionObserver?: ObsCtor }).IntersectionObserver
        if (!ObserverCtor) throw new Error('IntersectionObserver mock not installed')

        const inst = new ObserverCtor(cb, {})

        // construction should schedule an async callback via setTimeout
        expect(setSpy).toHaveBeenCalled()

        // disconnect should clear the scheduled timer
        inst.disconnect()
        expect(clearSpy).toHaveBeenCalled()
    })
})
