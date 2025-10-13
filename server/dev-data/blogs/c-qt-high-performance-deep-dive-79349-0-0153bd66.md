# C++/Qt High Performance: Deep Dive 79349-0


_Topic: C++ / Qt — High Performance Computing_


High-performance computing with C++ and Qt needs careful attention to allocation, threading, and data locality.


## cache-friendly data structures and SoA vs AoS


Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. A key observation when working on cache-friendly data structures and SoA vs AoS is to measure before optimizing: profile hotspots and focus efforts where they matter. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.


```cpp
#include <QThreadPool>
#include <QRunnable>
#include <QVector>

struct Work : public QRunnable {
  QVector<int> data;
  Work(QVector<int>&& d) : data(std::move(d)) {}
  void run() override {
    // process in-place to avoid extra allocations
    for (int &v : data) { v = heavyCompute(v); }
  }
  static int heavyCompute(int x) { return x * x; }
};

void scheduleWork(const QVector<int>& inputs) {
  QThreadPool &pool = *QThreadPool::globalInstance();
  for (int i = 0; i < inputs.size(); i += 1024) {
    QVector<int> slice; slice.reserve(1024);
    int end = qMin(i+1024, inputs.size());
    for (int j = i; j < end; ++j) slice.append(inputs[j]);
    pool.start(new Work(std::move(slice)));
  }
}
```


## cache-friendly data structures and SoA vs AoS


Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. A key observation when working on cache-friendly data structures and SoA vs AoS is to measure before optimizing: profile hotspots and focus efforts where they matter. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.

Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. A key observation when working on cache-friendly data structures and SoA vs AoS is to measure before optimizing: profile hotspots and focus efforts where they matter. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.

Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

## lock-free programming and QAtomic operations


A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.

A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter.

Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.


```cpp
#include <QThreadPool>
#include <QRunnable>
#include <QVector>

struct Work : public QRunnable {
  QVector<int> data;
  Work(QVector<int>&& d) : data(std::move(d)) {}
  void run() override {
    // process in-place to avoid extra allocations
    for (int &v : data) { v = heavyCompute(v); }
  }
  static int heavyCompute(int x) { return x * x; }
};

void scheduleWork(const QVector<int>& inputs) {
  QThreadPool &pool = *QThreadPool::globalInstance();
  for (int i = 0; i < inputs.size(); i += 1024) {
    QVector<int> slice; slice.reserve(1024);
    int end = qMin(i+1024, inputs.size());
    for (int j = i; j < end; ++j) slice.append(inputs[j]);
    pool.start(new Work(std::move(slice)));
  }
}
```


## profiling workflows with perf / Instruments and Qt Creator


Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. A key observation when working on profiling workflows with perf / Instruments and Qt Creator is to measure before optimizing: profile hotspots and focus efforts where they matter. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.

Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. A key observation when working on profiling workflows with perf / Instruments and Qt Creator is to measure before optimizing: profile hotspots and focus efforts where they matter.

## lock-free programming and QAtomic operations


Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter.


```cpp
#include <QThreadPool>
#include <QRunnable>
#include <QVector>

struct Work : public QRunnable {
  QVector<int> data;
  Work(QVector<int>&& d) : data(std::move(d)) {}
  void run() override {
    // process in-place to avoid extra allocations
    for (int &v : data) { v = heavyCompute(v); }
  }
  static int heavyCompute(int x) { return x * x; }
};

void scheduleWork(const QVector<int>& inputs) {
  QThreadPool &pool = *QThreadPool::globalInstance();
  for (int