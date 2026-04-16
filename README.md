# Hotel Booking REST API System

## Project Overview

This project implements a RESTful API for a hotel booking system using NestJS. The system supports user authentication, role-based access control (RBAC), room management, booking operations, and search functionality.

The system is designed following practical backend development principles, including:

- Secure authentication using JWT and password hashing
- Role-based authorization (Admin and User)
- Caching and rate limiting for performance and protection
- Automated testing (Unit, Integration, and End-to-End)
- Containerized deployment using Docker

---

## System Architecture

The application follows a modular architecture using NestJS modules. Each module is responsible for a specific domain:

- Auth Module – Handles user authentication and JWT generation
- Users Module – Manages user data and profiles
- Rooms Module – Provides room management and search functionality
- Bookings Module – Handles booking logic, validation, and status updates
- Notifications Module – Tracks booking-related events
- Health Module – Provides system health monitoring
- Prisma Module – Handles database access via Prisma ORM
- Security Module – Provides JWT services and role-based guards

### Tech Stack

- Backend Framework: NestJS
- Language: TypeScript
- Database: MySQL (via Prisma ORM)
- Authentication: JSON Web Token (JWT)
- Caching: Redis
- Rate Limiting: NestJS Throttler
- Testing: Jest and Supertest
- Containerization: Docker and Docker Compose

---
## Environment Setup and Installation

This section explains how to set up the project from scratch and run it locally.

---

### 1. Clone the Repository

```bash
git clone https://github.com/MUICT-Class/682-project-68_group16.git
cd 682-project-68_group16/app
```

---

### 2. Install Dependencies

From inside the `app/` folder:

```bash
npm install
```

---

### 3. Configure Environment Variables

This project uses different environment files for local development and Docker.

Create the following files before running the application.

---

#### 3.1 `app/.env` (Local Development)

Create a file named `.env` inside the `app/` folder:

