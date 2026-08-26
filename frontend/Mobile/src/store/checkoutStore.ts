import { create } from 'zustand';
import { Order, PaymentView, Product } from '../types';

interface CheckoutState {
  selectedProduct: Product | null;
  selectedQuantity: number;
  activeOrder: Order | null;
  paymentView: PaymentView | null;
  isProcessing: boolean;

  selectProductForCheckout: (product: Product, quantity?: number) => void;
  setSelectedQuantity: (quantity: number) => void;
  setActiveOrder: (order: Order | null) => void;
  setPaymentView: (view: PaymentView | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  resetCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  selectedProduct: null,
  selectedQuantity: 1,
  activeOrder: null,
  paymentView: null,
  isProcessing: false,

  selectProductForCheckout: (product, quantity = 1) =>
    set({ selectedProduct: product, selectedQuantity: quantity }),
  setSelectedQuantity: (quantity) => set({ selectedQuantity: quantity }),
  setActiveOrder: (order) => set({ activeOrder: order }),
  setPaymentView: (view) => set({ paymentView: view }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  resetCheckout: () =>
    set({
      selectedProduct: null,
      selectedQuantity: 1,
      activeOrder: null,
      paymentView: null,
      isProcessing: false,
    }),
}));
