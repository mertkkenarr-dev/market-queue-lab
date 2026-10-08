export class MinHeap<T> {
  private items: T[] = []

  constructor(private readonly less: (a: T, b: T) => boolean) {}

  get size(): number {
    return this.items.length
  }

  peek(): T | undefined {
    return this.items[0]
  }

  push(item: T): void {
    const a = this.items
    a.push(item)
    let i = a.length - 1
    while (i > 0) {
      const parent = (i - 1) >>> 1
      if (!this.less(a[i] as T, a[parent] as T)) break
      ;[a[i], a[parent]] = [a[parent] as T, a[i] as T]
      i = parent
    }
  }

  pop(): T | undefined {
    const a = this.items
    if (a.length === 0) return undefined
    const top = a[0]
    const last = a.pop() as T
    if (a.length > 0) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let smallest = i
        if (l < a.length && this.less(a[l] as T, a[smallest] as T)) smallest = l
        if (r < a.length && this.less(a[r] as T, a[smallest] as T)) smallest = r
        if (smallest === i) break
        ;[a[i], a[smallest]] = [a[smallest] as T, a[i] as T]
        i = smallest
      }
    }
    return top
  }
}

/** FIFO with O(1) amortised dequeue (Array#shift is O(n) and would dominate long runs). */
export class Fifo<T> {
  private items: T[] = []
  private head = 0

  get length(): number {
    return this.items.length - this.head
  }

  push(item: T): void {
    this.items.push(item)
  }

  shift(): T | undefined {
    if (this.head >= this.items.length) return undefined
    const item = this.items[this.head]
    this.head++
    if (this.head > 1024 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head)
      this.head = 0
    }
    return item
  }
}
