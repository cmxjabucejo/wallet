import { View } from 'react-native';
import { Tabs, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { HeaderButton, useAppTheme } from '../../lib/ui';

export default function TabLayout() {
  const { colors } = useAppTheme();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Wallets',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <HeaderButton title="Settings" icon="settings-outline" onPress={() => router.push('/settings')} />
              <HeaderButton title="New wallet" icon="add" onPress={() => router.push('/new-wallet')} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
          headerRight: () => <HeaderButton title="New expense" icon="add" onPress={() => router.push('/expense')} />,
        }}
      />
    </Tabs>
  );
}
