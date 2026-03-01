# Servio Vapi Connector

Bridge between external Vapi phone assistant and Servio backend.

## API Credentials
- **Base URL:** https://servio-backend-zexb.onrender.com
- **API Key:** sk_live_JBL8c15YgjU_H-zSQmyTWJL5dutg0JX7bJv3D4GV3h0

## How It Works
1. Customer calls Vapi phone number (908-290-0383)
2. Vapi assistant (Groq-powered) handles conversation
3. For order/menu requests, calls Servio API
4. Creates orders directly in Servio kitchen display

## Endpoints Used
- GET /api/menu/search?q={query} — Search menu items
- POST /api/orders — Create order
- GET /api/orders/{id} — Check order status
- GET /api/customers/lookup?phone={number} — Identify returning customers

## Restaurant ID
- Sashey's Kitchen: sasheys-kitchen-union
