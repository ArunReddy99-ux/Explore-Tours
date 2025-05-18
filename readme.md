# Natours Application

A complete travel booking platform built with **Node.js**, **Express.js**, **MongoDB**, and **Mongoose**.  
This project features RESTful APIs, authentication, authorization, Stripe payments, reviews, and server-rendered views.

---
## Technologies Used

- **Node.js** — JavaScript runtime
- **Express.js** — Web framework
- **MongoDB** — NoSQL database
- **Mongoose** — MongoDB ODM
- **Pug** — Templating engine for server-rendered views
- **Stripe** — Payment processing
- **JWT** — Authentication
- **bcryptjs** — Password hashing
- **Helmet, xss-clean, express-rate-limit, hpp, mongo-sanitize** — Security
-----------
## Project Structure
 
#### Natours--alongwithBackend/
│
├── controllers/         # Route controllers (business logic)   
├── models/              # Mongoose models  
├── public/              # Static assets (JS, CSS, images)  
├── routes/              # Express route definitions   
├── utils/               # Utility modules  
├── views/               # Pug templates for server-rendered pages  
├── app.js               # Express app setup  
├── server.js            # App entry point  
├── config.env           # Environment variables  
└── readme.md            # Project documentation  
-------------
## API Reference

### Tour Endpoints

