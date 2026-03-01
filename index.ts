/**
 * Servio Vapi Connector
 * Bridges external Vapi phone assistant to Servio backend API
 */

const SERVIO_BASE_URL = 'https://servio-backend-zexb.onrender.com';
const SERVIO_API_KEY = 'sk_live_JBL8c15YgjU_H-zSQmyTWJL5dutg0JX7bJv3D4GV3h0';
const RESTAURANT_ID = 'sasheys-kitchen-union';

// Tool handlers for Vapi -> Servio integration
export const servioTools = {
  /**
   * Search menu items
   */
  async searchMenu(query: string) {
    try {
      const response = await fetch(
        `${SERVIO_BASE_URL}/api/menu/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${SERVIO_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return {
        ok: true,
        items: data.items || data,
        count: (data.items || data).length
      };
    } catch (error) {
      console.error('[Servio] searchMenu error:', error);
      return {
        ok: false,
        error: 'Failed to search menu',
        items: []
      };
    }
  },

  /**
   * Get menu item details
   */
  async getMenuItem(itemId: string) {
    try {
      const response = await fetch(
        `${SERVIO_BASE_URL}/api/menu/items/${itemId}`,
        {
          headers: {
            'Authorization': `Bearer ${SERVIO_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return {
        ok: true,
        item: data
      };
    } catch (error) {
      console.error('[Servio] getMenuItem error:', error);
      return {
        ok: false,
        error: 'Failed to get menu item'
      };
    }
  },

  /**
   * Get item modifiers (sizes, sides, gravy options)
   */
  async getItemModifiers(itemId: string) {
    try {
      const response = await fetch(
        `${SERVIO_BASE_URL}/api/menu/items/${itemId}/modifiers`,
        {
          headers: {
            'Authorization': `Bearer ${SERVIO_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return {
        ok: true,
        modifiers: data.modifiers || data,
        hasModifiers: (data.modifiers || data).length > 0
      };
    } catch (error) {
      console.error('[Servio] getItemModifiers error:', error);
      return {
        ok: false,
        error: 'Failed to get modifiers',
        modifiers: []
      };
    }
  },

  /**
   * Lookup customer by phone number
   */
  async lookupCustomer(phone: string) {
    try {
      const response = await fetch(
        `${SERVIO_BASE_URL}/api/customers/lookup?phone=${encodeURIComponent(phone)}`,
        {
          headers: {
            'Authorization': `Bearer ${SERVIO_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return {
        ok: true,
        found: data.found || false,
        customer: data.customer || data
      };
    } catch (error) {
      console.error('[Servio] lookupCustomer error:', error);
      return {
        ok: false,
        found: false,
        error: 'Failed to lookup customer'
      };
    }
  },

  /**
   * Quote order (calculate totals without creating)
   */
  async quoteOrder(orderData: any) {
    try {
      const response = await fetch(
        `${SERVIO_BASE_URL}/api/orders/quote`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVIO_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...orderData,
            restaurantId: RESTAURANT_ID
          })
        }
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return {
        ok: true,
        valid: data.valid || true,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        items: data.items
      };
    } catch (error) {
      console.error('[Servio] quoteOrder error:', error);
      return {
        ok: false,
        valid: false,
        error: 'Failed to quote order'
      };
    }
  },

  /**
   * Create order in Servio
   */
  async createOrder(orderData: any) {
    try {
      const response = await fetch(
        `${SERVIO_BASE_URL}/api/orders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVIO_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...orderData,
            restaurantId: RESTAURANT_ID,
            source: 'vapi_phone',
            status: 'received'
          })
        }
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return {
        ok: true,
        orderId: data.id || data.orderId,
        total: data.total,
        status: data.status || 'received',
        message: `Order placed successfully. Your order number is ${(data.id || data.orderId).slice(-4)}.`
      };
    } catch (error) {
      console.error('[Servio] createOrder error:', error);
      return {
        ok: false,
        error: 'Failed to create order'
      };
    }
  },

  /**
   * Check order status
   */
  async checkOrderStatus(orderId: string) {
    try {
      const response = await fetch(
        `${SERVIO_BASE_URL}/api/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${SERVIO_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return {
        ok: true,
        status: data.status,
        order: data
      };
    } catch (error) {
      console.error('[Servio] checkOrderStatus error:', error);
      return {
        ok: false,
        error: 'Failed to check order status'
      };
    }
  },

  /**
   * Get restaurant hours/status
   */
  async getStoreStatus() {
    try {
      const response = await fetch(
        `${SERVIO_BASE_URL}/api/restaurants/${RESTAURANT_ID}/status`,
        {
          headers: {
            'Authorization': `Bearer ${SERVIO_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return {
        ok: true,
        status: data.status || data.open ? 'open' : 'closed',
        hours: data.hours,
        message: data.message
      };
    } catch (error) {
      console.error('[Servio] getStoreStatus error:', error);
      return {
        ok: false,
        error: 'Failed to get store status'
      };
    }
  }
};

// Vapi webhook handler
export async function handleVapiWebhook(payload: any) {
  const { message } = payload;
  
  switch (message.type) {
    case 'assistant-request':
      return handleAssistantRequest(message);
    
    case 'function-call':
    case 'tool-calls':
      return handleToolCalls(message);
    
    case 'end-of-call-report':
      return handleEndOfCall(message);
    
    default:
      return { result: 'acknowledged' };
  }
}

async function handleAssistantRequest(message: any) {
  // Initial greeting
  const customerPhone = message.call?.customer?.number;
  
  // Try to lookup customer
  let greeting = "Thank you for calling Sashey's Kitchen! This is Servio, your AI assistant. How can I help you today?";
  
  if (customerPhone) {
    const customer = await servioTools.lookupCustomer(customerPhone);
    if (customer.found && customer.customer?.name) {
      greeting = `Hi ${customer.customer.name}! Welcome back to Sashey's Kitchen. This is Servio. How can I help you today?`;
    }
  }
  
  return { result: greeting };
}

async function handleToolCalls(message: any) {
  const toolCalls = message.toolCalls || message.functionCall ? [message.functionCall] : [];
  const results = [];
  
  for (const tool of toolCalls) {
    const { name, parameters } = tool;
    let result;
    
    switch (name) {
      case 'searchMenu':
        result = await servioTools.searchMenu(parameters.query || parameters.q);
        break;
      case 'getMenuItem':
        result = await servioTools.getMenuItem(parameters.itemId || parameters.id);
        break;
      case 'getItemModifiers':
        result = await servioTools.getItemModifiers(parameters.itemId);
        break;
      case 'lookupCustomer':
        result = await servioTools.lookupCustomer(parameters.phone);
        break;
      case 'quoteOrder':
        result = await servioTools.quoteOrder(parameters);
        break;
      case 'createOrder':
        result = await servioTools.createOrder(parameters);
        break;
      case 'checkOrderStatus':
        result = await servioTools.checkOrderStatus(parameters.orderId);
        break;
      case 'getStoreStatus':
        result = await servioTools.getStoreStatus();
        break;
      default:
        result = { ok: false, error: `Unknown tool: ${name}` };
    }
    
    results.push({
      name,
      result: JSON.stringify(result)
    });
  }
  
  return { results };
}

async function handleEndOfCall(message: any) {
  // Log call for analytics
  console.log('[Servio] Call ended:', {
    callId: message.call?.id,
    duration: message.call?.duration,
    reason: message.endedReason
  });
  
  return { result: 'logged' };
}