```env
DATABASE_URL=mysql://<mysql_user>:<mysql_password>@localhost:3307/<mysql_database>
JWT_SECRET=<your_jwt_secret>
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Purpose:**
- Used when running the NestJS backend locally
- MySQL and Redis run in Docker, but the backend connects to them through `localhost`
- MySQL uses port `3307` because the container port `3306` is mapped to local port `3307`

---

#### 3.2 `app/.env.docker` (Docker Backend Environment)

Create a file named `.env.docker` inside the `app/` folder:

```env
DATABASE_URL=mysql://<mysql_user>:<mysql_password>@mysql:3306/<mysql_database>
JWT_SECRET=<your_jwt_secret>
PORT=3000
REDIS_HOST=redis
REDIS_PORT=6379
```

**Purpose:**
- Used when the backend itself runs inside Docker
- The backend connects to MySQL and Redis using Docker service names (`mysql`, `redis`)

---

#### 3.3 `infra/.env` (Docker Compose Infrastructure Environment)

Create a file named `.env` inside the `infra/` folder:

```env
DATABASE_URL=mysql://<mysql_user>:<mysql_password>@mysql:3306/<mysql_database>
MYSQL_ROOT_PASSWORD=<mysql_root_password>
MYSQL_DATABASE=<mysql_database>
MYSQL_USER=<mysql_user>
MYSQL_PASSWORD=<mysql_password>
```

Example with matching development values:

```env
DATABASE_URL=mysql://appuser:apppass@mysql:3306/final_project_db
MYSQL_ROOT_PASSWORD=rootpass
MYSQL_DATABASE=final_project_db
MYSQL_USER=appuser
MYSQL_PASSWORD=apppass
```

**Purpose:**
- Used by `docker-compose.yml`
- Configures the MySQL container and build-time database connection settings
- Must stay consistent with `app/.env` and `app/.env.docker`

---

### 4. Start Supporting Services (If you want to run with docker, you can skip to Step 8)

Before running the backend locally, MySQL and Redis must already be running.

From inside the `app/` folder, move to the `infra/` folder:

```bash
cd ../infra
```

Start only the supporting services:

```bash
docker compose up --build mysql redis
```

Or in detached mode:

```bash
docker compose up --build -d mysql redis
```

This starts:

- `final_project_mysql`
- `final_project_redis`

Then move back to the `app/` folder:

```bash
cd ../app
```

At this point:

- MySQL should be available at `localhost:3307`
- Redis should be available at `localhost:6379`

---

### 5. Prepare Prisma

From inside the `app/` folder, generate Prisma Client:

```bash
npx prisma generate
```

Then push the schema to the database:

```bash
npx prisma db push
```

These commands use the `DATABASE_URL` from `app/.env`.

---

### 6. Seed Initial Data (Optional)

This project includes a Prisma seed configuration. If you want to insert initial sample data, first build the project:

```bash
npm run build
```

Then run:

```bash
npx prisma db seed
```

This step is optional, but useful when you want preloaded sample records such as users or rooms.

---

### 7. Run the Application Locally

From inside the `app/` folder:

```bash
npm run start:dev
```

The API should then be available at:

```text
http://localhost:3000
```

Swagger documentation:

```text
http://localhost:3000/api-docs
```

Health check endpoint:

```text
http://localhost:3000/health
```

---

### 8. Run the Full Application with Docker

If you want to run the backend together with MySQL and Redis in Docker, go from `app/` to `infra/`:

```bash
cd ../infra
```

Then run:

```bash
docker compose up --build
```

This starts all services:

- `final_project_app`
- `final_project_mysql`
- `final_project_redis`

In this setup, the backend uses `app/.env.docker`, while Docker Compose uses `infra/.env`.

---

### 9. Summary of Environment Files

#### `app/.env`
Used when running the backend locally.

- API runs on your machine
- MySQL is accessed through `localhost:3307`
- Redis is accessed through `localhost:6379`

#### `app/.env.docker`
Used when the backend runs inside Docker.

- MySQL is accessed through Docker service name `mysql`
- Redis is accessed through Docker service name `redis`

#### `infra/.env`
Used by Docker Compose.

- Configures MySQL container credentials
- Provides database connection settings for Docker-based execution

---

### 10. Recommended Local Setup Order

```bash
git clone https://github.com/MUICT-Class/682-project-68_group16.git
cd 682-project-68_group16/app
npm install
cd ../infra
docker compose up --build -d mysql redis
cd ../app
npx prisma generate
npx prisma db push
npm run build
npx prisma db seed
npm run start:dev
```

If you do not need seed data, you may skip:

```bash
npm run build
npx prisma db seed
```
---
## API Usage Examples

This section provides example requests for the main API groups: authentication, rooms, bookings, users, and notifications.

For protected endpoints, include the JWT token in the request header:

```http
Authorization: Bearer <access_token>
```

---

### 1. Authentication

#### Register a Regular User

**Endpoint**

```http
POST /auth/register
```

**Request Body**

```json
{
  "username": "john_doe",
  "password": "password123",
  "role": "user"
}
```

**Example Response**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john_doe",
    "role": "user"
  }
}
```

---

#### Register an Admin

**Endpoint**

```http
POST /auth/register
```

**Request Body**

```json
{
  "username": "admin_demo",
  "password": "password123",
  "role": "admin"
}
```

**Example Response**

```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "admin_demo",
    "role": "admin"
  }
}
```

---

#### Login

**Endpoint**

```http
POST /auth/login
```

**Request Body**

```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Example Response**

```json
{
  "access_token": "your_jwt_token_here"
}
```

---

#### Logout

**Endpoint**

```http
POST /auth/logout
```

**Description**

This endpoint returns a logout success message. In the current implementation, logout on the client side is handled by removing the stored JWT token.

**Example Response**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 2. Rooms

#### Create a Room (Admin Only)

**Endpoint**

```http
POST /rooms
```

**Headers**

```http
Authorization: Bearer <admin_token>
```

**Request Body**

```json
{
  "name": "Ocean View Suite",
  "description": "A comfortable ocean-facing room.",
  "capacity": 2,
  "price_per_night": 1800,
  "image_url": "/images/ocean-view-suite.jpg",
  "is_active": true
}
```

**Example Response**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Ocean View Suite",
    "description": "A comfortable ocean-facing room.",
    "capacity": 2,
    "price_per_night": 1800,
    "image_url": "/images/ocean-view-suite.jpg",
    "is_active": true
  }
}
```

