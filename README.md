# 🚀 Distributed Notification System

## Overview

A scalable distributed notification platform designed to process high-volume notifications reliably using asynchronous event-driven architecture.

The system supports queue-based processing, fault tolerance, retries, dead-letter queues, observability, and horizontal worker scaling.

This project was designed to simulate production-level notification systems similar to Firebase Cloud Messaging, Uber notification pipelines, and enterprise messaging systems.

---

## Features

### Notification Processing

* Email notifications
* SMS notifications
* Push notification support
* Asynchronous processing

### Reliability

* Retry mechanism
* Dead Letter Queue (DLQ)
* Idempotency support
* Request deduplication

### Scalability

* Kafka producer-consumer architecture
* Multi-worker processing
* Horizontal scaling support
* Consumer groups

### Observability

* Metrics collection
* Prometheus integration
* Grafana dashboards
* Logging

### Deployment

* Dockerized services
* MongoDB Atlas integration
* Railway deployment support

---

## System Architecture

```text
                Client
                   │
                   ▼
         Notification API
             (Producer)
                   │
                   ▼
               Kafka Queue
                   │
      ┌────────────┼────────────┐
      │            │            │
      ▼            ▼            ▼
 Worker-1      Worker-2     Worker-3
      │            │            │
      └────────────┼────────────┘
                   ▼
               MongoDB
                   │
                   ▼
          Metrics (/metrics)
                   │
                   ▼
             Prometheus
                   │
                   ▼
               Grafana
```

---

## Tech Stack

Backend:

* Node.js
* Express.js

Database:

* MongoDB
* MongoDB Atlas

Messaging:

* Kafka
* KafkaJS

Monitoring:

* Prometheus
* Grafana

Containerization:

* Docker
* Docker Compose

Deployment:

* Railway

---

## Why Kafka?

Direct API-to-worker communication tightly couples services and creates bottlenecks.

Kafka provides:

* Message persistence
* Asynchronous processing
* Consumer groups
* Horizontal scaling
* Fault tolerance

---

## Project Structure

```text
src
├── api
├── config
├── metrics
├── models
├── worker
├── services
└── index.js
```

---

## Local Installation

### Clone repository

```bash
git clone https://github.com/YOUR_USERNAME/distributed-notification-system.git

cd distributed-notification-system
```

### Install dependencies

```bash
npm install
```

---

## Run using Docker

Start all services:

```bash
docker compose up --build
```

This starts:

* API
* Worker
* Kafka
* MongoDB
* Zookeeper
* Prometheus
* Grafana

---

## Local URLs

API:

```text
http://localhost:3000
```

Prometheus:

```text
http://localhost:9090
```

Grafana:

```text
http://localhost:3001
```

Metrics:

```text
http://localhost:4000/metrics
```

---

## API Example

POST:

```text
/api/send
```

Request:

```json
{
    "requestId":"123",
    "to":"user@gmail.com",
    "message":"Hello",
    "channel":"email"
}
```

Response:

```json
{
   "success": true,
   "id":"xyz123"
}
```

---

## Scaling Workers

Run multiple workers:

```bash
docker compose up --scale worker=3
```

Kafka automatically distributes messages among workers using consumer groups.

---

## Future Improvements

* JWT Authentication
* Role-Based Access Control (RBAC)
* API key support
* Exponential backoff retry strategy
* Redis distributed rate limiting
* Kubernetes deployment

---

## Live Demo

API:

https://YOUR-RAILWAY-URL

GitHub:

https://github.com/Manikanta-kovvuri/distributed-notification-system
