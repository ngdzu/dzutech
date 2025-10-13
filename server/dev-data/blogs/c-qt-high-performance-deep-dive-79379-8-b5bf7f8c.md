# C++/Qt High Performance: Deep Dive 79379-8


_Topic: C++ / Qt — High Performance Computing_


High-performance computing with C++ and Qt needs careful attention to allocation, threading, and data locality.


## lock-free programming and QAtomic operations


Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter.

Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.


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


![diagram](https://picsum.photos/seed/NaN/1200/600)


## lock-free programming and QAtomic operations


A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter.

## minimizing signal/slot overhead and using queued connections wisely


Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. A key observation when working on minimizing signal/slot overhead and using queued connections wisely is to measure before optimizing: profile hotspots and focus efforts where they matter.

A key observation when working on minimizing signal/slot overhead and using queued connections wisely is to measure before optimizing: profile hotspots and focus efforts where they matter. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.


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


## parallelism using QThreadPool and task-based design


Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.

Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.

Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.


```cpp
#include <QThreadPool>
#include <QRunnable>
#include <QVector>

struct Work : public QRunnable {
  QVector<int> data;
  Work(QVector<int>&& d) : data(std::move(d)) {}
  void run() override