---

#### Get All Rooms

**Endpoint**

```http
GET /rooms
```

**Description**

Returns all rooms in the system.

---

#### Search Rooms

**Endpoint**

```http
GET /rooms/search
```

**Example Query**

```http
GET /rooms/search?keyword=Ocean&is_active=true&min_capacity=2&max_price=2000&limit=10&offset=0
```

**Description**

This endpoint searches rooms by keyword and filters them by active status, minimum capacity, maximum price, and pagination.

---

#### Get Room by ID

**Endpoint**

```http
GET /rooms/:id
```

**Example**

```http
GET /rooms/1
```

---

#### Update a Room (Admin Only)

**Endpoint**

```http
PUT /rooms/:id
```

**Headers**

```http
Authorization: Bearer <admin_token>
```

**Example Request Body**

```json
{
  "name": "Updated Ocean View Suite",
  "description": "Updated room description.",
  "capacity": 3,
  "price_per_night": 2200,
  "image_url": "/images/updated-ocean-view-suite.jpg",
  "is_active": true
}
```

---

#### Disable a Room (Admin Only)

**Endpoint**

```http
PATCH /rooms/:id/disable
```

**Headers**

```http
Authorization: Bearer <admin_token>
```

---

#### Enable a Room (Admin Only)

**Endpoint**

```http
PATCH /rooms/:id/enable
```

**Headers**

```http
Authorization: Bearer <admin_token>
```

---

#### Delete a Room (Admin Only)

**Endpoint**

```http
DELETE /rooms/:id
```

**Headers**

```http
Authorization: Bearer <admin_token>
```

---

### 3. Bookings

#### Create a Booking

**Endpoint**

```http
POST /bookings
```

**Headers**

```http
Authorization: Bearer <user_token>
```

**Request Body**

```json
{
  "room_id": 1,
  "start_date": "2026-05-20",
  "end_date": "2026-05-22",
  "guest_count": 2
}
```

**Description**

Creates a booking for the authenticated user. New bookings are created with `PENDING` status by default.

---

#### Get My Bookings

**Endpoint**

```http
GET /bookings
```

**Headers**

```http
Authorization: Bearer <user_token>
```

**Description**

- Regular users receive only their own bookings
- Admins receive all bookings

---

#### Search Bookings

**Endpoint**

```http
GET /bookings/search
```

**Headers**

```http
Authorization: Bearer <user_token>
```

**Example Query**

```http
GET /bookings/search?room_id=1&status=PENDING&start_date=2026-05-01&end_date=2026-05-30&limit=10&offset=0
```

---

#### Get Booking by ID

**Endpoint**

```http
GET /bookings/:id
```

**Headers**

```http
Authorization: Bearer <user_token>
```

---

#### Update My Booking

**Endpoint**

```http
PUT /bookings/:id
```

**Headers**

```http
Authorization: Bearer <user_token>
```

**Example Request Body**

```json
{
  "room_id": 2,
  "start_date": "2026-05-21",
  "end_date": "2026-05-23",
  "guest_count": 3
}
```

---

#### Admin Update Booking

**Endpoint**

```http
PUT /bookings/:id/admin
```

**Headers**

```http
Authorization: Bearer <admin_token>
```

**Example Request Body**

```json
{
  "status": "APPROVED"
}
```

**Possible statuses**
- `PENDING`
- `APPROVED`
- `CANCELLED`
- `PAID`

---

#### Delete a Booking

**Endpoint**

```http
DELETE /bookings/:id
```

**Headers**

```http
Authorization: Bearer <user_token>
```

**Description**

