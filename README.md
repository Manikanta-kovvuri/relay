# Design Doc: Distributed Notification System

**Author:** Manikanta Kovvuri  
**Status:** Implemented / Reference Architecture  

---

## 1. Context and Objective

Modern backend systems require reliable, asynchronous event processing to decouple core application flows from peripheral tasks. This project serves as a production-grade reference architecture for a highly scalable notification pipeline. By leveraging an Event-Driven Architecture (EDA), the system ensures high throughput and reliability, gracefully handling transient failures and traffic spikes without degrading the performance of the upstream API.

## 2. Goals and Non-Goals

### Goals
* **Decoupling:** Completely isolate the API ingestion layer from the notification processing layer.
* **Fault Tolerance:** Implement robust multi-topic retry mechanisms and Dead Letter Queues (DLQ) to prevent message loss.
* **Scalability:** Enable linear, horizontal scaling of worker nodes to dynamically handle fluctuating loads.
* **Idempotency:** Guarantee exactly-once processing semantics for requests, preventing duplicate dispatches.
* **Observability:** Expose granular Prometheus metrics for system health, throughput, and error rates.

### Non-Goals
* **Strict Global Ordering:** Processing order is not guaranteed across different notification events, prioritizing throughput and concurrency over sequence.
* **Immediate Consistency:** The API returns an accepted state (eventual consistency) rather than blocking synchronously for the final notification delivery state.
* **Vendor Integration:** Specific implementations of third-party SMS/Email providers (e.g., Twilio, SendGrid) are mocked out, as they are outside the scope of this core infrastructure design.

## 3. High-Level Architecture

The architecture follows a classic Producer-Broker-Consumer pattern, ensuring the API remains highly responsive while offloading I/O heavy processing to asynchronous workers.

```text
[Client] 
   │ (REST payload: { requestId, data })
   ▼
[API Service (Producer)] ──(Validate, Save PENDING state)──> [MongoDB]
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
   └─(Update SENT/FAILED state)──> [MongoDB]
