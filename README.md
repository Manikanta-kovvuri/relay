# Design Document: Distributed Notification System

**Author:** Manikanta Kovvuri  
**Status:** Implemented / Reference Architecture  

---

## Table of Contents
1. [Context and Objective](#1-context-and-objective)
2. [Goals and Non-Goals](#2-goals-and-non-goals)
3. [System Architecture](#3-system-architecture)
4. [Detailed Design & Core Flows](#4-detailed-design--core-flows)
5. [Design Decisions and Trade-offs](#5-design-decisions-and-trade-offs)
6. [Observability](#6-observability)
7. [Future Considerations](#7-future-considerations)
8. [Appendix: Local Development](#8-appendix-local-development)

---

## 1. Context and Objective
Modern distributed backend systems require reliable, asynchronous event processing to decouple core application flows from peripheral tasks. This document outlines the architecture for a highly scalable, fault-tolerant notification pipeline. By leveraging an event-driven architecture (EDA), the system ensures high throughput and reliability while gracefully handling transient failures and traffic spikes.

## 2. Goals and Non-Goals

### Goals
*   **Decoupling:** Isolate the API ingestion layer from the notification processing layer.
*   **Fault Tolerance:** Implement robust retry mechanisms and Dead Letter Queues (DLQ) to prevent message loss.
*   **Scalability:** Enable horizontal scaling of worker nodes to handle fluctuating loads linearly.
*   **Idempotency:** Guarantee exactly-once processing semantics for notification requests, even in the event of retries.
*   **Observability:** Expose granular metrics for system health, throughput, and error rates.

### Non-Goals
*   **Strict Global Ordering:** Processing order is not guaranteed across different notification events, prioritizing throughput over sequence.
*   **Immediate Consistency:** The API will return an accepted state (eventual consistency) rather than waiting for synchronous notification delivery.
*   **Vendor Integration Details:** Specific implementations of third-party SMS/Email providers are outside the scope of this core infrastructure design.

## 3. System Architecture

The architecture follows a classic Producer-Broker-Consumer pattern, ensuring the API remains highly responsive while offloading heavy processing to asynchronous workers.

### 3.1 High-LevelHere is the Markdown version, optimized for a GitHub `README.md`. It leads with the high-level architecture to show your L5 system design mindset, but I have also re-included a minimal, professional "Getting Started" section at the bottom so the repository remains functional for anyone reviewing your code.

Just click the "Copy" button in the top right corner of the block below and paste it directly into your `README.md` file.

```markdown
# Distributed Notification System

[![Architecture: Event-Driven](https://img.shields.io/badge/Architecture-Event--Driven-blue.svg)](https://en.wikipedia.org/wiki/Event-driven_architecture)
[![Status: Reference Implementation](https://img.shields.io/badge/Status-Reference_Implementation-success.svg)]()

A production-grade, fault-tolerant notification pipeline designed to process events asynchronously at scale. This project serves as a reference architecture demonstrating core distributed system patterns including event streaming, horizontal scaling, consumer group balancing, and dead-letter queue (DLQ) management.

## 1. Context and Objective

Modern distributed backend systems require reliable, asynchronous event processing to decouple core application flows from peripheral tasks. This system implements a highly scalable notification pipeline utilizing an Event-Driven Architecture (EDA). It ensures high throughput and reliability while gracefully handling transient failures, network partitions, and traffic spikes without degrading the upstream API performance.

## 2. Architecture Goals and Non-Goals

### Goals
* **Decoupling:** Isolate the API ingestion layer from the notification processing layer.
* **Fault Tolerance:** Implement robust retry mechanisms and Dead Letter Queues (DLQ) to prevent message loss.
* **Scalability:** Enable linear horizontal scaling of worker nodes to handle fluctuating loads.
* **Idempotency:** Guarantee exactly-once processing semantics for notification requests, preventing duplicate dispatches.
* **Observability:** Expose granular Prometheus metrics for system health, throughput, and error rates.

### Non-Goals
* **Strict Global Ordering:** Processing order is not guaranteed across different notification events, prioritizing throughput and concurrency over strict sequence.
* **Immediate Consistency:** The API returns an accepted state (eventual consistency) rather than blocking synchronously for notification delivery.

## 3. System Architecture

The architecture follows a classic Producer-Broker-Consumer pattern, ensuring the API remains highly responsive while offloading I/O heavy processing to asynchronous workers.

```text
[Client] 
   │ (REST payload)
   ▼
[API Service (Producer)] ──(Validate, Save State)──> [MongoDB]
   │
   │ (Publish Event)
   ▼
[Kafka Broker] ◄──────────────┐
   │                          │ (Retry/DLQ Routing)
   ├─> Topic: notifications   │
   ├─> Topic: retry_queue ────┤
   └─> Topic: dlq             │
   │                          │
   ▼                          │
[Worker Service (Consumer)] ──┘
   │
   └─(Update Status)──> [MongoDB]