- Regular users can delete only their own bookings
- Admins can delete any booking

---

### 4. Users

#### Get Current User Profile

**Endpoint**

```http
GET /users/me
```

**Headers**

```http
Authorization: Bearer <access_token>
```

---

#### Update Current User Profile

**Endpoint**

```http
PUT /users/me
```

**Headers**

```http
Authorization: Bearer <access_token>
```

**Example Request Body**

```json
{
  "username": "john_doe_new"
}
```

---

#### Get All Users (Admin Only)

**Endpoint**

```http
GET /users
```

**Headers**

```http
Authorization: Bearer <admin_token>
```

---

#### Get User by ID (Admin Only)

**Endpoint**

```http
GET /users/:id
```

**Headers**

```http
Authorization: Bearer <admin_token>
```

---

#### Admin Update User (Admin Only)

**Endpoint**

```http
PUT /users/:id/admin
```

**Headers**

```http
Authorization: Bearer <admin_token>
```

**Example Request Body**

```json
{
  "username": "john_doe_updated",
  "role": "admin"
}
```

---

#### Delete User (Admin Only)

**Endpoint**

```http
DELETE /users/:id
```

**Headers**

```http
Authorization: Bearer <admin_token>
```

---

### 5. Notifications

#### Get Notifications

**Endpoint**

```http
GET /notifications
```

**Headers**

```http
Authorization: Bearer <access_token>
```

**Description**

- Regular users receive only their own notifications
- Admins receive all notifications

**Example Response**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 2,
      "booking_id": 5,
      "type": "BOOKING_CREATED",
      "message": "Booking #5 has been created successfully.",
      "created_at": "2026-04-14T10:45:00.000Z"
    }
  ]
}
```

---

## Example End-to-End Flow

The following example shows a realistic flow from registration to room booking, notification retrieval, and booking deletion.

### Step 1: Admin registers

```http
POST /auth/register
```

```json
{
  "username": "admin_demo",
  "password": "password123",
  "role": "admin"
}
```

---

### Step 2: Admin logs in

```http
POST /auth/login
```

```json
{
  "username": "admin_demo",
  "password": "password123"
}
```

Save the returned token as `<admin_token>`.

---

### Step 3: Admin creates a room

```http
POST /rooms
Authorization: Bearer <admin_token>
```

```json
{
  "name": "Ocean View Suite",
  "description": "A comfortable ocean-facing room.",
  "capacity": 2,
  "price_per_night": 1800,
  "image_url": "/images/ocean-view-suite.jpg",
  "is_active": true
}
```

Assume the returned room ID is `1`.

---

### Step 4: Regular user registers

```http
POST /auth/register
```

```json
{
  "username": "john_doe",
  "password": "password123",
  "role": "user"
}
```

---

### Step 5: Regular user logs in

```http
POST /auth/login
```

```json
{
  "username": "john_doe",
  "password": "password123"
}
```

Save the returned token as `<user_token>`.

---

### Step 6: User searches rooms

```http
GET /rooms/search?keyword=Ocean&is_active=true&min_capacity=2&max_price=2000&limit=10&offset=0
```

---

### Step 7: User creates a booking

```http
POST /bookings
Authorization: Bearer <user_token>
```

```json
{
  "room_id": 1,
  "start_date": "2026-05-20",
  "end_date": "2026-05-22",
  "guest_count": 2
}
```

---

### Step 8: User checks own bookings

```http
GET /bookings
Authorization: Bearer <user_token>
```

---

### Step 9: User checks notifications

```http
GET /notifications
Authorization: Bearer <user_token>
```

At this point, the user should see a notification such as:

```json
{
  "type": "BOOKING_CREATED",
  "message": "Booking #1 has been created successfully."
}
```

---

### Step 10: User deletes the booking

```http
DELETE /bookings/1
Authorization: Bearer <user_token>
```

---

### Step 11: User checks notifications again

```http
GET /notifications
Authorization: Bearer <user_token>
```

At this point, the user should also see a deletion-related notification recorded by the system.

This flow is also used as the basis of the end-to-end test implementation.
---

## Testing

All tests in this project are executed **locally** using Node.js, while MySQL and Redis run in Docker containers.

This means:
- The backend application runs locally (`npm run test:*`)
- Only supporting services (MySQL and Redis) are started via Docker
- The full Docker setup (`docker compose up --build`) is **not required** for testing

The application connects to MySQL via `localhost:3307` and Redis via `localhost:6379` during testing.

---

### Prerequisites

Before running any tests, ensure that MySQL and Redis are running:

```bash
cd ../infra
docker compose up -d mysql redis
cd ../app
```

These services provide the database and cache required for integration and E2E testing.

---

### Test Commands

Run the following commands from the `app/` folder:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:all
```

