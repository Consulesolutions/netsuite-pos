/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 *
 * POS Transaction User Event Script
 * Handles events on Cash Sale and Sales Order records created from POS
 */

define(['N/record', 'N/search', 'N/https', 'N/runtime', 'N/log'],
  (record, search, https, runtime, log) => {

  /**
   * Executes after a Cash Sale or Sales Order is submitted
   * @param {Object} context
   */
  const afterSubmit = (context) => {
    const newRecord = context.newRecord;
    const recordType = newRecord.type;

    // Only process POS transactions (identified by custom field or memo)
    const memo = newRecord.getValue('memo') || '';
    if (!memo.includes('POS Transaction')) {
      return;
    }

    try {
      // Update inventory counts in real-time
      if (context.type === context.UserEventType.CREATE) {
        updateInventoryNotification(newRecord);
      }

      // Log the transaction for audit purposes
      logPOSTransaction(newRecord, context.type);

      // Send webhook notification to POS system (optional)
      if (runtime.envType === runtime.EnvType.PRODUCTION) {
        sendPOSWebhook(newRecord, context.type);
      }

    } catch (e) {
      log.error({
        title: 'POS Transaction Error',
        details: e.message
      });
    }
  };

  /**
   * Executes before a transaction is deleted
   * @param {Object} context
   */
  const beforeLoad = (context) => {
    // Add custom buttons or UI elements for POS transactions
    if (context.type === context.UserEventType.VIEW) {
      const form = context.form;
      const memo = context.newRecord.getValue('memo') || '';

      if (memo.includes('POS Transaction')) {
        // Add a "View in POS" button
        form.addButton({
          id: 'custpage_view_pos',
          label: 'View in POS',
          functionName: 'viewInPOS'
        });

        // Add client script for the button
        form.clientScriptModulePath = './pos_transaction_client.js';
      }
    }
  };

  /**
   * Update inventory notification for real-time sync
   * @param {Object} transactionRecord
   */
  const updateInventoryNotification = (transactionRecord) => {
    const location = transactionRecord.getValue('location');
    const lineCount = transactionRecord.getLineCount({ sublistId: 'item' });

    const updatedItems = [];

    for (let i = 0; i < lineCount; i++) {
      const itemId = transactionRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'item',
        line: i
      });

      const quantity = transactionRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        line: i
      });

      updatedItems.push({
        itemId: itemId,
        quantity: quantity,
        location: location
      });
    }

    // Store notification for POS sync
    const notification = record.create({
      type: 'customrecord_pos_inventory_notification'
    });

    notification.setValue({
      fieldId: 'custrecord_pin_transaction',
      value: transactionRecord.id
    });

    notification.setValue({
      fieldId: 'custrecord_pin_items',
      value: JSON.stringify(updatedItems)
    });

    notification.setValue({
      fieldId: 'custrecord_pin_processed',
      value: false
    });

    try {
      notification.save();
    } catch (e) {
      // Custom record may not exist, log and continue
      log.debug('Inventory notification not saved', e.message);
    }
  };

  /**
   * Log POS transaction for audit trail
   * @param {Object} transactionRecord
   * @param {string} eventType
   */
  const logPOSTransaction = (transactionRecord, eventType) => {
    log.audit({
      title: 'POS Transaction',
      details: {
        eventType: eventType,
        recordType: transactionRecord.type,
        recordId: transactionRecord.id,
        tranId: transactionRecord.getValue('tranid'),
        total: transactionRecord.getValue('total'),
        location: transactionRecord.getText('location'),
        customer: transactionRecord.getText('entity'),
        date: new Date().toISOString()
      }
    });
  };

  /**
   * Send webhook notification to POS system
   * @param {Object} transactionRecord
   * @param {string} eventType
   */
  const sendPOSWebhook = (transactionRecord, eventType) => {
    const webhookUrl = runtime.getCurrentScript().getParameter({
      name: 'custscript_pos_webhook_url'
    });

    if (!webhookUrl) {
      return;
    }

    const payload = {
      event: 'transaction.' + eventType.toLowerCase(),
      timestamp: new Date().toISOString(),
      data: {
        internalId: transactionRecord.id,
        tranId: transactionRecord.getValue('tranid'),
        type: transactionRecord.type,
        total: transactionRecord.getValue('total'),
        customer: transactionRecord.getValue('entity'),
        location: transactionRecord.getValue('location')
      }
    };

    try {
      https.post({
        url: webhookUrl,
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (e) {
      log.error({
        title: 'Webhook Error',
        details: e.message
      });
    }
  };

  return {
    afterSubmit: afterSubmit,
    beforeLoad: beforeLoad
  };
});
