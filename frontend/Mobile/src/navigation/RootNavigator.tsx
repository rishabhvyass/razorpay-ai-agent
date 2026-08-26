import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatScreen } from '../screens/Chat/ChatScreen';
import { ProductDetailsScreen } from '../screens/Product/ProductDetailsScreen';
import { PurchaseConfirmationScreen } from '../screens/Checkout/PurchaseConfirmationScreen';
import { PaymentScreen } from '../screens/Checkout/PaymentScreen';
import { PaymentPendingScreen } from '../screens/Checkout/PaymentPendingScreen';
import { PaymentSuccessScreen } from '../screens/Checkout/PaymentSuccessScreen';
import { PaymentFailedScreen } from '../screens/Checkout/PaymentFailedScreen';
import { OrderDetailsScreen } from '../screens/Orders/OrderDetailsScreen';
import { MainTabs } from './MainTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <Stack.Screen
        name="PurchaseConfirmation"
        component={PurchaseConfirmationScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen
        name="PaymentPending"
        component={PaymentPendingScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="PaymentSuccess"
        component={PaymentSuccessScreen}
        options={{ gestureEnabled: false, animation: 'fade' }}
      />
      <Stack.Screen
        name="PaymentFailed"
        component={PaymentFailedScreen}
        options={{ gestureEnabled: false, animation: 'fade' }}
      />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
    </Stack.Navigator>
  );
}
