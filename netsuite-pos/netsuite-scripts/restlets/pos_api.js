/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 *
 * POS API RESTlet
 * Main API endpoint for POS system integration
 */

define(['N/search', 'N/record', 'N/query', 'N/runtime', 'N/error'],
  (search, record, query, runtime, error) => {

  /**
   * Handle GET requests
   * @param {Object} context - Request context containing action and parameters
   */
  const get = (context) => {
    const action = context.action;

    try {
      switch(action) {
        case 'getItems':
          return getItems(context);
        case 'getCustomers':
          return getCustomers(context);
        case 'getInventory':
          return getInventory(context);
        case 'getLocations':
          return getLocations();
        case 'getPriceLevels':
          return getPriceLevels(context);
        case 'testConnection':
          return { success: true, message: 'Connected to NetSuite' };
        default:
          return { success: false, error: 'Unknown action: ' + action };
      }
    } catch (e) {
      log.error('GET Error', e);
      return { success: false, error: e.message };
    }
  };

  /**
   * Handle POST requests
   * @param {Object} context - Request context containing action and data
   */
  const post = (context) => {
    const action = context.action;

    try {
      switch(action) {
        case 'createCashSale':
          return createCashSale(context.data);
        case 'createSalesOrder':
          return createSalesOrder(context.data);
        case 'createCustomer':
          return createCustomer(context.data);
        case 'createCustomerPayment':
          return createCustomerPayment(context.data);
        case 'adjustInventory':
          return adjustInventory(context.data);
        default:
          return { success: false, error: 'Unknown action: ' + action };
      }
    } catch (e) {
      log.error('POST Error', e);
      return { success: false, error: e.message };
    }
  };

  // ============== GET Functions ==============

  /**
   * Get all active inventory items
   */
  const getItems = (context) => {
    const lastModified = context.lastModified;
    const pageSize = context.pageSize || 1000;

    const filters = [
      ['isinactive', 'is', 'F'],
      'AND',
      ['type', 'anyof', 'InvtPart', 'NonInvtPart', 'Kit', 'Assembly']
    ];

    if (lastModified) {
      filters.push('AND');
      filters.push(['lastmodifieddate', 'onorafter', lastModified]);
    }

    const itemSearch = search.create({
      type: search.Type.ITEM,
      filters: filters,
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'itemid' }),
        search.createColumn({ name: 'displayname' }),
        search.createColumn({ name: 'description' }),
        search.createColumn({ name: 'upccode' }),
        search.createColumn({ name: 'salesprice' }),
        search.createColumn({ name: 'cost' }),
        search.createColumn({ name: 'taxschedule' }),
        search.createColumn({ name: 'isinactive' }),
        search.createColumn({ name: 'custitem_pos_category' }), // Custom field
        search.createColumn({ name: 'stockunit' }),
        search.createColumn({ name: 'lastmodifieddate' })
      ]
    });

    const items = [];
    let count = 0;

    itemSearch.run().each((result) => {
      items.push({
        internalId: result.getValue('internalid'),
        itemId: result.getValue('itemid'),
        displayName: result.getValue('displayname') || result.getValue('itemid'),
        description: result.getValue('description'),
        upcCode: result.getValue('upccode'),
        salesPrice: parseFloat(result.getValue('salesprice')) || 0,
        cost: parseFloat(result.getValue('cost')) || 0,
        taxSchedule: result.getValue('taxschedule'),
        isInactive: result.getValue('isinactive') === 'T',
        category: result.getValue('custitem_pos_category'),
        stockUnit: result.getValue('stockunit'),
        lastModified: result.getValue('lastmodifieddate')
      });

      count++;
      return count < pageSize;
    });

    return {
      success: true,
      items: items,
      count: items.length
    };
  };

  /**
   * Get all customers
   */
  const getCustomers = (context) => {
    const lastModified = context.lastModified;
    const pageSize = context.pageSize || 1000;

    const filters = [['isinactive', 'is', 'F']];

    if (lastModified) {
      filters.push('AND');
      filters.push(['lastmodifieddate', 'onorafter', lastModified]);
    }

    const customerSearch = search.create({
      type: search.Type.CUSTOMER,
      filters: filters,
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'entityid' }),
        search.createColumn({ name: 'firstname' }),
        search.createColumn({ name: 'lastname' }),
        search.createColumn({ name: 'email' }),
        search.createColumn({ name: 'phone' }),
        search.createColumn({ name: 'companyname' }),
        search.createColumn({ name: 'pricelevel' }),
        search.createColumn({ name: 'creditlimit' }),
        search.createColumn({ name: 'balance' }),
        search.createColumn({ name: 'custentity_loyalty_points' }) // Custom field
      ]
    });

    const customers = [];
    let count = 0;

    customerSearch.run().each((result) => {
      customers.push({
        internalId: result.getValue('internalid'),
        entityId: result.getValue('entityid'),
        firstName: result.getValue('firstname') || '',
        lastName: result.getValue('lastname') || '',
        email: result.getValue('email'),
        phone: result.getValue('phone'),
        companyName: result.getValue('companyname'),
        priceLevel: result.getValue('pricelevel'),
        creditLimit: parseFloat(result.getValue('creditlimit')) || 0,
        balance: parseFloat(result.getValue('balance')) || 0,
        loyaltyPoints: parseInt(result.getValue('custentity_loyalty_points')) || 0
      });

      count++;
      return count < pageSize;
    });

    return {
      success: true,
      customers: customers,
      count: customers.length
    };
  };

  /**
   * Get inventory levels for a location
   */
  const getInventory = (context) => {
    const locationId = context.locationId;

    const filters = [
      ['isinactive', 'is', 'F'],
      'AND',
      ['type', 'anyof', 'InvtPart', 'Assembly']
    ];

    if (locationId) {
      filters.push('AND');
      filters.push(['inventorylocation', 'anyof', locationId]);
    }

    const invSearch = search.create({
      type: search.Type.ITEM,
      filters: filters,
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'inventorylocation' }),
        search.createColumn({ name: 'locationquantityonhand' }),
        search.createColumn({ name: 'locationquantityavailable' }),
        search.createColumn({ name: 'locationquantitycommitted' })
      ]
    });

    const inventory = [];

    invSearch.run().each((result) => {
      inventory.push({
        itemId: result.getValue('internalid'),
        locationId: result.getValue('inventorylocation'),
        quantityOnHand: parseFloat(result.getValue('locationquantityonhand')) || 0,
        quantityAvailable: parseFloat(result.getValue('locationquantityavailable')) || 0,
        quantityCommitted: parseFloat(result.getValue('locationquantitycommitted')) || 0
      });

      return true;
    });

    return {
      success: true,
      inventory: inventory,
      count: inventory.length
    };
  };

  /**
   * Get all locations
   */
  const getLocations = () => {
    const locationSearch = search.create({
      type: search.Type.LOCATION,
      filters: [['isinactive', 'is', 'F']],
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'name' }),
        search.createColumn({ name: 'subsidiary' }),
        search.createColumn({ name: 'address' })
      ]
    });

    const locations = [];

    locationSearch.run().each((result) => {
      locations.push({
        internalId: result.getValue('internalid'),
        name: result.getValue('name'),
        subsidiary: result.getText('subsidiary'),
        address: result.getValue('address')
      });

      return true;
    });

    return {
      success: true,
      locations: locations
    };
  };

  /**
   * Get price levels for an item
   */
  const getPriceLevels = (context) => {
    const itemId = context.itemId;

    if (!itemId) {
      return { success: false, error: 'Item ID required' };
    }

    const itemRecord = record.load({
      type: record.Type.INVENTORY_ITEM,
      id: itemId
    });

    const priceLevels = [];
    const lineCount = itemRecord.getLineCount({ sublistId: 'price1' });

    for (let i = 0; i < lineCount; i++) {
      priceLevels.push({
        priceLevel: itemRecord.getSublistText({ sublistId: 'price1', fieldId: 'pricelevel', line: i }),
        price: itemRecord.getSublistValue({ sublistId: 'price1', fieldId: 'price_1_', line: i })
      });
    }

    return {
      success: true,
      priceLevels: priceLevels
    };
  };

  // ============== POST Functions ==============

  /**
   * Create a Cash Sale transaction
   */
  const createCashSale = (data) => {
    const cashSale = record.create({
      type: record.Type.CASH_SALE,
      isDynamic: true
    });

    // Set header fields
    if (data.entity) {
      cashSale.setValue({ fieldId: 'entity', value: data.entity });
    }

    cashSale.setValue({ fieldId: 'location', value: data.location });
    cashSale.setValue({ fieldId: 'trandate', value: new Date() });

    if (data.memo) {
      cashSale.setValue({ fieldId: 'memo', value: data.memo });
    }

    // Add line items
    data.items.forEach((item) => {
      cashSale.selectNewLine({ sublistId: 'item' });
      cashSale.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item.item });
      cashSale.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.quantity });

      if (item.rate) {
        cashSale.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: item.rate });
      }

      if (item.description) {
        cashSale.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: item.description });
      }

      cashSale.commitLine({ sublistId: 'item' });
    });

    // Set payment method (optional - depends on your setup)
    if (data.paymentMethod) {
      cashSale.setValue({ fieldId: 'paymentmethod', value: data.paymentMethod });
    }

    const cashSaleId = cashSale.save();

    // Get the transaction number
    const savedRecord = record.load({
      type: record.Type.CASH_SALE,
      id: cashSaleId
    });

    return {
      success: true,
      internalId: cashSaleId,
      tranId: savedRecord.getValue('tranid')
    };
  };

  /**
   * Create a Sales Order
   */
  const createSalesOrder = (data) => {
    const salesOrder = record.create({
      type: record.Type.SALES_ORDER,
      isDynamic: true
    });

    salesOrder.setValue({ fieldId: 'entity', value: data.entity });
    salesOrder.setValue({ fieldId: 'location', value: data.location });
    salesOrder.setValue({ fieldId: 'trandate', value: new Date() });

    if (data.memo) {
      salesOrder.setValue({ fieldId: 'memo', value: data.memo });
    }

    // Add line items
    data.items.forEach((item) => {
      salesOrder.selectNewLine({ sublistId: 'item' });
      salesOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item.item });
      salesOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.quantity });

      if (item.rate) {
        salesOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: item.rate });
      }

      salesOrder.commitLine({ sublistId: 'item' });
    });

    const salesOrderId = salesOrder.save();

    const savedRecord = record.load({
      type: record.Type.SALES_ORDER,
      id: salesOrderId
    });

    return {
      success: true,
      internalId: salesOrderId,
      tranId: savedRecord.getValue('tranid')
    };
  };

  /**
   * Create a new customer
   */
  const createCustomer = (data) => {
    const customer = record.create({
      type: record.Type.CUSTOMER,
      isDynamic: true
    });

    customer.setValue({ fieldId: 'firstname', value: data.firstName });
    customer.setValue({ fieldId: 'lastname', value: data.lastName });

    if (data.email) {
      customer.setValue({ fieldId: 'email', value: data.email });
    }

    if (data.phone) {
      customer.setValue({ fieldId: 'phone', value: data.phone });
    }

    if (data.company) {
      customer.setValue({ fieldId: 'companyname', value: data.company });
    }

    const customerId = customer.save();

    return {
      success: true,
      internalId: customerId
    };
  };

  /**
   * Create a customer payment
   */
  const createCustomerPayment = (data) => {
    const payment = record.create({
      type: record.Type.CUSTOMER_PAYMENT,
      isDynamic: true
    });

    payment.setValue({ fieldId: 'customer', value: data.customerId });
    payment.setValue({ fieldId: 'payment', value: data.amount });

    if (data.paymentMethod) {
      payment.setValue({ fieldId: 'paymentmethod', value: data.paymentMethod });
    }

    // Apply to invoices if specified
    if (data.invoices) {
      data.invoices.forEach((invoice) => {
        const lineCount = payment.getLineCount({ sublistId: 'apply' });
        for (let i = 0; i < lineCount; i++) {
          const internalId = payment.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
          if (internalId == invoice.internalId) {
            payment.setSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i, value: true });
            payment.setSublistValue({ sublistId: 'apply', fieldId: 'amount', line: i, value: invoice.amount });
            break;
          }
        }
      });
    }

    const paymentId = payment.save();

    return {
      success: true,
      internalId: paymentId
    };
  };

  /**
   * Adjust inventory
   */
  const adjustInventory = (data) => {
    const adjustment = record.create({
      type: record.Type.INVENTORY_ADJUSTMENT,
      isDynamic: true
    });

    adjustment.setValue({ fieldId: 'account', value: data.adjustmentAccount });
    adjustment.setValue({ fieldId: 'adjlocation', value: data.location });

    if (data.memo) {
      adjustment.setValue({ fieldId: 'memo', value: data.memo });
    }

    // Add inventory items
    data.items.forEach((item) => {
      adjustment.selectNewLine({ sublistId: 'inventory' });
      adjustment.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'item', value: item.itemId });
      adjustment.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'location', value: item.location || data.location });
      adjustment.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: item.adjustQty });
      adjustment.commitLine({ sublistId: 'inventory' });
    });

    const adjustmentId = adjustment.save();

    return {
      success: true,
      internalId: adjustmentId
    };
  };

  return { get, post };
});
