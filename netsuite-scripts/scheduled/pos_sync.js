/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 *
 * POS Sync Scheduled Script
 * Runs periodically to sync data between NetSuite and POS system
 */

define(['N/search', 'N/record', 'N/https', 'N/runtime', 'N/log', 'N/file'],
  (search, record, https, runtime, log, file) => {

  /**
   * Main execution function
   * @param {Object} context
   */
  const execute = (context) => {
    log.audit('POS Sync Started', new Date().toISOString());

    try {
      // Process pending inventory notifications
      processInventoryNotifications();

      // Sync recently modified items to POS
      syncModifiedItems();

      // Sync recently modified customers to POS
      syncModifiedCustomers();

      // Process any failed sync items from queue
      processFailedSyncQueue();

      log.audit('POS Sync Completed', new Date().toISOString());

    } catch (e) {
      log.error({
        title: 'POS Sync Error',
        details: e.message + '\n' + e.stack
      });
    }
  };

  /**
   * Process pending inventory notifications
   */
  const processInventoryNotifications = () => {
    const notifications = search.create({
      type: 'customrecord_pos_inventory_notification',
      filters: [
        ['custrecord_pin_processed', 'is', 'F']
      ],
      columns: [
        'internalid',
        'custrecord_pin_transaction',
        'custrecord_pin_items'
      ]
    });

    let processed = 0;

    notifications.run().each((result) => {
      try {
        const items = JSON.parse(result.getValue('custrecord_pin_items') || '[]');

        // Send to POS webhook
        sendInventoryUpdate(items);

        // Mark as processed
        record.submitFields({
          type: 'customrecord_pos_inventory_notification',
          id: result.id,
          values: {
            custrecord_pin_processed: true
          }
        });

        processed++;

      } catch (e) {
        log.error({
          title: 'Notification Processing Error',
          details: 'ID: ' + result.id + ' - ' + e.message
        });
      }

      return processed < 100; // Process up to 100 per run
    });

    log.audit('Inventory Notifications Processed', processed);
  };

  /**
   * Sync recently modified items to POS system
   */
  const syncModifiedItems = () => {
    // Get last sync time from script parameter or default to 1 hour ago
    const lastSyncTime = getLastSyncTime('items') || new Date(Date.now() - 3600000);

    const modifiedItems = search.create({
      type: search.Type.ITEM,
      filters: [
        ['lastmodifieddate', 'onorafter', lastSyncTime],
        'AND',
        ['isinactive', 'is', 'F'],
        'AND',
        ['type', 'anyof', 'InvtPart', 'NonInvtPart', 'Kit', 'Assembly']
      ],
      columns: [
        'internalid',
        'itemid',
        'displayname',
        'salesprice',
        'upccode',
        'isinactive'
      ]
    });

    const items = [];

    modifiedItems.run().each((result) => {
      items.push({
        internalId: result.getValue('internalid'),
        itemId: result.getValue('itemid'),
        displayName: result.getValue('displayname'),
        salesPrice: result.getValue('salesprice'),
        barcode: result.getValue('upccode'),
        isInactive: result.getValue('isinactive') === 'T'
      });

      return items.length < 500;
    });

    if (items.length > 0) {
      sendItemsUpdate(items);
      log.audit('Items Synced', items.length);
    }

    setLastSyncTime('items', new Date());
  };

  /**
   * Sync recently modified customers to POS system
   */
  const syncModifiedCustomers = () => {
    const lastSyncTime = getLastSyncTime('customers') || new Date(Date.now() - 3600000);

    const modifiedCustomers = search.create({
      type: search.Type.CUSTOMER,
      filters: [
        ['lastmodifieddate', 'onorafter', lastSyncTime],
        'AND',
        ['isinactive', 'is', 'F']
      ],
      columns: [
        'internalid',
        'entityid',
        'firstname',
        'lastname',
        'email',
        'phone',
        'balance'
      ]
    });

    const customers = [];

    modifiedCustomers.run().each((result) => {
      customers.push({
        internalId: result.getValue('internalid'),
        entityId: result.getValue('entityid'),
        firstName: result.getValue('firstname'),
        lastName: result.getValue('lastname'),
        email: result.getValue('email'),
        phone: result.getValue('phone'),
        balance: result.getValue('balance')
      });

      return customers.length < 500;
    });

    if (customers.length > 0) {
      sendCustomersUpdate(customers);
      log.audit('Customers Synced', customers.length);
    }

    setLastSyncTime('customers', new Date());
  };

  /**
   * Process failed sync items from queue
   */
  const processFailedSyncQueue = () => {
    const queue = search.create({
      type: 'customrecord_pos_sync_queue',
      filters: [
        ['custrecord_psq_status', 'is', 'failed'],
        'AND',
        ['custrecord_psq_attempts', 'lessthan', 5]
      ],
      columns: [
        'internalid',
        'custrecord_psq_type',
        'custrecord_psq_data',
        'custrecord_psq_attempts'
      ]
    });

    let reprocessed = 0;

    queue.run().each((result) => {
      try {
        const type = result.getValue('custrecord_psq_type');
        const data = JSON.parse(result.getValue('custrecord_psq_data') || '{}');

        // Attempt to resync
        let success = false;

        switch(type) {
          case 'item':
            success = sendItemsUpdate([data]);
            break;
          case 'customer':
            success = sendCustomersUpdate([data]);
            break;
          case 'inventory':
            success = sendInventoryUpdate([data]);
            break;
        }

        if (success) {
          // Mark as completed
          record.submitFields({
            type: 'customrecord_pos_sync_queue',
            id: result.id,
            values: {
              custrecord_psq_status: 'completed'
            }
          });
        } else {
          // Increment attempts
          record.submitFields({
            type: 'customrecord_pos_sync_queue',
            id: result.id,
            values: {
              custrecord_psq_attempts: parseInt(result.getValue('custrecord_psq_attempts')) + 1
            }
          });
        }

        reprocessed++;

      } catch (e) {
        log.error({
          title: 'Queue Processing Error',
          details: 'ID: ' + result.id + ' - ' + e.message
        });
      }

      return reprocessed < 50;
    });

    if (reprocessed > 0) {
      log.audit('Queue Items Reprocessed', reprocessed);
    }
  };

  /**
   * Send inventory update to POS webhook
   */
  const sendInventoryUpdate = (items) => {
    return sendWebhook('inventory.updated', { items: items });
  };

  /**
   * Send items update to POS webhook
   */
  const sendItemsUpdate = (items) => {
    return sendWebhook('items.updated', { items: items });
  };

  /**
   * Send customers update to POS webhook
   */
  const sendCustomersUpdate = (customers) => {
    return sendWebhook('customers.updated', { customers: customers });
  };

  /**
   * Send webhook to POS system
   */
  const sendWebhook = (event, data) => {
    const webhookUrl = runtime.getCurrentScript().getParameter({
      name: 'custscript_pos_sync_webhook_url'
    });

    if (!webhookUrl) {
      log.debug('Webhook URL not configured');
      return true; // Return true to not block processing
    }

    const payload = {
      event: event,
      timestamp: new Date().toISOString(),
      data: data
    };

    try {
      const response = https.post({
        url: webhookUrl,
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.code >= 200 && response.code < 300;

    } catch (e) {
      log.error({
        title: 'Webhook Error',
        details: event + ' - ' + e.message
      });
      return false;
    }
  };

  /**
   * Get last sync time for a type
   */
  const getLastSyncTime = (type) => {
    try {
      const settingSearch = search.create({
        type: 'customrecord_pos_sync_settings',
        filters: [
          ['name', 'is', 'last_sync_' + type]
        ],
        columns: ['custrecord_pss_value']
      });

      let result = null;
      settingSearch.run().each((r) => {
        result = new Date(r.getValue('custrecord_pss_value'));
        return false;
      });

      return result;
    } catch (e) {
      return null;
    }
  };

  /**
   * Set last sync time for a type
   */
  const setLastSyncTime = (type, date) => {
    try {
      // Find or create setting record
      const settingSearch = search.create({
        type: 'customrecord_pos_sync_settings',
        filters: [
          ['name', 'is', 'last_sync_' + type]
        ],
        columns: ['internalid']
      });

      let recordId = null;
      settingSearch.run().each((r) => {
        recordId = r.getValue('internalid');
        return false;
      });

      if (recordId) {
        record.submitFields({
          type: 'customrecord_pos_sync_settings',
          id: recordId,
          values: {
            custrecord_pss_value: date.toISOString()
          }
        });
      } else {
        const setting = record.create({
          type: 'customrecord_pos_sync_settings'
        });
        setting.setValue({ fieldId: 'name', value: 'last_sync_' + type });
        setting.setValue({ fieldId: 'custrecord_pss_value', value: date.toISOString() });
        setting.save();
      }
    } catch (e) {
      log.debug('Could not save sync time', e.message);
    }
  };

  return {
    execute: execute
  };
});
