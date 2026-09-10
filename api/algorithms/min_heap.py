"""
Custom MinHeap implementation (hand-rolled, no heapq).
Supports decrease-key via lazy deletion for Dijkstra / A*.
"""
from __future__ import annotations
from typing import Any, Tuple


class HeapNode:
    __slots__ = ("priority", "item", "removed")

    def __init__(self, priority: float, item: Any):
        self.priority = priority
        self.item = item
        self.removed = False

    def __lt__(self, other: "HeapNode") -> bool:
        return self.priority < other.priority

    def __le__(self, other: "HeapNode") -> bool:
        return self.priority <= other.priority


class MinHeap:
    """
    Binary min-heap with O(log n) push/pop and O(log n) decrease-key.
    Uses lazy deletion: invalidated nodes are skipped during pop.
    """

    def __init__(self):
        self._heap: list[HeapNode] = []
        self._entry_finder: dict[Any, HeapNode] = {}  # item -> HeapNode
        self._size: int = 0

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                    #
    # ------------------------------------------------------------------ #
    def _swap(self, i: int, j: int) -> None:
        self._heap[i], self._heap[j] = self._heap[j], self._heap[i]

    def _sift_up(self, i: int) -> None:
        while i > 0:
            parent = (i - 1) >> 1
            if self._heap[parent] <= self._heap[i]:
                break
            self._swap(i, parent)
            i = parent

    def _sift_down(self, i: int) -> None:
        n = len(self._heap)
        while True:
            smallest = i
            left = (i << 1) + 1
            right = left + 1
            if left < n and self._heap[left] < self._heap[smallest]:
                smallest = left
            if right < n and self._heap[right] < self._heap[smallest]:
                smallest = right
            if smallest == i:
                break
            self._swap(i, smallest)
            i = smallest

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #
    def push(self, priority: float, item: Any) -> None:
        """Insert or decrease-key."""
        if item in self._entry_finder:
            node = self._entry_finder[item]
            if priority < node.priority:
                node.removed = True  # lazy-delete old entry
                self._size -= 1
            else:
                return  # existing entry is already better

        node = HeapNode(priority, item)
        self._entry_finder[item] = node
        self._heap.append(node)
        self._sift_up(len(self._heap) - 1)
        self._size += 1

    def pop(self) -> Tuple[float, Any]:
        """Extract the minimum element, skipping lazily-deleted nodes."""
        while self._heap:
            # Move last element to root and restore heap
            top = self._heap[0]
            last = self._heap.pop()
            if self._heap:
                self._heap[0] = last
                self._sift_down(0)

            if not top.removed:
                if top.item in self._entry_finder:
                    del self._entry_finder[top.item]
                self._size -= 1
                return top.priority, top.item

        raise IndexError("pop from empty MinHeap")

    def is_empty(self) -> bool:
        return self._size == 0

    def __len__(self) -> int:
        return self._size
