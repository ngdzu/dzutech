# C++/Qt High Performance: Deep Dive 79373-5


_Topic: C++ / Qt — High Performance Computing_


In this post we explore practical strategies to squeeze more performance from C++ applications using the Qt framework.


## parallelism using QThreadPool and task-based design


Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. A key observation when working on parallelism using QThreadPool and task-based design is to measure before optimizing: profile hotspots and focus efforts where they matter.

A key observation when working on parallelism using QThreadPool and task-based design is to measure before optimizing: profile hotspots and focus efforts where they matter. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

## profiling workflows with perf / Instruments and Qt Creator


A key observation when working on profiling workflows with perf / Instruments and Qt Creator is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on profiling workflows with perf / Instruments and Qt Creator is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on profiling workflows with perf / Instruments and Qt Creator is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on profiling workflows with perf / Instruments and Qt Creator is to measure before optimizing: profile hotspots and focus efforts where they matter.

Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. A key observation when working on profiling workflows with perf / Instruments and Qt Creator is to measure before optimizing: profile hotspots and focus efforts where they matter. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

## lock-free programming and QAtomic operations


A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on lock-free programming and QAtomic operations is to measure before optimizing: profile hotspots and focus efforts where they matter.


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


## profiling workflows with perf / Instruments and Qt Creator


A key observation when working on profiling workflows with perf / Instruments and Qt Creator is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on profiling workflows with perf / Instruments and Qt Creator is to measure before optimizing: profile hotspots and focus efforts where they matter. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.


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


## Qt containers vs std::vector performance tradeoffs


Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. A key observation when working on Qt containers vs std::vector performance tradeoffs is to measure before optimizing: profile hotspots and focus efforts where they matter.

Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. A key observation when working on Qt containers vs std::vector performance tradeoffs is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on Qt containers vs std::vector performance tradeoffs is to measure before optimizing: profile hotspots and focus efforts where they matter. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.


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


Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

## serialization and minimizing copy when marshalling data


Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. A key observation when working on serialization and minimizing copy when marshalling data is to measure before optimizing: profile hotspots and focus efforts where they matter.

Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

## minimizing signal/slot overhead and using queued connections wisely


Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

A key observation when working on minimizing signal/slot overhead and using queued connections wisely is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on minimizing signal/slot overhead and using queued connections wisely is to measure before optimizing: profile hotspots and focus efforts where they matter. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.

Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. A key observation when working on minimizing signal/slot overhead and using queued connections wisely is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on minimizing signal/slot overhead and using queued connections wisely is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on minimizing signal/slot overhead and using queued connections wisely is to measure before optimizing: profile hotspots and focus efforts where they matter.


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


## memory management patterns (pooling, arenas)


Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.


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


## memory management patterns (pooling, arenas)


A key observation when working on memory management patterns (pooling, arenas) is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on memory management patterns (pooling, arenas) is to measure before optimizing: profile hotspots and focus efforts where they matter. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.


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


## memory management patterns (pooling, arenas)


Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps.

A key observation when working on memory management patterns (pooling, arenas) is to measure before optimizing: profile hotspots and focus efforts where they matter. A key observation when working on memory management patterns (pooling, arenas) is to measure before optimizing: profile hotspots and focus efforts where they matter.


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


A key observation when working on cache-friendly data structures and SoA vs AoS is to measure before optimizing: profile hotspots and focus efforts where they matter. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Qt provides useful abstractions, but be mindful of implicit allocations; using move semantics and reserving capacity can remove surprises.

Real-world systems often have non-obvious bottlenecks: batching, avoiding virtual calls in hot paths, and keeping data compact helps. Qt provides useful abstractions, but