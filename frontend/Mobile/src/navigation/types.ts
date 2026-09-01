import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Order, Product } from '../types';

export type MainTabParamList = {
  ProductsTab: undefined;
  AITab: { initialQuery?: string } | undefined;
  OrdersTab: undefined;
  // Aliases for compatibility
  ChatTab?: { initialQuery?: string } | undefined;
  ExploreTab?: undefined;
};

export type MainTabsParamList = MainTabParamList;

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Chat: { initialQuery?: string } | undefined;
  ProductDetails: { productId: string };
  PurchaseConfirmation: { product: Product; quantity?: number };
  Payment: {
    orderId: string;
    product?: Product | null;
    paymentUrl?: string | null;
  };
  PaymentPending: {
    orderId: string;
    product?: Product | null;
  };
  PaymentSuccess: {
    orderId: string;
    product?: Product | null;
    paymentId?: string | null;
  };
  PaymentFailed: {
    orderId: string;
    product?: Product | null;
    reason?: string | null;
  };
  OrderDetails: { orderId: string };
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type TabsNavigationProp = BottomTabNavigationProp<MainTabParamList>;