| Method | Endpoint                  | Description                | Access      |
|--------|---------------------------|----------------------------|-------------|
| GET    | /api/v1/tours`           | Get all tours              | Public      |
| GET    | /api/v1/tours/:id`       | Get a single tour by ID    | Public      |
| POST   | /api/v1/tours`           | Create a new tour          | Admin/Lead  |
| PATCH  | /api/v1/tours/:id`       | Update a tour              | Admin/Lead  |
| DELETE | /api/v1/tours/:id`       | Delete a tour              | Admin/Lead  |


 **Example:**
http
GET /api/v1/tours
**Response:**  
json
{
  "status": "success",
  "results": 2,  
  "data": {
    "tours": [  
      { "_id": "...", "name": "The Forest Hiker",...},  
      { "_id": "...", "name": "The Sea Explorer", ... }
    ]
  }
}
------
### User & Auth Endpoints

| Method | Endpoint                      | Description                | Access      |
|--------|-------------------------------|----------------------------|-------------|
| POST   | /api/v1/users/signup        | Register new user          | Public      |
| POST   | /api/v1/users/login         | Login user                 | Public      |
| GET    | /api/v1/users/logout        | Logout user                | Auth        |
| PATCH  | /api/v1/users/updateMe      | Update user data           | Auth        |
| PATCH  | /api/v1/users/updateMyPassword| Update password         | Auth        |
| DELETE | /api/v1/users/deleteMe      | Delete user account        | Auth        |
| GET    | /api/v1/users/me            | Get current user profile   | Auth        |
| GET    | /api/v1/users               | Get all users              | Admin       |
| PATCH  | /api/v1/users/:id           | Update user by ID          | Admin       |
| DELETE | /api/v1/users/:id           | Delete user by ID          | Admin       |

**Example:**
http
POST /api/v1/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

**Response:**
json
{
  "status": "success",
  "token": "jwt_token_here",
  "data": {
    "user": { "_id": "...", "name": "User", "email": "user@example.com" }
  }
}
--------------------
### Review Endpoints

| Method | Endpoint                                | Description                | Access      |
|--------|-----------------------------------------|----------------------------|-------------|
| GET    | /api/v1/reviews                     | Get all reviews            | Public      |
| POST   | /api/v1/tours/:tourId/reviews         | Create review for a tour   | Auth        |
| PATCH  | /api/v1/reviews/:id                   | Update a review            | Owner/Admin |
| DELETE | /api/v1/reviews/:id                   | Delete a review            | Owner/Admin |

**Example:**
http
POST /api/v1/tours/5c88fa8cf4afda39709c2955/reviews   
Content-Type: application/json

{
  "review": "Amazing tour!",
  "rating": 5
}
----------------------------
### Booking Endpoints

| Method | Endpoint                                | Description                | Access      |
|--------|-----------------------------------------|----------------------------|-------------|
| GET    |/api/v1/bookings                      | Get all bookings           | Admin/Lead  |
| GET    | /api/v1/bookings/:id                  | Get a booking              | Admin/Lead  |
| POST   | /api/v1/bookings                      | Create a booking           | Auth        |
| DELETE | /api/v1/bookings/:id                  | Delete a booking           | Admin/Lead  |

**Stripe Checkout:**
- To book a tour, the frontend calls:
  
  GET /api/v1/bookings/checkout-session/:tourId
  
  This returns a Stripe session for payment.
------------------------------

## Frontend Views

- / — Overview of all tours
- /tour/:slug — Details for a specific tour
- login — Login page
- /me — User account page
- /my-tours — User's booked tours

---

## Security Features

- **Rate Limiting**: Prevents brute-force attacks.
- **Data Sanitization**: Protects against NoSQL injection and XSS.
- **HTTP Headers**: Uses Helmet for secure headers.
- **Parameter Pollution**: Prevents HTTP parameter pollution.
- **Authentication**: JWT-based, with role-based access control


## How It Is Implemented

### 1. Project Architecture

- **MVC Pattern:**  
  The project follows the Model-View-Controller (MVC) architecture:
  - **Models:** Define data schemas and interact with MongoDB using Mongoose (e.g., Tour, User, Review, Booking).
  - **Controllers:** Contain business logic for each resource (e.g., creating a tour, logging in a user).
  - **Routes:** Define API endpoints and connect them to controllers.
  - **Views:** Rendered using Pug templates for frontend pages.

---

### 2. Request Flow

1. **Client Request:**  
   The user (browser or API client) sends a request to the server (e.g., visiting "/login" or calling "/api/v1/tours").

2. **Routing:**  
   Express receives the request and matches the URL to a route in "app.js":
   js
   app.use('/', viewRouter);
   app.use('/api/v1/tours', tourRouter); 
   app.use('/api/v1/users', userRouter);  
   app.use('/api/v1/reviews', reviewRouter);
   app.use('/api/v1/bookings', bookingRouter);
   Each router handles a specific resource and delegates to the appropriate controller.

4. **Middleware:**  
   Before reaching the controller, requests pass through global middleware for:
   - Security (Helmet, rate limiting, sanitization)
   - Parsing JSON and cookies
   - Logging and compression

6. **Controller Logic:**  
   The controller processes the request:
   - Validates and sanitizes input
   - Interacts with the database via Mongoose models
   - Handles authentication and authorization (if needed)
   - Returns a JSON response (for API) or renders a Pug view (for frontend)

7. **Database Interaction:**  
   Controllers use Mongoose models to query or update MongoDB.  
   Example:  
   js
   const tours = await Tour.find();
   

8. **Response:**  
   - For API routes: Sends a JSON response with status, data, and messages.
   - For view routes: Renders a Pug template with dynamic data.

---

### 3. Authentication & Authorization

- **Signup/Login:**  
  Users register or log in via "/api/v1/users/signup" and "/api/v1/users/login".  
  Passwords are hashed with bcrypt.  
  On login, a JWT is issued and sent as an HTTP-only cookie.

- **Protecting Routes:**  
  Middleware checks for a valid JWT before allowing access to protected routes (e.g., updating user data, booking a tour).

- **Role-Based Access:**  
  Certain actions (like creating or deleting tours) are restricted to admin or lead-guide roles.

---

### 4. Payments

- **Stripe Integration:**  
  When a user books a tour, the backend creates a Stripe Checkout session.  
  After successful payment, a booking is created in the database.

---

### 5. Frontend Rendering

- **Pug Templates:**  
  The views/ folder contains Pug files for pages like overview, tour details, login, and account.
- **Static Assets:**  
  CSS and JS files in public/ are served statically.

---

### 6. Error Handling

- All errors are caught and handled by a global error handler.
- Custom AppError  class is used for operational errors.

---

### 7. Example: Creating a Tour (API)

1. **Request:**  
   "POST /api/v1/tours" with tour data (admin/lead-guide only)
2. **Middleware:**  
   - JWT authentication
   - Role check
   - Data validation
3. **Controller:**  
   - Validates input
   - Creates a new Tour document in MongoDB
   - Returns the created tour in the response

---

### 8. Example: User Login (API)

1. **Request:**  
   "POST /api/v1/users/login" with email and password
2. **Controller:**  
   - Checks credentials
   - Issues JWT if valid
   - Sets JWT as HTTP-only cookie
   - Returns user data and token

---

### 9. Example: Booking a Tour (Frontend)

1. **User clicks "Book Tour"** on the frontend.
2. **Frontend JS** calls "/api/v1/bookings/checkout-session/:tourId".
3. **Backend** creates a Stripe session and redirects the user to Stripe Checkout.
4. **After payment**, user is redirected back and a booking is created.

---


