/**
 * Servio Vapi Webhook Server
 * Bridges Vapi phone calls to Servio backend API
 */

const express = require('express');
const app = express();

app.use(express.json());

const SERVIO_BASE_URL = 'https://servio-backend-zexb.onrender.com';
const SERVIO_API_KEY = 'sk_live_JBL8c15YgjU_H-zSQmyTWJL5dutg0JX7bJv3D4GV3h0';
const RESTAURANT_ID = 'sasheys-kitchen-union';

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Servio Vapi Webhook is running!' });
});

// Main webhook endpoint
app.post('/webhook', async (req, res) => {
  const { message } = req.body;
  
  console.log('📞 Vapi webhook received:', message?.type);
  
  try {
    switch (message?.type) {
      case 'assistant-request':
        return await handleAssistantRequest(message, res);
      
      case 'function-call':
        return await handleFunctionCall(message, res);
      
      case 'tool-calls':
        return await handleToolCalls(message, res);
      
      case 'end-of-call-report':
        console.log('Call ended:', message.call?.id);
        return res.json({ result: 'logged' });
      
      default:
        return res.json({ result: 'acknowledged' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.json({ error: 'Internal error' });
  }
});

// Handle initial greeting
async function handleAssistantRequest(message, res) {
  const customerPhone = message.call?.customer?.number;
  
  // Lookup customer
  let greeting = "Thank you for calling Sashey's Kitchen! This is Servio. How can I help you today?";
  
  if (customerPhone) {
    try {
      const customerRes = await fetch(
        `${SERVIO_BASE_URL}/api/customers/lookup?phone=${encodeURIComponent(customerPhone)}`,
        { headers: { 'Authorization': `Bearer ${SERVIO_API_KEY}` } }
      );
      const customerData = await customerRes.json();
      
      if (customerData.found && customerData.customer?.name) {
        greeting = `Hi ${customerData.customer.name}! Welcome back to Sashey's Kitchen. This is Servio. How can I help you today?`;
      }
    } catch (e) {
      console.log('Customer lookup failed:', e.message);
    }
  }
  
  res.json({ result: greeting });
}

// Handle function calls
async function handleFunctionCall(message, res) {
  const { name, parameters } = message.functionCall || {};
  const result = await executeTool(name, parameters, message);
  res.json(result.error ? { error: result.error } : { result: JSON.stringify(result) });
}

// Handle tool calls
async function handleToolCalls(message, res) {
  const toolCalls = message.toolCalls || [];
  const results = [];
  
  for (const tool of toolCalls) {
    const { name, parameters, id } = tool;
    const result = await executeTool(name, parameters, message);
    
    results.push({
      name: name || 'unknown',
      toolCallId: id,
      result: JSON.stringify(result)
    });
  }
  
  res.json({ results });
}

// Execute Servio API tools
async function executeTool(name, parameters, message) {
  console.log('🔧 Executing tool:', name, parameters);
  
  try {
    switch (name) {
      case 'lookupCustomer': {
        const phone = parameters?.phone || message?.call?.customer?.number;
        if (!phone) return { ok: false, error: 'No phone number' };
        
        const res = await fetch(
          `${SERVIO_BASE_URL}/api/customers/lookup?phone=${encodeURIComponent(phone)}`,
          { headers: { 'Authorization': `Bearer ${SERVIO_API_KEY}` } }
        );
        return await res.json();
      }
      
      case 'searchMenu': {
        const query = (parameters?.query || parameters?.q || '').toLowerCase();
        
        // Fetch full public menu
        const menuRes = await fetch(
          `${SERVIO_BASE_URL}/api/menu/public/${RESTAURANT_ID}`,
          { headers: { 'Authorization': `Bearer ${SERVIO_API_KEY}` } }
        );
        const menuData = await menuRes.json();
        const allItems = menuData?.data?.items || [];
        
        // Filter by query
        const filtered = allItems.filter(item => 
          item.name.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          (item.category_name && item.category_name.toLowerCase().includes(query))
        );
        
        // Format for AI
        const formatted = filtered.slice(0, 5).map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          fromPrice: item.fromPrice || item.price,
          sizes: item.sizes || [],
          category: item.category_name,
          isAvailable: item.is_available,
          description: item.description
        }));
        
        return { ok: true, items: formatted, count: filtered.length };
      }
      
      case 'getMenuItem': {
        const itemId = parameters?.itemId || parameters?.id;
        
        // Fetch from public menu
        const menuRes = await fetch(
          `${SERVIO_BASE_URL}/api/menu/public/${RESTAURANT_ID}`,
          { headers: { 'Authorization': `Bearer ${SERVIO_API_KEY}` } }
        );
        const menuData = await menuRes.json();
        const allItems = menuData?.data?.items || [];
        
        const item = allItems.find(i => i.id === itemId || i.name.toLowerCase() === itemId.toLowerCase());
        
        if (item) {
          return { 
            ok: true, 
            found: true, 
            item: {
              id: item.id,
              name: item.name,
              price: item.price,
              fromPrice: item.fromPrice || item.price,
              sizes: item.sizes || [],
              category: item.category_name,
              description: item.description,
              isAvailable: item.is_available
            }
          };
        }
        return { ok: true, found: false };
      }
      
      case 'getItemModifiers': {
        const itemId = parameters?.itemId;
        
        // Fetch from public menu
        const menuRes = await fetch(
          `${SERVIO_BASE_URL}/api/menu/public/${RESTAURANT_ID}`,
          { headers: { 'Authorization': `Bearer ${SERVIO_API_KEY}` } }
        );
        const menuData = await menuRes.json();
        const allItems = menuData?.data?.items || [];
        
        const item = allItems.find(i => i.id === itemId || i.name.toLowerCase() === itemId.toLowerCase());
        
        if (item) {
          const modifiers = {
            sizes: item.sizes || [],
            hasMultipleSizes: (item.sizes || []).length > 1,
            sides: ['White Rice', 'Rice and Peas', 'Cabbage', 'Festival', 'Mac and Cheese', 'Plantains'],
            gravyTypes: ['Brown', 'Red', 'Jerk', 'Curry'],
            gravyAmounts: ['None', 'Light', 'Moderate', 'A lot']
          };
          return { ok: true, modifiers, itemName: item.name };
        }
        return { ok: false, error: 'Item not found' };
      }
      
      case 'quoteOrder': {
        const res = await fetch(
          `${SERVIO_BASE_URL}/api/orders/quote`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SERVIO_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...parameters, restaurantId: RESTAURANT_ID })
          }
        );
        return await res.json();
      }
      
      case 'createOrder': {
        const customerPhone = parameters?.customer?.phone || message?.call?.customer?.number;
        
        console.log('[Servio] Creating order FAST...');
        
        // Build order payload
        const orderPayload = {
          restaurantId: RESTAURANT_ID,
          channel: 'phone',
          externalId: `vapi-${Date.now()}`,
          items: parameters?.items || [],
          totalAmount: parameters?.total || parameters?.totalAmount || 0,
          customerName: parameters?.customer?.name || 'Phone Customer',
          customerPhone: customerPhone,
          status: 'received',
          source: 'vapi_phone'
        };
        
        // Create order with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          const res = await fetch(
            `${SERVIO_BASE_URL}/api/orders`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SERVIO_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(orderPayload),
              signal: controller.signal
            }
          );
          
          clearTimeout(timeout);
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('[Servio] Create order failed:', errorData);
            return { ok: false, error: 'Failed to create order - please try again' };
          }
          
          const data = await res.json();
          const orderId = data.id || data.orderId || 'N/A';
          
          console.log('[Servio] Order created:', orderId);
          
          return { 
            ok: true, 
            orderId: orderId,
            total: data.total || orderPayload.totalAmount,
            message: `Perfect! Your order number is ${orderId.slice(-4)}. It'll be ready in about 15 minutes!`
          };
        } catch (error) {
          clearTimeout(timeout);
          console.error('[Servio] Order creation error:', error.message);
          return { ok: false, error: 'Connection issue - please try again' };
        }
      }
      
      case 'checkOrderStatus': {
        const orderId = parameters?.orderId;
        const res = await fetch(
          `${SERVIO_BASE_URL}/api/orders/${orderId}`,
          { headers: { 'Authorization': `Bearer ${SERVIO_API_KEY}` } }
        );
        const data = await res.json();
        return { ok: true, status: data.status, order: data };
      }
      
      case 'getStoreStatus': {
        const res = await fetch(
          `${SERVIO_BASE_URL}/api/restaurants/${RESTAURANT_ID}/status`,
          { headers: { 'Authorization': `Bearer ${SERVIO_API_KEY}` } }
        );
        const data = await res.json();
        return { ok: true, status: data.status || (data.open ? 'open' : 'closed'), hours: data.hours };
      }
      
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error('Tool execution error:', error);
    return { ok: false, error: error.message };
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servio Vapi Webhook running on port ${PORT}`);
});