---

### 1. Unit Testing

**Purpose**

Unit tests verify core business logic in isolation by mocking dependencies.

**Scope**

- Booking validation logic
- Date conflict detection
- Role-based authorization logic
- Status transitions (e.g., PENDING → APPROVED)

**Implementation**

- Located inside `src/` folders as:
  - `*.service.spec.ts`
  - `*.controller.spec.ts`
- Uses:
  - `@nestjs/testing`
  - `jest.fn()` for mocking services
- Does not use real database or external services

**Example**

- BookingService prevents overlapping bookings
- Controller correctly wraps responses

---

### 2. Integration Testing

**Purpose**

Integration tests verify that API endpoints work correctly with real services and database.

**Scope**

- User registration and login
- Room CRUD operations (Admin)
- Booking creation and conflict prevention
- Booking retrieval and search
- Authorization behavior

**Implementation**

- Located in:

```text
test/integration/
```

- Uses:
  - Real Prisma + MySQL database
  - `supertest` for HTTP testing
- Tests full request flow:
  - Controller → Service → Database

---

**Prerequisites**

Before running integration tests:

- MySQL and Redis containers must be running:

```bash
cd ../infra
docker compose up -d mysql redis
cd ../app
```

- Database schema must already be initialized (see Environment Setup section)

---

**Cleanup**

- Each test cleans up inserted data using Prisma
- Prevents data contamination between test runs
- Ensures tests are repeatable and independent

---

### 3. End-to-End (E2E) Testing

**Purpose**

E2E tests simulate real user behavior across the full system.

**Scope**

- Full user flow:
  - Register → Login → Search Rooms → Create Booking → Delete Booking
- Validates:
  - API responses
  - Database state
  - Notification generation

**Implementation**

- Located in:

```text
test/booking-flow.e2e-spec.ts
```

- Uses:
  - Full NestJS application
  - Real database
  - `supertest`

**Example Flow**

1. Admin registers and logs in
2. Admin creates a room
3. User registers and logs in
4. User searches available rooms
5. User creates a booking
6. User retrieves bookings
7. User deletes booking
8. System verifies notifications

---

### Test Data Cleanup

All tests ensure cleanup after execution:

- Users, rooms, bookings, and notifications are deleted after each test
- Prevents interference between test runs
- Ensures repeatable results

---

### Notes

- Unit tests do not require database
- Integration and E2E tests require:
  - MySQL running in Docker
  - Prisma schema initialized
- If Docker volume is reset, reinitialize database:

```bash
npx prisma generate
npx prisma db push
```

### Test Results

All test categories were executed successfully using the provided npm scripts.

**Summary**

- Unit Tests: Passed
- Integration Tests: Passed
- End-to-End (E2E) Tests: Passed

The tests cover:
- Core business logic (validation, conflict detection, role checks)
- API endpoint behavior with real database interaction
- Full user workflow from registration to booking and deletion

---

**Sample Output**

