import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PrinterConfig, CardTerminalConfig, HardwareStatus } from '../types';

interface HardwareState {
  printerConfig: PrinterConfig | null;
  cardTerminalConfig: CardTerminalConfig | null;
  status: HardwareStatus;
  printerDevice: USBDevice | null;
  scaleWeight: number | null;
  lastBarcode: string | null;
}

interface HardwareActions {
  connectPrinter: () => Promise<void>;
  disconnectPrinter: () => void;
  printReceipt: (content: string) => Promise<void>;
  openCashDrawer: () => Promise<void>;
  connectCardTerminal: () => Promise<void>;
  disconnectCardTerminal: () => void;
  processCardPayment: (amount: number) => Promise<{ success: boolean; reference?: string; error?: string }>;
  connectScale: () => Promise<void>;
  getWeight: () => Promise<number>;
  setBarcode: (barcode: string) => void;
  clearBarcode: () => void;
  setPrinterConfig: (config: PrinterConfig) => void;
  setCardTerminalConfig: (config: CardTerminalConfig) => void;
}

export const useHardwareStore = create<HardwareState & HardwareActions>()(
  persist(
    (set, get) => ({
      printerConfig: null,
      cardTerminalConfig: null,
      status: {
        printer: 'disconnected',
        scanner: 'disconnected',
        cashDrawer: 'disconnected',
        cardTerminal: 'disconnected',
        scale: 'disconnected',
      },
      printerDevice: null,
      scaleWeight: null,
      lastBarcode: null,

      connectPrinter: async () => {
        try {
          if (!navigator.usb) {
            throw new Error('WebUSB not supported');
          }

          const device = await navigator.usb.requestDevice({
            filters: [
              { vendorId: 0x04b8 }, // Epson
              { vendorId: 0x0519 }, // Star Micronics
            ],
          });

          await device.open();
          await device.selectConfiguration(1);
          await device.claimInterface(0);

          set({
            printerDevice: device,
            status: { ...get().status, printer: 'connected', cashDrawer: 'connected' },
          });
        } catch (error) {
          set({
            status: { ...get().status, printer: 'error' },
          });
          throw error;
        }
      },

      disconnectPrinter: () => {
        const { printerDevice } = get();
        if (printerDevice) {
          printerDevice.close();
        }
        set({
          printerDevice: null,
          status: { ...get().status, printer: 'disconnected', cashDrawer: 'disconnected' },
        });
      },

      printReceipt: async (content: string) => {
        const { printerDevice, printerConfig } = get();

        if (!printerDevice || !printerConfig) {
          throw new Error('Printer not connected');
        }

        // Convert content to ESC/POS commands
        const encoder = new TextEncoder();
        const commands = [
          new Uint8Array([0x1b, 0x40]), // Initialize
          new Uint8Array([0x1b, 0x61, 0x01]), // Center align
          encoder.encode(content),
          new Uint8Array([0x1b, 0x64, 0x03]), // Feed 3 lines
          new Uint8Array([0x1d, 0x56, 0x00]), // Cut paper
        ];

        for (const command of commands) {
          await printerDevice.transferOut(1, command);
        }
      },

      openCashDrawer: async () => {
        const { printerDevice } = get();

        if (!printerDevice) {
          throw new Error('Printer not connected (cash drawer triggered via printer)');
        }

        // ESC/POS command to open cash drawer
        const kickDrawer = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
        await printerDevice.transferOut(1, kickDrawer);
      },

      connectCardTerminal: async () => {
        const { cardTerminalConfig } = get();

        if (!cardTerminalConfig) {
          throw new Error('Card terminal not configured');
        }

        // Implementation depends on provider (Stripe Terminal, Square, etc.)
        // This is a placeholder for the actual integration
        set({
          status: { ...get().status, cardTerminal: 'connected' },
        });
      },

      disconnectCardTerminal: () => {
        set({
          status: { ...get().status, cardTerminal: 'disconnected' },
        });
      },

      processCardPayment: async (_amount: number) => {
        const { cardTerminalConfig, status } = get();

        if (!cardTerminalConfig || status.cardTerminal !== 'connected') {
          return { success: false, error: 'Card terminal not connected' };
        }

        // This would integrate with Stripe Terminal, Square, etc.
        // Placeholder implementation
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              reference: `TXN${Date.now()}`,
            });
          }, 2000);
        });
      },

      connectScale: async () => {
        try {
          if (!navigator.serial) {
            throw new Error('Web Serial API not supported');
          }

          const port = await navigator.serial.requestPort();
          await port.open({ baudRate: 9600 });

          set({
            status: { ...get().status, scale: 'connected' },
          });

          // Start reading weight data
          const reader = port.readable?.getReader();
          if (reader) {
            const readWeight = async () => {
              try {
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;

                  // Parse weight data (format depends on scale model)
                  const text = new TextDecoder().decode(value);
                  const weight = parseFloat(text.replace(/[^0-9.]/g, ''));
                  if (!isNaN(weight)) {
                    set({ scaleWeight: weight });
                  }
                }
              } catch {
                set({
                  status: { ...get().status, scale: 'disconnected' },
                });
              }
            };
            readWeight();
          }
        } catch {
          set({
            status: { ...get().status, scale: 'disconnected' },
          });
        }
      },

      getWeight: async () => {
        const { scaleWeight, status } = get();

        if (status.scale !== 'connected') {
          throw new Error('Scale not connected');
        }

        return scaleWeight || 0;
      },

      setBarcode: (barcode: string) => {
        set({ lastBarcode: barcode });
      },

      clearBarcode: () => {
        set({ lastBarcode: null });
      },

      setPrinterConfig: (config: PrinterConfig) => {
        set({ printerConfig: config });
      },

      setCardTerminalConfig: (config: CardTerminalConfig) => {
        set({ cardTerminalConfig: config });
      },
    }),
    {
      name: 'pos-hardware',
      partialize: (state) => ({
        printerConfig: state.printerConfig,
        cardTerminalConfig: state.cardTerminalConfig,
      }),
    }
  )
);

// Set up barcode scanner listener
if (typeof window !== 'undefined') {
  let barcodeBuffer = '';
  let lastKeyTime = 0;

  window.addEventListener('keydown', (event) => {
    const currentTime = Date.now();

    // Barcode scanners typically send characters very quickly
    if (currentTime - lastKeyTime > 100) {
      barcodeBuffer = '';
    }

    lastKeyTime = currentTime;

    if (event.key === 'Enter' && barcodeBuffer.length > 3) {
      useHardwareStore.getState().setBarcode(barcodeBuffer);
      barcodeBuffer = '';
      event.preventDefault();
    } else if (event.key.length === 1) {
      barcodeBuffer += event.key;
    }
  });
}
