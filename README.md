# 🚀 Distributed Notification System

[![Architecture: Event-Driven](https://img.shields.io/badge/Architecture-Event--Driven-blue.svg)](https://en.wikipedia.org/wiki/Event-driven_architecture)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-231F20?style=flat&logo=apache-kafka&logoColor=white)](https://kafka.apache.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

A production-grade, fault-tolerant notification pipeline designed to process events asynchronously at scale. Inspired by architectures used at Netflix and Uber, this system demonstrates how to build a reliable backend using event streaming, horizontal scaling, consumer group balancing, and dead-letter queues.

## 📑 Table of Contents
- [About the Project](#-about-the-project)
- [System Architecture](#-system-architecture)
- [Core Features](#-core-features)
- [Design Decisions & Tradeoffs](#-design-decisions--tradeoffs)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Observability](#-observability)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)

---

## 🧠 About the Project

Modern distributed backend systems require reliable, asynchronous event processing to decouple core application flows from peripheral tasks. This system implements an **Event-Driven Architecture (EDA)** to handle notifications (SMS, Email, Push). 

It ensures high throughput and reliability while gracefully handling transient failures, network partitions, and traffic spikes without degrading the performance of the upstream client-facing API.

---

## 🏛 System Architecture

The architecture follows a decoupled **Producer-Broker-Consumer** pattern. 

```mermaid
graph TD
    Client[Client Request] -->|POST /notify| API[API Service Producer]
    API -->|1. Validate & Save PENDING| DB[(MongoDB)]
    API -->|2. Publish Event| Kafka[Kafka Broker]
    
    Kafka -->|Topic: notifications| Worker[Worker Service Consumer]
    Worker -->|Check Idempotency| DB
    
    Worker -->|Success| SuccessState[Update DB: SENT]
    SuccessState --> DB
    
    Worker -.->|Transient Failure| RetryTopic[Topic: notifications_retry]
    RetryTopic -.-> Worker
    
    Worker == Terminal Failure ==> DLQ[Topic: notifications_dlq]