```bash
PASS  test/booking-flow.e2e-spec.ts
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

---

**Result Interpretation**

- All endpoints behave as expected under test conditions
- Database state is correctly updated and verified during tests
- The system successfully handles real-world scenarios such as:
  - user registration and authentication
  - room management
  - booking creation and deletion
  - notification generation

These results demonstrate that the system meets the requirements for reliability and maintainability as specified in NFR-13.

---

## Docker Build and Run

This project provides a Docker-based setup for running the backend API together with its supporting services.

The Docker environment contains three services:

- `api` – NestJS backend application
- `mysql` – MySQL database
- `redis` – Redis cache

---

### Docker Compose Services

The `docker-compose.yml` file is located in the `infra/` folder and defines the following services:

- **api**
  - Builds the NestJS application from `../app/Dockerfile`
  - Uses environment variables from `app/.env.docker`
  - Exposes port `3000`
  - Depends on MySQL and Redis
  - Includes a health check using `/health`

- **mysql**
  - Uses the official `mysql:8.0` image
  - Exposes MySQL through local port `3307`
  - Persists database data using a Docker volume
  - Includes a health check

- **redis**
  - Uses the official `redis:7-alpine` image
  - Exposes Redis through local port `6379`
  - Persists cache data using a Docker volume

---

### Dockerfile Overview

The backend uses a multi-stage Dockerfile:

#### Stage 1: Builder
- Uses `node:20-alpine`
- Installs dependencies with `npm ci`
- Generates Prisma Client
- Builds the NestJS application with `npm run build`

#### Stage 2: Production
- Uses `node:20-alpine`
- Installs production dependencies only with `npm ci --omit=dev`
- Generates Prisma Client again for the production image
- Copies compiled files from the builder stage
- Exposes port `3000`
- Runs:
  - `npx prisma db push`
  - `npx prisma db seed`
  - `node dist/src/main.js`

This approach keeps the final image smaller and more suitable for deployment.

---

### Build and Run with Docker Compose

From inside the `app/` folder, move to the `infra/` folder:

```bash
cd ../infra
```

To build and run the full system:

```bash
docker compose up --build
```

To run in detached mode:

```bash
docker compose up --build -d
```

This starts:
- `final_project_app`
- `final_project_mysql`
- `final_project_redis`

---

### Run Only Supporting Services

For local development and local test execution, only MySQL and Redis are required in Docker.

From inside the `app/` folder:

```bash
cd ../infra
docker compose up -d mysql redis
cd ../app
```

In this mode:
- the backend runs locally
- MySQL runs in Docker
- Redis runs in Docker

---

### Stop Docker Services

To stop the containers:

```bash
cd ../infra
docker compose down
```

To stop the containers and remove volumes:

```bash
docker compose down -v
```

**Note:**  
If Docker volumes are removed, the database schema will also be removed. In that case, you must reinitialize Prisma before running the application or tests again.

---

## Deployment

The system is deployed on a server using Docker and Nginx.

### Deployment Environment

- Backend API runs in Docker
- MySQL runs in Docker
- Redis runs in Docker
- Nginx is used as a reverse proxy

### Deployment Flow

1. Clone the project on the target server
2. Configure environment variables
3. Build and start the Docker services
4. Use Nginx to forward incoming requests to the backend API
5. Verify deployment using the `/health` endpoint

---

### Deployment Command

From the `infra/` folder on the server:

```bash
docker compose up --build -d
```

---

### Deployment Access

The deployed API is exposed through Nginx.

Replace `<server-ip>` with the actual server IP address provided in the deployment environment.

Example base URL:

```text
http://<server-ip>/api
```

For this project deployment:

```text
http://10.34.112.129/api
```

Swagger documentation:

```text
http://<server-ip>/api/api-docs
```

Project Swagger URL:

```text
http://10.34.112.129/api/api-docs
```

Health check endpoint:

```text
http://<server-ip>/api/health
```

Project Health Check:

```text
http://10.34.112.129/api/health
```

---

**Note:**  
The deployed API is accessible only within the MU-WiFi network.

---

### Deployment Architecture

The deployment uses the following structure:

```text
Client
  │
  ▼
Nginx Reverse Proxy
  │
  ▼
NestJS API Container
  │
  ├── MySQL Container
  └── Redis Container
