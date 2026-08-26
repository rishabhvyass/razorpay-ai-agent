import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomTabBar } from '../components/navigation/CustomTabBar';
import { ChatScreen } from '../screens/Chat/ChatScreen';
import { OrdersScreen } from '../screens/Orders/OrdersScreen';
import { ExploreScreen } from '../screens/Product/ExploreScreen';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="ProductsTab"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="ProductsTab"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Products',
        }}
      />
      <Tab.Screen
        name="AITab"
        component={ChatScreen}
        options={{
          tabBarLabel: 'AI',
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{
          tabBarLabel: 'Order',
        }}
      />
    </Tab.Navigator>
  );
}