```

This architecture allows:
- clean separation of services
- easier deployment and maintenance
- production-like environment configuration
- health monitoring through the API health check endpoint

---

## Caching and Rate Limiting

This project applies both caching and rate limiting to improve performance and system stability.

---

### Caching Strategy

Caching is applied to frequently accessed room endpoints using NestJS `CacheInterceptor`.

**Cached endpoints:**
- `GET /rooms`
- `GET /rooms/search`

**Implementation**
- `@UseInterceptors(CacheInterceptor)`
- `@CacheTTL(1000 * 10)`

**Reasoning**

These two endpoints are likely to receive frequent repeated requests from users browsing available rooms. Caching helps reduce repeated database queries and improves response time when many users access the same room data at the same time.

A short cache duration of **10 seconds** was chosen as a balance between performance and freshness:

- short enough to reduce the risk of stale room information
- long enough to reduce unnecessary repeated reads under concurrent access

For example, if an admin creates, updates, disables, or deletes a room, users will not keep seeing outdated room data for an excessively long time. A longer cache duration such as several minutes would improve performance further, but would increase the risk of users seeing outdated room availability. Therefore, a short TTL is more appropriate for this system.

---

### Rate Limiting Strategy

Rate limiting is applied using NestJS Throttler to reduce abuse and improve robustness on booking-related endpoints.

**Rate-limited endpoints:**
- `GET /bookings`
- `GET /bookings/search`

**Implementation**
- `@Throttle({ default: { limit: 100, ttl: 60000 } })`

This configuration allows up to **100 requests per 60 seconds** per client.

**Reasoning**

These booking endpoints are protected endpoints that return user-specific or admin-visible booking data. They may be accessed repeatedly by frontend interfaces such as booking history pages, dashboard views, or filtered search screens.

The chosen limit is intended to balance normal usability and protection:

- high enough for legitimate users and frontend refresh activity
- low enough to reduce excessive polling or abusive repeated requests
- helps protect the backend and database from unnecessary load

This is especially useful for search endpoints, which may otherwise be triggered repeatedly in a short period of time.

---

### Summary

- Caching improves performance for frequently accessed room data
- A short TTL helps preserve data freshness
- Rate limiting reduces abuse and excessive repeated requests
- Together, these strategies improve performance, scalability, and system stability

---

### Performance Testing

Basic performance testing was conducted using `autocannon` to evaluate system responsiveness under concurrent load.

---

**Test Setup**

- Tool: `autocannon`
- Duration: 20 seconds
- Concurrent connections: 100
- Target endpoints:
  - `GET /rooms`
  - `GET /rooms/search`

---

**Test Commands**

```bash
npx autocannon -c 100 -d 20 http://localhost:3000/rooms

npx autocannon -c 100 -d 20 "http://localhost:3000/rooms/search?keyword=Ocean&is_active=true&min_capacity=2&max_price=2000&limit=10&offset=0"
```

---

**Results Summary**

| Endpoint | Avg Latency | Requests/sec | Notes |
|----------|------------|-------------|------|
| `/rooms` | ~21.55 ms | ~4532 req/sec | Cached response |
| `/rooms/search` | ~21.07 ms | ~4635 req/sec | Cached response |

Both endpoints maintained low average latency (~20–22 ms) even under 100 concurrent connections.

---

**Observation on Non-2xx Responses**

A significant number of requests returned non-2xx responses during testing.

This is expected because:

- A global rate limit is applied:
  - 10,000 requests per minute
- The test generated over 90,000 requests in 20 seconds

As a result:
- Excess requests were throttled (likely HTTP 429)
- The system remained stable and responsive instead of being overloaded

---

**Interpretation**

- Cached endpoints handled high concurrency efficiently
- Average latency remained low, indicating fast response times
- Rate limiting successfully prevented excessive load on the system
- The system maintained stability even under aggressive traffic conditions

These results demonstrate that the system satisfies performance-related requirements, including handling concurrent users and maintaining reasonable response times.

## 👥 Team

68_Group16  
6688125 Nanthit Temkulkiat
